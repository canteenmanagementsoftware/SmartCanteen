import React, { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import FeesForm from "./FeesForm";
import Alert from "../../components/ui/Alert";
import { AuthContext } from "../../context/auth-context";
import FeeRow from "../../components/fees/FeeRow";

import { DateRangePicker } from "rsuite";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

const RSUITE_CSS_URL = "https://unpkg.com/rsuite/dist/rsuite-no-reset.min.css";

// date helpers
const ymd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const FeesList = () => {
  const { user, showForm, setShowForm, selectedFee, setSelectedFee } =
    useContext(AuthContext);

  const [fees, setFees] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("all");

  const [searchQuery, setSearchQuery] = useState("");

  // NEW: date range state
  const [range, setRange] = useState(null); // [Date, Date] | null

  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // load RSuite css once
  useEffect(() => {
    let link = document.querySelector("link[data-rsuite]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = RSUITE_CSS_URL;
      link.setAttribute("data-rsuite", "true");
      document.head.appendChild(link);
    }
    return () => {
      if (link && link.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
  };

  const loadCompanies = async () => {
    try {
      if (user?.userType !== "superadmin" && user?.companyId) {
        setCompanies([
          { _id: user.companyId, name: user.companyName || "Unknown Company" },
        ]);
      } else {
        const res = await axios.get("/company");
        setCompanies(Array.isArray(res.data) ? res.data : res.data?.data || []);
      }
    } catch (err) {
      console.error("Failed to load companies", err);
    }
  };

  const loadFees = async () => {
    setLoading(true);
    try {
      let res;
      if (user?.userType !== "superadmin" && user?.companyId) {
        res = await axios.get(`/fees?companyId=${user.companyId}`);
      } else {
        res = await axios.get("/fees");
      }
      const data = Array.isArray(res.data?.data) ? res.data.data : res.data;
      setFees(data);
      setFiltered(data);
      setCurrentPage(1); // reset on fresh load
    } catch (err) {
      console.error("Error loading fees:", err);
      setError(err?.response?.data?.message || "Failed to load fees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // live search + company + date-range filter (runs whenever any dependency changes)
  useEffect(() => {
    const q = searchQuery.toLowerCase();

    // build optional date window
    const start = range ? new Date(ymd(range[0]) + "T00:00:00") : null;
    const end   = range ? new Date(ymd(range[1] || range[0]) + "T23:59:59.999") : null;

    const results = fees.filter((fee) => {
      // company filter
      const matchesCompany =
        selectedCompany === "all" || fee.companyId?._id === selectedCompany;

      if (!matchesCompany) return false;

      // date filter (by paymentDate, else createdAt)
      if (start || end) {
        const whenISO = fee.paymentDate || fee.createdAt || fee.updatedAt;
        const t = whenISO ? new Date(whenISO) : null;
        if (t) {
          if (start && t < start) return false;
          if (end && t > end) return false;
        }
      }

      // text filter (name, id, batch, uniqueId)
      const matchesSearch =
        (fee.studentName || "").toLowerCase().includes(q) ||
        (fee.studentId || "").toLowerCase().includes(q) ||
        (fee.batch_name || "").toLowerCase().includes(q) ||
        (fee?.userId?.uniqueId || fee?.uniqueId || "").toLowerCase().includes(q);

      return matchesSearch;
    });

    setFiltered(results);
    setCurrentPage(1); // reset page when filters/search change
  }, [searchQuery, selectedCompany, range, fees]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fees record?")) {
      try {
        await axios.delete(`/fees/${id}`);
        showAlert("Fees record deleted successfully");
        loadFees();
      } catch (err) {
        showAlert(err?.response?.data?.message || "Failed to delete", "error");
      }
    }
  };

  const handleEdit = (fee) => {
    setSelectedFee(fee);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    loadFees();
    showAlert(
      selectedFee
        ? "Fees record updated successfully"
        : "Fees record created successfully"
    );
    setSelectedFee(null);
    setShowForm(false);
  };

  // close modal on Esc
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showForm) {
        setSelectedFee(null);
        setShowForm(false);
      }
    };
    if (showForm) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showForm, setSelectedFee, setShowForm]);

  // pagination math
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, totalItems);
  const paginated = filtered.slice(startIdx, endIdx);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {alert.show && (
            <Alert
              message={alert.message}
              type={alert.type}
              onClose={() => setAlert({ show: false })}
            />
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Fees Collection 💰
                  </h1>
                  <p className="text-gray-600">
                    Manage student fees and payments
                  </p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-4 rounded-full">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Filters & Actions
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Date Range (RSuite) */}
                <div className="md:col-span-2">
                  <DateRangePicker
                    className="w-full"
                    value={range}
                    onChange={setRange}
                    placeholder="Filter by payment date (optional)"
                    format="yyyy-MM-dd"
                    showHeader
                    oneTap={false}
                    editable={false}
                    cleanable
                    ranges={[
                      { label: "Today", value: [new Date(), new Date()] },
                      {
                        label: "Yesterday",
                        value: [
                          new Date(new Date().setDate(new Date().getDate() - 1)),
                          new Date(new Date().setDate(new Date().getDate() - 1)),
                        ],
                      },
                      {
                        label: "This Month",
                        value: [startOfMonth(new Date()), endOfMonth(new Date())],
                      },
                      {
                        label: "Last Month",
                        value: [
                          startOfMonth(subMonths(new Date(), 1)),
                          endOfMonth(subMonths(new Date(), 1)),
                        ],
                      },
                    ]}
                  />
                </div>

                {/* Company (only for superadmin) + Search */}
                <div className="flex gap-3 items-center md:justify-end">
                  {user?.userType === "superadmin" && (
                    <select
                      className="px-3 py-2 border rounded-md shadow-sm text-sm text-gray-700"
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Companies</option>
                      {companies.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, ID, batch, unique id"
                    className="px-4 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table / content */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
                <span className="ml-3 text-gray-600">
                  Loading fees records...
                </span>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <svg
                    className="w-8 h-8 text-red-500 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
                <p className="text-gray-500 text-lg font-medium">
                  No fees records found
                </p>
                <p className="text-gray-400 text-sm">
                  Try changing the date range or filters
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">location</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Place</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unique ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>

                      {/* NEW five columns */}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SGST</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">CGST</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total GST</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Grand Total</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Amount</th>

                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">payment mode</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fee Register</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">fee receipt</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginated.map((fee) => (
                      <FeeRow
                        key={fee._id}
                        fee={fee}
                        user={user}
                        onStatusChange={loadFees}
                        showMarkAsPaid={false}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mt-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-gray-700">
                  Showing <b>{totalItems ? startIdx + 1 : 0}</b>–<b>{endIdx}</b> of <b>{totalItems}</b> fees records
                  <span className="ml-2 text-gray-500">| Page {safePage} of {totalPages}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fees form modal (unchanged) */}
          {showForm && (
            <FeesForm
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setSelectedFee(null);
                setShowForm(false);
              }}
              fee={selectedFee}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FeesList;
