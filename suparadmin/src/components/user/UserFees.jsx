import React, { useContext, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import FeeRow from "../fees/FeeRow";
import { AuthContext } from "../../context/auth-context";
import FeesForm from "../../pages/feesMaster/FeesForm";
import axios from "../../utils/axiosConfig";

// ⬇️ Add this import (adjust the path as per your project)
import FeeReceipt from "../../pages/feesMaster/FeeReceipt";

const UserFees = ({
  user,
  onMarkPaid,
  onFeeCreated,
  markAllPaid,
  onFeeDeleted,
}) => {
  const { showForm, selectedFee, setShowForm, setSelectedFee } =
    useContext(AuthContext);

  const [mounted, setMounted] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const fees = Array.isArray(user.fees) ? user.fees : [];
  const hasPaidFee = fees.some(
    (f) => String(f.status).toLowerCase() === "paid"
  );
  const canViewReceipt =
    hasPaidFee || (Boolean(user.feeId) && user.isFeePaid === true);

  // ⬇️ NEW: receipt modal state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!user || !user._id) return null;

  // fees lookup by assignment
  const feesByAssignment = useMemo(() => {
    const map = {};
    (user.fees || []).forEach((f) => {
      const ids = Array.isArray(f.assignmentIds)
        ? f.assignmentIds
        : f.assignmentId
        ? [f.assignmentId]
        : [];
      ids.forEach((id) => {
        map[String(id)] = f;
      });
    });
    return map;
  }, [user.fees]);

  // active/scheduled packages
  const assignmentsAll = Array.isArray(user.packages) ? user.packages : [];
  const assignments = assignmentsAll.filter((a) => a.status === "scheduled");

  const hasAnyFee =
    Boolean(user.feeId) || (Array.isArray(user.fees) && user.fees.length > 0);
  const canAddFee = assignments.length > 0 && !hasAnyFee;

  // table rows derived from packages + existing fees
  const rows = assignments.map((pkg) => {
    const aId = String(pkg?._id || "");
    const feeRec = feesByAssignment[aId] || null;

    return {
      _id: feeRec?._id,
      assignmentId: aId,
      companyId: pkg.companyId,
      placeId: pkg.placeId,
      locationId: pkg.locationId,
      packageId: {
        _id: pkg.packageId?._id || pkg.packageId,
        name: pkg.packageId?.name || pkg.packageName,
        price: pkg.packageId?.price || pkg.packagePrice,
        is_fixed_validity: pkg.packageId?.is_fixed_validity ?? !!pkg.endDate,
        validity_date: pkg.packageId?.validity_date || pkg.endDate,
      },
      amount: feeRec?.amount ?? pkg.packageId?.price ?? pkg.packagePrice ?? 0,
      status: feeRec?.status || (user.isFeePaid ? "paid" : "pending"),
      receipt: feeRec?.receipt || null,

      locationName: pkg?.locationId?.locationName || pkg.locationName || "-",
      packageName: pkg.packageId?.name || pkg.packageName || "N/A",
    };
  });

  const handleDeleteFee = async (feeId, assignmentId) => {
    if (!feeId) return;
    if (
      !window.confirm("Delete this fee record? The user will NOT be deleted.")
    )
      return;
    try {
      setBusyId(assignmentId || feeId);
      await axios.delete(`/fees/${feeId}`);
      onMarkPaid && onMarkPaid();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete fee");
    } finally {
      setBusyId(null);
    }
  };

  // 🔸 Global Add Fee
  const openGlobalAddFee = () => {
    const names = assignments.map((a) => a.packageName).filter(Boolean);
    const prices = assignments.map((a) => Number(a.packagePrice) || 0);
    const total = prices.reduce((s, n) => s + n, 0);

    setSelectedFee({
      userId: user._id,
      studentName:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A",
      assignments: assignments.map((a) => ({
        assignmentId: String(a._id || ""),
        packageId: a.packageId,
        packageName: a.packageName,
        price: a.packagePrice,
        endDate: a.endDate,
        locationId: a.locationId,
        placeId: a.placeId,
        companyId: a.companyId,
      })),
      amount: total,
      ui: {
        packageNames: names.join(" + "),
        amountExpr: prices.map((p) => `₹${p}`).join(" + "),
      },
    });
    setShowForm(true);
  };

  const shouldOpen = mounted && showForm && selectedFee?.userId === user._id;

  const canMarkAllPaid =
    Boolean(user.feeId) && !Boolean(user.isFeePaid) && assignments.length > 0;

  const onClickMarkAllPaid = async () => {
    try {
      setMarkingAll(true);
      await markAllPaid(user);
    } finally {
      setMarkingAll(false);
    }
  };

  const onClickDeleteFee = async () => {
    const feeIdToDelete = user?.feeId;
    if (!feeIdToDelete) {
      await axios.patch(`/fees/${user.feeId}`, { status: "pending" });
      alert("No fee found to delete.");
      return;
    }
    if (
      !window.confirm(
        "Delete this fee record? Packages will remain; status will become pending."
      )
    )
      return;
    try {
      setDeleting(true);
      await axios.delete(`/fees/${feeIdToDelete}`);
      // 🔔 Ask parent to update the local userDoc immutably
      onFeeDeleted && onFeeDeleted({ feeId: feeIdToDelete });
      // Optional: also notify any upstream listener
      onMarkPaid && onMarkPaid();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete fee");
    } finally {
      setDeleting(false);
    }
  };

  // ⬇️ NEW: prepare receipt props from user/packages/fees
  const buildReceiptData = (srcFee = null) => {
    const num = (v) => Number(v ?? 0);
    const toId = (v) =>
      v && typeof v === "object" && v.$oid ? v.$oid : String(v ?? "");
    const toDateStr = (v) =>
      v && typeof v === "object" && v.$date ? v.$date : v;

    const feesArr = Array.isArray(user.fees) ? user.fees : [];

    // latest PAID → latest ANY → srcFee
    const byDateDesc = (a, b) =>
      new Date(b.paymentDate || b.createdAt || 0) -
      new Date(a.paymentDate || a.createdAt || 0);
    const lastPaid =
      feesArr
        .filter((f) => String(f.status).toLowerCase() === "paid")
        .sort(byDateDesc)[0] || null;
    const lastAny = feesArr.slice().sort(byDateDesc)[0] || null;
    const fee = srcFee || lastPaid || lastAny;
    if (!fee) return null;

    // 👉 baseBeforeGST ko ab yahan compute karo (fee available hai)
    const baseBeforeGST =
      num(fee.netAmount) ||
      num(fee.totalAmount) - num(fee.sgstAmount) - num(fee.cgstAmount) ||
      0;

    // assignment selection
    const aidList = Array.isArray(fee.assignmentIds)
      ? fee.assignmentIds.map(toId)
      : fee.assignmentId
      ? [toId(fee.assignmentId)]
      : [];

    const pkgsById = new Map(
      (user.packages || []).map((p) => [String(p._id), p])
    );
    const sel = aidList.map((id) => pkgsById.get(String(id))).filter(Boolean);

    const pkgNames =
      sel
        .map((p) => p?.packageId?.name || p?.packageName)
        .filter(Boolean)
        .join(" + ") || "Canteen Package";

    const minDate = (a, b) => (new Date(a) < new Date(b) ? a : b);
    const maxDate = (a, b) => (new Date(a) > new Date(b) ? a : b);
    const startDate = sel.length
      ? sel
          .map((p) => toDateStr(p.startDate))
          .filter(Boolean)
          .reduce(minDate)
      : toDateStr(fee.startDate) || new Date().toISOString();
    const endDate = sel.length
      ? sel
          .map((p) => toDateStr(p.endDate))
          .filter(Boolean)
          .reduce(maxDate)
      : toDateStr(fee.endDate) || new Date().toISOString();

    const fullName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.name ||
      "N/A";
    const rollNo = user.uniqueId || "N/A";
    const paymentMode = fee.paymentMode || "Cash";
    const receiptNo =
      (fee.receipt && fee.receipt.number) ||
      fee.receipt ||
      `REC-${String(user._id).slice(-4)}-${String(toId(fee._id)).slice(-6)}`;

    // DB se exact totals
    const totalAmount = num(fee.totalAmount ?? fee.amount ?? 0);
    const netAmount = num(fee.netAmount ?? 0);
    const sgstAmount = num(fee.sgstAmount ?? 0);
    const cgstAmount = num(fee.cgstAmount ?? 0);

    // accurate % = amount/base * 100
    const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
    const sgstRate = Number(pct(sgstAmount, baseBeforeGST).toFixed(2));
    const cgstRate = Number(pct(cgstAmount, baseBeforeGST).toFixed(2));

    const gstin = user.company?.gstin || user.gstin || "—";
    const pan = user.company?.pan || user.pan || "—";

    return {
      receiptNo,
      startDate,
      endDate,
      rollNo,
      name: fullName,
      pkg: pkgNames,
      remark: fee.remark || "—",
      paymentMode,
      monthlyRate: baseBeforeGST, // base as "Monthly Rate"
      months: 1,
      sgstRate,
      cgstRate,
      gstin,
      pan,
      feesTotal: totalAmount, // force to DB total
    };
  };

  const onClickViewReceipt = async () => {
    // prefer latest PAID fee from array
    const byDateDesc = (a, b) =>
      new Date(b.paymentDate || b.createdAt || 0) -
      new Date(a.paymentDate || a.createdAt || 0);
    const paid =
      fees
        .filter((f) => String(f.status).toLowerCase() === "paid")
        .sort(byDateDesc)[0] || null;

    let srcFee = paid;
    // fallback: fetch by user.feeId if fees array nahi hai
    if (!srcFee && user.feeId) {
      try {
        const { data } = await axios.get(`/fees/${user.feeId}`);
        srcFee = data?.fee || data || null;
      } catch (e) {
        alert("Could not load fee for receipt.");
        return;
      }
    }
    const data = buildReceiptData(srcFee);
    if (!data) {
      alert("No fee found to build receipt.");
      return;
    }
    setReceiptData(data);
    setShowReceipt(true);
  };

  console.log({
    feeIds: user.fees?.map((f) => ({ id: f._id, status: f.status })),
    userFeeId: user.feeId,
    isFeePaid: user.isFeePaid,
  });

  return (
    <>
      {/* Top-right Buttons */}
      <div className="px-4 pt-4 flex justify-end">
        <button
          onClick={onClickViewReceipt}
          disabled={!canViewReceipt}
          className={`group relative mr-4 inline-flex items-center gap-2 rounded-full border border-amber-300 px-4 py-2
              text-amber-800 shadow-sm active:scale-[.99] focus:outline-none focus:ring-2 focus:ring-amber-400
              ${
                canViewReceipt
                  ? "bg-amber-50 hover:bg-amber-100"
                  : "bg-amber-50 opacity-50 cursor-not-allowed"
              }`}
          title="Open latest fee receipt"
        >
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-white
                     transition-transform group-hover:rotate-12"
          >
            {/* receipt/doc icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 3v6h6"
              />
            </svg>
          </span>
          <span className="font-medium">View Receipt</span>
        </button>

        <button
          onClick={() => {
            if (!canAddFee) return; // defensive guard (just in case)
            openGlobalAddFee();
          }}
          disabled={!canAddFee}
          className={`px-4 mr-4 py-2 rounded-lg text-white
    ${
      canAddFee
        ? "bg-yellow-600 hover:bg-yellow-700"
        : "bg-yellow-600 opacity-50 cursor-not-allowed"
    }`}
        >
          Add Fee
        </button>

        <button
          onClick={onClickMarkAllPaid}
          disabled={!canMarkAllPaid || markingAll}
          className={`px-4 py-2 rounded-lg text-white ${
            canMarkAllPaid
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {markingAll ? "Updating..." : "Mark All as Paid"}
        </button>

        <button
          onClick={onClickDeleteFee}
          disabled={deleting || !user.feeId} // sirf tab enable jab feeId ho
          className={`px-4 mr-4 py-2 rounded-lg text-white ${
            deleting || !user.feeId
              ? "bg-red-500 opacity-50 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {deleting ? "Deleting..." : "Delete Fee"}
        </button>
      </div>

      {/* TABLE */}
      <div className="p-4">
        {rows.length === 0 ? (
          <div className="text-gray-500">No active packages.</div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Place
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <FeeRow
                    key={row.assignmentId}
                    user={user}
                    fee={row}
                    onStatusChange={onMarkPaid}
                    onDelete={undefined}
                    showMarkAsPaid={false}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FEES FORM PORTAL */}
      {shouldOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedFee(null);
                setShowForm(false);
              }
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedFee?._id
                      ? "Edit Fees Record"
                      : "Add New Fees Record"}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedFee(null);
                      setShowForm(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <FeesForm
                  key={
                    selectedFee?._id || selectedFee?.assignmentId || user._id
                  }
                  user={user}
                  fee={selectedFee}
                  onSuccess={(result) => {
                    const created = result?.fee || result;
                    const updatedUser = result?.updatedUser;

                    if (created) {
                      onFeeCreated &&
                        onFeeCreated({
                          userId: user._id,
                          feeId: created._id,
                          fee: created,
                          assignmentId: created.assignmentId,
                        });
                    }

                    if (updatedUser) {
                      // optional: parent can replace local user
                    }

                    setSelectedFee(null);
                    setShowForm(false);
                    onMarkPaid && onMarkPaid();
                  }}
                  onCancel={() => {
                    setSelectedFee(null);
                    setShowForm(false);
                  }}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ⬇️ NEW: RECEIPT MODAL PORTAL */}
      {showReceipt &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowReceipt(false);
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[92vh] overflow-y-auto border border-gray-200">
              <div className="p-4 flex items-center justify-between border-b">
                <h3 className="text-lg font-semibold">Fee Receipt</h3>

                {/* Cross icon button */}
                <button
                  onClick={() => setShowReceipt(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300
                       hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  aria-label="Close"
                  title="Close"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 6l12 12M18 6l-12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                <FeeReceipt {...(receiptData || {})} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default UserFees;
