import React, { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import Alert from "../../components/ui/Alert";
import PlaceForm from "./PlaceForm";
import { AuthContext } from "../../context/auth-context";
import ErrorBoundary from "../../components/ErrorBoundary";

const PlaceList = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [places, setPlaces] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [companies, setCompanies] = useState([]);

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
  };

  const loadPlaces = async () => {
    setLoading(true);
    try {
      let res;

      // If user is not superadmin, filter by their company
      if (currentUser?.userType !== "superadmin" && currentUser?.companyId) {
        res = await axios.get(`/places?companyId=${currentUser.companyId}`);
      } else {
        res = await axios.get("/places");
      }

      const data = Array.isArray(res.data?.data) ? res.data.data : res.data;
      setPlaces(data);
      setFiltered(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load places");
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      // If user is not superadmin, only load their company
      if (currentUser?.userType !== "superadmin" && currentUser?.companyId) {
        // For non-superadmin users, set their company directly
        setCompanies([
          {
            _id: currentUser.companyId,
            name: currentUser.companyName || "Unknown Company",
          },
        ]);
      } else {
        // For superadmin, load all companies
        const res = await axios.get("/company");
        setCompanies(Array.isArray(res.data) ? res.data : res.data?.data || []);
      }
    } catch (err) {
      console.error("Failed to load companies", err);
    }
  };

  useEffect(() => {
    loadPlaces();
    loadCompanies();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this place?")) {
      try {
        await axios.delete(`/places/${id}`);
        showAlert("Place deleted successfully");
        loadPlaces();
      } catch (err) {
        showAlert(err.response?.data?.message || "Failed to delete", "error");
      }
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (!value) {
      setFiltered(places);
    } else {
      const lower = value.toLowerCase();
      const result = places.filter(
        (place) =>
          place.name?.toLowerCase().includes(lower) ||
          place.gst_no?.toLowerCase().includes(lower) ||
          place.pan_no?.toLowerCase().includes(lower)
      );
      setFiltered(result);
      setPage(1);
    }
  };

  const currentPageData = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const totalPages = Math.ceil(filtered.length / pageSize);

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

          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Place Management 🏢
                  </h1>
                  <p className="text-gray-600">
                    Manage places and their configurations
                  </p>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-full">
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
                  Filters & Actions
                </h2>
                <div className="flex gap-4">
                  {/* Company Filter Dropdown - Only for Superadmin */}
                  {currentUser?.userType === "superadmin" && (
                    <select
                      className="px-3 py-2 border rounded-md shadow-sm text-sm text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "all") {
                          setFiltered(places);
                        } else {
                          const filteredByCompany = places.filter(
                            (place) =>
                              place.company && place.company._id === value
                          );
                          setFiltered(filteredByCompany);
                        }
                        setPage(1);
                      }}
                    >
                      <option value="all">All Companies</option>
                      {[...new Set(places.map((p) => p.company?._id))]
                        .filter(Boolean)
                        .map((companyId) => {
                          const name =
                            places.find((p) => p.company?._id === companyId)
                              ?.company?.name || "Unknown";
                          return (
                            <option key={companyId} value={companyId}>
                              {name}
                            </option>
                          );
                        })}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Search by name/GST/PAN"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="px-4 py-2 border rounded-md shadow-sm text-sm text-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <button
                    onClick={() => {
                      setSelectedPlace(null);
                      setShowForm(true);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
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
                    Add New Place
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                <span className="ml-3 text-gray-600">Loading places...</span>
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
            ) : currentPageData.length === 0 ? (
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
                  No places found
                </p>
                <p className="text-gray-400 text-sm">
                  Start by adding your first place
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        GST
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        FSSAI
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        PAN
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Updated At
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Updated By
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {console.log(currentPageData)}
                    {currentPageData.map((place) => (
                      <tr
                        key={place._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {place.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <div className="bg-blue-100 p-2 rounded-lg mr-3">
                              <svg
                                className="w-4 h-4 text-blue-600"
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
                            {place.company?.name || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {place.gst_no || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {place.fssai_no || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {place.pan_no || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              place.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {place.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {place.updatedAt
                            ? new Date(place.updatedAt).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {" "}
                          {typeof place.createdBy === "string"
                            ? place.createdBy
                            : place.createdBy?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof place.updatedBy === "string"
                            ? place.updatedBy
                            : place.updatedBy?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedPlace(place);
                                setShowForm(true);
                              }}
                              className="bg-orange-100 text-orange-700 px-3 py-1 rounded-md hover:bg-orange-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(place._id)}
                              className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                            >
                              Delete
                            </button>
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
                  Showing page {page} of {totalPages} ({filtered.length} total
                  places)
                </div>
                <div className="flex space-x-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
                    disabled={page === totalPages}
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
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
        <PlaceForm
          selectedPlace={selectedPlace}
          onSuccess={() => {
            setShowForm(false);
            setSelectedPlace(null);
            loadPlaces();
          }}
          onCancel={() => {
            setShowForm(false);
            setSelectedPlace(null);
          }}
        />
      )}
    </div>
  );
};

const PlaceMasterWithBoundary = () => (
  <ErrorBoundary>
    <PlaceList />
  </ErrorBoundary>
);

export default PlaceMasterWithBoundary;
