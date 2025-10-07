import React, { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import AdminUserForm from "./AdminUserForm";
import Alert from "../../components/ui/Alert";
import { AuthContext } from "../../context/auth-context";

const formatUserType = (type) => {
  const typeMap = {
    'superadmin': 'Super Admin',
    'admin': 'Admin',
    'manager': 'Manager',
    'meal_collector': 'Meal Collector'
  };
  return typeMap[type] || type;
};

const AdminUserList = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [adminUsers, setAdminUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
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

  const loadAdminUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/admin-users");
      const data = Array.isArray(res.data?.data) ? res.data.data : res.data;
      setAdminUsers(data);
      setFiltered(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminUsers();
  }, []);

  // Handle search and filtering
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const results = adminUsers.filter(user => 
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query) ||
      formatUserType(user.type)?.toLowerCase().includes(query)
    );
    setFiltered(results);
    setCurrentPage(1); // Reset to first page on new search
  }, [searchQuery, adminUsers]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this admin user?")) {
      try {
        await axios.delete(`/admin-users/${id}`);
        showAlert("Admin user deleted successfully");
        loadAdminUsers();
      } catch (err) {
        showAlert(err?.response?.data?.message || "Failed to delete", "error");
      }
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleFormSuccess = (userData) => {
    // Update the local state with the new/updated user data
    if (selectedUser) {
      // Update existing user
      setAdminUsers(prev => prev.map(user => 
        user._id === selectedUser._id ? { ...user, ...userData } : user
      ));
      setFiltered(prev => prev.map(user => 
        user._id === selectedUser._id ? { ...user, ...userData } : user
      ));
    } else {
      // Add new user
      setAdminUsers(prev => [...prev, userData]);
      setFiltered(prev => [...prev, userData]);
    }
    
    showAlert(selectedUser ? "Admin user updated successfully" : "Admin user created successfully");
    setSelectedUser(null);
    setShowForm(false);
  };

  // Pagination logic
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  console.log("paginated--",paginated)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {alert.show && (
            <Alert message={alert.message} type={alert.type} onClose={() => setAlert({ show: false })} />
          )}

          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Admin User Management 👥
                  </h1>
                  <p className="text-gray-600">
                    Manage admin users and their permissions
                  </p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 rounded-full">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <h2 className="text-lg font-semibold text-gray-800">Search & Actions</h2>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, phone, or type"
                    className="px-4 py-2 border rounded-md text-sm"
                  />
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setShowForm(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add New Admin User
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                <span className="ml-3 text-gray-600">Loading admin users...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <p className="text-gray-500 text-lg font-medium">No admin users found</p>
                <p className="text-gray-400 text-sm">Start by adding your first admin user</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginated.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="text-gray-900">{user.email}</div>
                            
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.type === 'superadmin' ? 'bg-red-100 text-red-800' :
                            user.type === 'admin' ? 'bg-blue-100 text-blue-800' :
                            user.type === 'manager' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {formatUserType(user.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.companyId?.name || "Not assigned"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md hover:bg-indigo-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(user._id)}
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
                  Showing page {currentPage} of {totalPages} ({totalItems} total admin users)
                </div>
                <div className="flex space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
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
        </div>
      </div>

      {showForm && (
        <AdminUserForm
          selectedUser={selectedUser}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setSelectedUser(null);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminUserList;
