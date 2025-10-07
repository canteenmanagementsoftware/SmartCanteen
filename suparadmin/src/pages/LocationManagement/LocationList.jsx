import React, { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import LocationForm from "./LocationForm";
import Alert from "../../components/ui/Alert";
import { AuthContext } from "../../context/auth-context";

const LocationList = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [locations, setLocations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
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

  const loadLocations = async () => {
    setLoading(true);
    try {
      let res;

      // If user is not superadmin, filter by their company
      if (currentUser?.userType !== "superadmin" && currentUser?.companyId) {
        res = await axios.get(`/locations?companyId=${currentUser.companyId}`);
      } else {
        res = await axios.get("/locations");
      }

      const data = Array.isArray(res.data?.data) ? res.data.data : res.data;
      setLocations(data);
      setFiltered(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadLocations();
  }, []);

  // Handle search and filtering
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const results = locations.filter((loc) => {
      const matchesCompany =
        selectedCompany === "all" || loc.companyId?._id === selectedCompany;
      const matchesSearch =
        loc.locationName?.toLowerCase().includes(query) ||
        loc.placeId?.name?.toLowerCase().includes(query);
      return matchesCompany && matchesSearch;
    });
    setFiltered(results);
    setCurrentPage(1); // Reset to first page on new search/filter
  }, [searchQuery, selectedCompany, locations]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this location?")) {
      try {
        await axios.delete(`/locations/${id}`);
        showAlert("Location deleted successfully");
        loadLocations();
      } catch (err) {
        showAlert(err?.response?.data?.message || "Failed to delete", "error");
      }
    }
  };

  const handleEdit = (location) => {
    setSelectedLocation(location);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    loadLocations();
    showAlert(
      selectedLocation
        ? "Location updated successfully"
        : "Location created successfully"
    );
    setSelectedLocation(null);
    setShowForm(false);
  };

  // Pagination logic
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
              onClose={() => setAlert({ show: false })}
            />
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Location Management 📍
                  </h1>
                  <p className="text-gray-600">
                    Manage locations for your company
                  </p>
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
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
                  {/* Only show company dropdown for superadmin, not for admin or manager */}
                  {currentUser?.userType === "superadmin" && (
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
                    placeholder="Search by location or place"
                    className="px-4 py-2 border rounded-md text-sm"
                  />
                  <button
                    onClick={() => {
                      setSelectedLocation(null);
                      setShowForm(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add New Location
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Loading locations...</span>
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
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                <p className="text-gray-500 text-lg font-medium">
                  No locations found
                </p>
                <p className="text-gray-400 text-sm">
                  Start by adding your first location
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
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Place
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Modified By
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Modified Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginated.map((loc) => (
                      
                      <tr
                        key={loc._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
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
                            {loc.companyId?.name || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {loc.locationName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {loc.placeId?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {loc.updatedBy ? loc.updatedBy : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {loc.updatedAt
                            ? new Date(loc.updatedAt).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(loc)}
                              className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md hover:bg-indigo-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(loc._id)}
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
                  Showing page {currentPage} of {totalPages} ({totalItems} total
                  locations)
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
        <LocationForm
          selectedLocation={selectedLocation}
          onAdd={async (payload) => {
            await axios.post("/locations", payload);
            handleFormSuccess();
          }}
          onUpdate={async (payload) => {
            let response = await axios.put(
              `/locations/${selectedLocation._id}`,
              payload
            );
            handleFormSuccess();
          }}
          onCancel={() => {
            setSelectedLocation(null);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
};

export default LocationList;
