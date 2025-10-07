import React, { useMemo, useState } from "react";
import AddPackageForm from "../../pages/UserManagement/AddPackageForm";

const PackageInfo = ({
  users = [],
  user = null,
  onDeleteAssignment = () => {},
  onAddPackage = () => {},
  onDeleteAllActive = () => {},
}) => {
  const [activeTab, setActiveTab] = useState("active");
  const [showAddForm, setShowAddForm] = useState(false);

  // Prefer users[], else single user
  const unifiedUsers = useMemo(() => {
    if (Array.isArray(users) && users.length > 0) return users;
    if (user && typeof user === "object") return [user];
    return [];
  }, [users, user]);

  // helpers
  const startOfDay = (d) => {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  };
  const todaySOD = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  })();
  const toDateStr = (d) => {
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return "-";
      return dt.toLocaleDateString("en-IN");
    } catch {
      return "-";
    }
  };
  const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  // NEW: Extract per-assignment rows (supports new embedded model + legacy single fields)
  const rows = useMemo(() => {
    const all = [];
    for (const u of unifiedUsers) {
      // NEW MODEL
      if (Array.isArray(u?.packages) && u.packages.length) {
        for (const a of u.packages) {
          all.push({
            _rowId: `${u._id}-${a._id}`,
            assignmentId: a._id,
            userId: u._id,
            userName: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
            // package info (prefer snapshot if present)
            packageName: a.packageName || a.packageId?.name || "N/A",
            packagePrice:
              a.packagePrice ??
              (a.packageId && typeof a.packageId === "object"
                ? a.packageId.price
                : null),
            // location display
            locationName:
              a.locationId?.locationName ||
              a.locationId?.name ||
              (typeof a.locationId === "string" ? a.locationId : "N/A"),
            // dates + status
            startDate: a.startDate,
            endDate: a.endDate,
            status: a.status,
          });
        }
        continue;
      }
      // LEGACY (single fields at root)
      if (u?.packageId || u?.startDate || u?.endDate) {
        const pkgObj = typeof u.packageId === "object" ? u.packageId : null;
        all.push({
          _rowId: `${u._id}-legacy`,
          userId: u._id,
          userName: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          packageName: pkgObj?.name || "N/A",
          packagePrice: pkgObj?.price ?? null,
          locationName:
            u?.locationId?.locationName ||
            u?.locationId?.name ||
            (typeof u.locationId === "string" ? u.locationId : "N/A"),
          startDate: u.startDate,
          endDate: u.endDate,
          status: undefined, // compute below
        });
      }
    }
    return all;
  }, [unifiedUsers]);

  // derive status per-assignment
  const deriveStatus = (row) => {
    if (row?.status === "cancelled") return "cancelled";
    const s = startOfDay(row.startDate);
    const e = startOfDay(row.endDate);
    if (!s || !e) return "active"; // fallback
    if (todaySOD < s) return "scheduled";
    if (todaySOD > e) return "expired";
    return "active";
  };

  const activeRows = rows.filter((r) => deriveStatus(r) === "active");
  const historyRows = rows.filter((r) => deriveStatus(r) !== "active");

  const renderTableRows = (data) =>
    data.length === 0 ? (
      <tr>
        <td colSpan="7" className="py-4 text-center text-gray-500">
          No packages found.
        </td>
      </tr>
    ) : (
      data.map((r) => {
        const status = deriveStatus(r);
        const priceStr =
          r.packagePrice != null ? inr.format(r.packagePrice) : "—";
        const validity = `${toDateStr(r.startDate)} → ${toDateStr(r.endDate)}`;
        return (
          <tr key={r._rowId} className="border-b">
            <td className="px-4 py-2">{r.userName || "-"}</td>
            <td className="px-4 py-2">{r.packageName}</td>
            <td className="px-4 py-2">{priceStr}</td>
            <td className="px-4 py-2">{validity}</td>
            <td className="px-4 py-2">{r.locationName}</td>
            <td className="px-4 py-2">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  status === "active"
                    ? "bg-green-100 text-green-800"
                    : status === "expired"
                    ? "bg-yellow-100 text-yellow-800"
                    : status === "scheduled"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {status}
              </span>
            </td>
            <td className="px-4 py-2 space-x-2">
              <button
                onClick={() => onDeleteAssignment?.(r)}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
              >
                Delete
              </button>
            </td>
          </tr>
        );
      })
    );

  const primaryUser = unifiedUsers?.[0] || null;
const activeIds = activeRows.map(r => r.assignmentId).filter(Boolean);

  return (
    <div className="p-6 shadow rounded">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="font-semibold text-gray-700">Packages</div>
        <div>
          <button
            onClick={() => onDeleteAllActive?.(primaryUser?._id, activeIds)}
            disabled={!primaryUser?._id || activeIds.length === 0}
            className={`px-3 mr-2 py-1 rounded text-sm ${
              activeIds.length === 0
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            + Delete Active Package(s)
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Add Package
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`mr-6 pb-2 border-b-2 text-sm font-medium ${
            activeTab === "active"
              ? "border-purple-500 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("active")}
        >
          ACTIVE PACKAGE
        </button>
        <button
          className={`pb-2 border-b-2 text-sm font-medium ${
            activeTab === "history"
              ? "border-purple-500 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("history")}
        >
          PACKAGE HISTORY
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-left">Package</th>
              <th className="px-4 py-2 text-left">Price</th>
              <th className="px-4 py-2 text-left">Validity</th>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeTab === "active"
              ? renderTableRows(activeRows)
              : renderTableRows(historyRows)}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AddPackageForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        user={user}
        // defaultUser optional — agar AddPackageForm me preselects chahiye
        defaultUser={primaryUser}
        onSubmit={(payload) => {
          // IMPORTANT: userId ke saath forward karo
          onAddPackage(primaryUser?._id, payload);
          setShowAddForm(false);
        }}
      />
    </div>
  );
};

export default PackageInfo;
