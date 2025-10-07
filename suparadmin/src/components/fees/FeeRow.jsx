import React, { useState } from "react";
import axios from "../../utils/axiosConfig";

const formatDate = (date) => {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

const formatDateTime = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return null;
  }
};

const FeeRow = ({
  user,
  fee,
  onEdit,
  onDelete,
  onStatusChange,
  addButton,
  showMarkAsPaid = true,
}) => {
  const [loading, setLoading] = useState(false);

  console.log("user", user);
  console.log("fee", fee);

  const handleMarkAsPaid = async () => {
    if (fee.status === "paid") return;
    if (!fee._id) {
      alert("Please add a fee first.");
      return;
    }
    try {
      setLoading(true);
      await axios.put(`/fees/${fee._id}`, { status: "paid" });
      await axios.put(`/usermaster/${user._id}`, { isFeePaid: true });
      onStatusChange && onStatusChange(user._id);
      alert("Fee marked as paid successfully");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to mark as paid");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!fee.receipt) return alert("No receipt available");
    try {
      const response = await axios.get(`/fees/${fee._id}/receipt`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fee.receipt);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Failed to download receipt");
    }
  };

  const companyName = fee.companyId?.name || fee.companyName || null;
  const studentName = fee.studentName || fee.firstName || fee.lastName || null;
  const batchName = fee.batchId?.batch_name || fee.batch_name || null;
  const packageName = fee.packageId?.name || fee.packageName || null;
  const price = fee.amount || fee.packageId?.price || fee.price || 0;
  const validity =
    fee.packageId?.is_fixed_validity && fee.packageId?.validity_date
      ? formatDate(fee.packageId.validity_date)
      : fee.validity || "-";
  const location = fee.locationId?.locationName || fee.locationName || null;
  const placeName = fee.placeId?.name || fee.placeName || null;
  const paymentMode = fee.paymentMode || null;
  const paymentDateTime = formatDateTime(fee.paymentDate);
  const uniqueId =
    fee?.userId?.uniqueId ||
    fee?.uniqueId ||
    fee?.userId?.unique_number || // agar kuchh data me field ka naam alag ho
    null;

  const formatINR = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // --- GST math (uses provided fields; falls back to derive when absent)
  const amtSource = fee?.amount ?? price ?? 0; // prefer fee.amount; else fallback to price you already show
  const amt = Number(amtSource) || 0;
  const gstPercent = Number(fee?.gstPercent || 0);
  const includingGST = Boolean(fee?.includingGST);

  let sgst = Number(fee?.sgstAmount || 0);
  let cgst = Number(fee?.cgstAmount || 0);
  let totalGST = sgst + cgst;

  // If API didn’t populate sgst/cgst, derive from amount + percent
  if (totalGST === 0 && gstPercent > 0) {
    if (includingGST) {
      const base = amt / (1 + gstPercent / 100);
      totalGST = amt - base;
      cgst = totalGST / 2;
      sgst = totalGST / 2;
    } else {
      totalGST = (amt * gstPercent) / 100;
      cgst = totalGST / 2;
      sgst = totalGST / 2;
    }
  }

  // Grand total & Net amount (prefer API fields if present)
  let grandTotal =
    Number(fee?.totalAmount) || (includingGST ? amt : amt + totalGST);

  let netAmount =
    Number(fee?.netAmount) || (includingGST ? grandTotal - totalGST : amt);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex items-center">
          <div className="bg-yellow-100 p-2 rounded-lg mr-3">
            <svg
              className="w-4 h-4 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          {companyName}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {location
          ? location.length > 10
            ? `${location.slice(0, 15)}...`
            : location
          : "-"}
      </td>

      {placeName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {placeName}
        </td>
      )}

      {studentName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {studentName}
        </td>
      )}

      {!packageName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {uniqueId || "-"}
        </td>
      )}

      {batchName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {batchName}
        </td>
      )}

      {packageName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {packageName !== "N/A" ? packageName : "-"}
        </td>
      )}

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
        ₹{price}
      </td>

      {/* ✅ NEW: SGST / CGST / Total GST / Grand Total / Net Amount */}
      {!packageName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatINR(sgst)}
        </td>
      )}
      {!packageName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatINR(cgst)}
        </td>
      )}
      {!packageName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatINR(totalGST)}
        </td>
      )}
      {!packageName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
          {formatINR(grandTotal)}
        </td>
      )}
      {!packageName && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatINR(netAmount)}
        </td>
      )}

      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            fee.status === "paid"
              ? "bg-green-100 text-green-800"
              : fee.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {fee.status?.charAt(0).toUpperCase() + fee.status?.slice(1) ||
            "Unknown"}
        </span>
      </td>

      {fee.paymentMode && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {paymentMode || "-"}
        </td>
      )}

      {fee.paymentDate && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {paymentDateTime || "-"}
        </td>
      )}

      {user.name && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          -{user.name}
        </td>
      )}

      {fee.receipt && (
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button
            onClick={handleDownloadReceipt}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
            disabled={!fee.receipt}
          >
            {fee.receipt ? "Download Fee Receipt" : "No Receipt"}
          </button>
        </td>
      )}

      {showMarkAsPaid && (
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          {Boolean(fee?._id) && fee?.status !== "paid" && (
            <button
              onClick={handleMarkAsPaid}
              disabled={loading}
              className="bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
            >
              {loading ? "Updating..." : "Mark as Paid"}
            </button>
          )}
        </td>
      )}

      {(addButton || onEdit || onDelete) && (
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex space-x-2">
            {addButton}
            {onEdit && (
              <button
                onClick={() => onEdit(fee)}
                className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md hover:bg-indigo-200 transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(fee._id, fee.assignmentId)}
                className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
};

export default FeeRow;
