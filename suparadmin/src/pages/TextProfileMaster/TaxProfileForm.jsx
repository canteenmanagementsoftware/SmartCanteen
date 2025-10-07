import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosConfig";

const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z]+/g, " ").replace(/\s+/g, " ").trim();
const pickId = (list, candidates) => {
  const cand = candidates.map(normalize);
  const hit = list.find(a => {
    const n = normalize(a?.name);
    return cand.includes(n) || cand.some(c => n.includes(c));
  });
  return hit?._id || "";
};

const REQUIRED_NAMES = ["SGST", "CGST", "IGST", "UTGST", "CESS", "SERVICE CHARGE"];

const findTaxByName = (taxes, name) => {
  const n = normalize(name);
  return taxes.find(t => normalize(t.name) === n) || null;
};

const preferredOrder = ["SGST","CGST","IGST","UTGST"];

const TaxProfileForm = ({ onSuccess, onCancel, initialData = null }) => {
  const [taxesOptions, setTaxesOptions] = useState([]);
  const [applicableOptions, setApplicableOptions] = useState([]);
  const [loadingOpts, setLoadingOpts] = useState(true);

  const [formData, setFormData] = useState({
    taxProfile: "",
    totalTaxPercentage: "",
    taxes: [] // rows: { taxId, name, percentage, applicabilityId, locked }
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // load options and build rows (with default + locked)
// replace your useEffect body that builds rows (options fetch keep same)
useEffect(() => {
  (async () => {
    try {
      setLoadingOpts(true);
      const [tx, ap] = await Promise.all([
        axios.get("/taxes"),
        axios.get("/applicables"),
      ]);

      const taxes = (tx.data?.data || []).filter(t => t.isActive !== false);
      const applicables = ap.data?.data || [];

      setTaxesOptions(taxes);
      setApplicableOptions(applicables);

      const intrastateId     = pickId(applicables, ["intrastate","intra state","intra-state","intra"]);
      const unionTerritoryId = pickId(applicables, ["union territory","unionterritory","union","union master","union tererarity"]);

      const getDefault = (taxName) => {
        const n = String(taxName || "").toUpperCase();
        if (["SGST","CGST","IGST"].includes(n) && intrastateId) return { id: intrastateId, lock: true };
        if (n === "UTGST" && unionTerritoryId) return { id: unionTerritoryId, lock: true };
        return { id: "", lock: false };
      };

      // base list: required names first (even if not in DB), then other DB taxes
      const otherDbTaxes = taxes
        .map(t => t.name.toUpperCase())
        .filter(n => !REQUIRED_NAMES.includes(n));
      const visibleNames = [...REQUIRED_NAMES, ...otherDbTaxes];

      // build base rows from names → try to attach taxId from DB, else keep taxId empty
      const baseRows = visibleNames.map(nameU => {
        const name = nameU === "SERVICE CHARGE" ? "Service Charge" : nameU; // pretty label
        const taxDoc = findTaxByName(taxes, name);
        const { id: appId, lock } = getDefault(name);
        return {
          taxId: taxDoc?._id || "",     // empty if not found in DB
          name,
          percentage: "",
          applicabilityId: appId,
          locked: lock && !!appId
        };
      });

      if (initialData?.percentages?.length) {
        // make quick lookup from saved data (by id and by name)
        const byId = new Map(
          initialData.percentages.map(p => [String(p.tax?._id || p.tax || ""), p])
        );
        const byName = new Map(); // fallback match by name if needed
        initialData.percentages.forEach(p => {
          const taxId = p.tax?._id || p.tax || "";
          // try map back to name using current taxes list
          const taxName = taxes.find(t => String(t._id) === String(taxId))?.name || "";
          if (taxName) byName.set(normalize(taxName), p);
        });

        const rows = baseRows.map(row => {
          const saved =
            (row.taxId && byId.get(String(row.taxId))) ||
            byName.get(normalize(row.name));
          if (!saved) return row;

          const savedPct = String(saved.percentage ?? "");
          const savedApp = saved.applicability?._id || saved.applicability || "";

          // keep saved applicability; if missing, apply default+lock
          let appId = savedApp;
          let locked = row.locked;
          if (!appId) {
            const d = getDefault(row.name);
            appId = d.id;
            locked = d.lock && !!d.id;
          }
          return {
            ...row,
            percentage: savedPct,
            applicabilityId: appId,
            locked
          };
        });

        setFormData({
          taxProfile: initialData.taxProfile || "",
          totalTaxPercentage:
            initialData.totalTaxPercentage?.toString?.() ||
            initialData.taxPercentage?.toString?.() || "",
          taxes: rows
        });
      } else {
        setFormData(prev => ({ ...prev, taxes: baseRows }));
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load options");
    } finally {
      setLoadingOpts(false);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initialData]);


  const handleTopFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ignore applicability changes when row is locked
  const handleRowChange = (taxId, field, value) => {
    setFormData(prev => ({
      ...prev,
      taxes: prev.taxes.map(row => {
        if (String(row.taxId) !== String(taxId)) return row;
        if (field === "applicabilityId" && row.locked) return row;
        return { ...row, [field]: value };
      })
    }));
  };

  const validate = () => {
    if (!formData.taxProfile.trim()) return "Tax Profile is required";
    if (formData.totalTaxPercentage === "") return "Total tax Percentage is required";
    const total = Number(formData.totalTaxPercentage);
    if (!Number.isFinite(total) || total < 0) return "Total Tax Percentage must be a non-negative number";

    for (const row of formData.taxes) {
      if (row.percentage !== "") {
        const p = Number(row.percentage);
        if (!Number.isFinite(p) || p < 0) return `Invalid percentage for ${row.name || "row"}`;
        if (!row.applicabilityId) return `Please select applicability for ${row.name || "row"}`;
      }
    }
    return "";
  };

  const handleSubmit = async () => {
    setError("");
    const msg = validate();
    if (msg) return setError(msg);

    try {
      setSubmitting(true);
      const percentages = formData.taxes
        .filter(r => r.percentage !== "" && Number(r.percentage) >= 0)
        .map(r => ({
          taxId: r.taxId,
          percentage: Number(r.percentage),
          applicabilityId: r.applicabilityId
        }));

      const payload = {
        taxProfile: formData.taxProfile.trim(),
        taxPercentage: Number(formData.totalTaxPercentage),
        percentages
      };
      await onSuccess?.(payload);
    } catch (err) {
      setError(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Tax Profile</h2>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        {/* top fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Profile</label>
            <input
              type="text"
              name="taxProfile"
              value={formData.taxProfile}
              onChange={handleTopFieldChange}
              placeholder="Enter Tax"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Tax Percentage</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="totalTaxPercentage"
              value={formData.totalTaxPercentage}
              onChange={handleTopFieldChange}
              placeholder="Enter total tax percentage"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* rows */}
        <div className="mt-8">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-sm font-medium text-gray-700">Tax</div>
            <div className="text-sm font-medium text-gray-700">Percentage</div>
            <div className="text-sm font-medium text-gray-700">Applicable On</div>
          </div>

          {loadingOpts ? (
            <div className="text-gray-500">Loading options…</div>
          ) : (
            formData.taxes.map((row) => (
              <div key={row.taxId} className="grid grid-cols-3 gap-4 mb-4 items-center">
                <div>
                  <input
                    type="text"
                    value={row.name}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-700"
                  />
                </div>

                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.percentage}
                    onChange={(e) => handleRowChange(row.taxId, "percentage", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={row.applicabilityId}
                    onChange={(e) => handleRowChange(row.taxId, "applicabilityId", e.target.value)}
                    disabled={row.locked}
                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${row.locked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                  >
                    <option value="">---select---</option>
                    {applicableOptions.map((a) => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                  </select>
                  
                </div>
              </div>
            ))
          )}
        </div>

        {/* actions */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={submitting || loadingOpts}
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxProfileForm;
