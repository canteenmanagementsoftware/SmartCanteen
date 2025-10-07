import { useState, useEffect, useCallback, useContext } from "react";

import axios from "../../utils/axiosConfig";
import Alert from "../../components/ui/Alert";
import CompanyForm from "./CompanyForm";
import ErrorBoundary from "../../components/ErrorBoundary";
import { AuthContext } from "../../context/auth-context";

const BASE_URL = "http://localhost:5000";

const CompanyList = () => {
  const { user: currentUser } = useContext(AuthContext);

  const [companies, setCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ show: true, message, type });
    const timer = setTimeout(
      () => setAlert({ show: false, message: "", type: "" }),
      3000
    );
    return () => clearTimeout(timer);
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/company");
      if (Array.isArray(res.data)) {
        setCompanies(res.data);
        setFiltered(res.data);
        setError(null);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message);
      showAlert("Failed to load companies", "error");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  //  Handle Search
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const results = companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
    );
    setFiltered(results);
    setCurrentPage(1); // Reset to first page on new search
  }, [searchQuery, companies]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this company?")) {
      try {
        await axios.delete(`/company/${id}`);
        showAlert("Company deleted successfully");
        loadCompanies(); // Reload updated list
      } catch (error) {
        showAlert(error.response?.data?.message || error.message, "error");
      }
    }
  };

  const getImageUrl = (logoPath) => {
    if (!logoPath) return null;
    return logoPath.startsWith("http") ? logoPath : `${BASE_URL}${logoPath}`;
  };

  //  Pagination logic
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {alert.show && (
            <Alert
              message={alert.message}
              type={alert.type}
              onClose={() => setAlert({ show: false, message: "", type: "" })}
            />
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Company Management 🏢
                  </h1>
                  <p className="text-gray-600">
                    Manage companies and their configurations
                  </p>
                  {currentUser?.userType === "admin" && (
                    <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md inline-block">
                      Your Company:{" "}
                      {companies.length > 0
                        ? companies[0].name
                        : "No company assigned"}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-full">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  Search & Actions
                </h2>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Search by name/email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 border rounded-md shadow-sm text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {currentUser?.userType === "superadmin" && (
                    <button
                      onClick={() => {
                        setSelected(null);
                        setShowForm(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 inline mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add New Company
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Loading companies...</span>
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <p className="text-gray-500 text-lg font-medium">
                  {currentUser?.userType === "admin"
                    ? "You don't have a company assigned yet. Please create your company to get started."
                    : "No companies found"}
                </p>
                <p className="text-gray-400 text-sm">
                  Start by adding your first company
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginated.map((company) => (
                      <tr
                        key={company._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full border-2 border-gray-200 bg-gray-100">
                              {company.logo ? (
                                <img
                                  src={getImageUrl(company.logo)}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "";
                                    e.target.style.display = "none";
                                  }}
                                  alt="Company Logo"
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-500 text-[10px]">
                                  No Logo
                                </span>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {company.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {company.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {company.contactNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {company.address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              company.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {company.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {currentUser?.userType === "superadmin" ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelected(company);
                                    setShowForm(true);
                                  }}
                                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(company._id)}
                                  className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                                >
                                  Delete
                                </button>
                              </>
                            ) : currentUser?.userType === "admin" ? (
                              <button
                                onClick={() => {
                                  setSelected(company);
                                  setShowForm(true);
                                }}
                                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
                              >
                                Edit
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                View only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({totalItems} total
                  companies)
                </div>
                <div className="flex space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <CompanyForm
          selectedCompany={selected}
          onSuccess={() => {
            setShowForm(false);
            setSelected(null);
            loadCompanies();
          }}
          onCancel={() => {
            setShowForm(false);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
};

const CompanyListWithBoundary = () => (
  <ErrorBoundary>
    <CompanyList />
  </ErrorBoundary>
);

export default CompanyListWithBoundary;
