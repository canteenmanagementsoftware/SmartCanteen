import React from "react";

// =====================
// Utility Functions
// =====================
const formatDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatRs = (num) => {
  if (num == null || Number.isNaN(num)) return "-";

  return `Rs ${Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// =====================
// Reusable Components
// =====================
const Divider = () => <div className="border-t border-gray-200 my-4" />;

const Field = ({ label, children }) => (
  <div className="flex flex-col">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900 break-words">
      {children || "-"}
    </span>
  </div>
);

const Row = ({ label, children }) => (
  <tr className="border-t border-gray-100">
    <td className="p-3">{label}</td>
    <td className="p-3 text-right">{children}</td>
  </tr>
);

// =====================
// Main Component
// =====================
const FeeReceipt = ({
  receiptNo,
  startDate,
  endDate,
  rollNo,
  name ,
  pkg ,
  remark,
  paymentMode,
  monthlyRate,
  months,
  sgstRate,
  cgstRate,
  gstin,
  pan ,
  feesTotal, // optional override
}) => {
  // ---------- Calculations ----------
  const base = Number(monthlyRate) * Number(months);
  const sgst = (base * Number(sgstRate)) / 100;
  const cgst = (base * Number(cgstRate)) / 100;
  const total = feesTotal != null ? Number(feesTotal) : base + sgst + cgst;



  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gray-50 p-6 print:p-0">
      <div className="mx-auto max-w-3xl bg-white shadow-sm print:shadow-none rounded-2xl print:rounded-none p-6 print:p-8 border border-gray-200 print:border-0">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-wide">N&T Canteen</h1>
          <p className="text-sm text-gray-500">Fee Receipt</p>
        </div>

        {/* Title + Total */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-lg font-semibold">FEE RECEIPT</div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Fees</div>
            <div className="text-xl font-bold">{formatRs(total)}</div>
          </div>
        </div>

        <Divider />

        {/* Section 1 – Basic Details */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Field label="Receipt No.">{receiptNo}</Field>
            <Field label="Roll No.">{rollNo}</Field>
            <Field label="Start Date">{formatDate(startDate)}</Field>
            <Field label="End Date">{formatDate(endDate)}</Field>
            <Field label="Name">{name}</Field>
            <Field label="Package">{pkg}</Field>
            <Field label="Remark (Remart)">{remark}</Field>
            <Field label="Payment Mode">{paymentMode}</Field>
          </div>
        </section>

        <Divider />

        {/* Section 2 – Price Breakdown */}
        <section>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-semibold">Description</th>
                  <th className="text-right p-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <Row
                  label={`Net Amount${Number(months) > 1 ? ` (x${months})` : ""}`}
                >
                  {formatRs(base)}
                </Row>
                <Row label={`SGST (${sgstRate}%)`}>{formatRs(sgst)}</Row>
                <Row label={`CGST (${cgstRate}%)`}>{formatRs(cgst)}</Row>
                <tr className="bg-gray-50">
                  <td className="p-3 font-semibold">Grand Total</td>
                  <td className="p-3 text-right font-semibold">
                    {formatRs(total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <Divider />

        {/* Section 3 – Statutory IDs */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="GSTIN No.">{gstin}</Field>
            <Field label="PAN No.">{pan}</Field>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 text-right">
          <div className="text-sm text-gray-500">For N&T Canteen</div>
          <div className="text-xs text-gray-500">
            This is a system-generated receipt. No signature is required.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeReceipt;
