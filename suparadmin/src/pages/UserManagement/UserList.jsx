import React, { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import UserForm from "./UserForm";
import UserDetailPanel from "../../components/user/UserDetailPanel";
import PackageForm from "../PackageManagement/PackageForm";
import UserDetail from "../../components/user/UserDetail";
import PackageInfo from "../../components/user/PackageInfo";
import UserLogs from "../../components/user/UserLogs";
import Fees from "../../components/user/UserFees";
import { AuthContext } from "../../context/auth-context";

const UserList = ({ role }) => {
  let [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("user-detail");
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const usersPerPage = 10;
  const { user: currentUser } = useContext(AuthContext);
  // NEW state (usersPerPage ke upar/neeche kahin bhi rakh sakte ho)
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState(""); // selected locationId string
  const isCollector = currentUser?.userType === "meal_collector";
  const [openFromPanel, setOpenFromPanel] = useState(false);

  useEffect(() => {
    loadUsers();
    loadLocations();
  }, []);

  const markAllPaid = async (user) => {
    try {
      await axios.put(`/fees/${user.feeId}`, { status: "paid" });
      // optimistic list update (optional)
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isFeePaid: true } : u))
      );
      handleFeePaid && handleFeePaid();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to mark as paid.");
    }
  };

  const loadLocations = async () => {
    try {
      const res = await axios.get("/locations");
      // console.log("response--", res.data);
      const data = Array.isArray(res.data.data)
        ? res.data.data
        : res.data?.data?.locations || [];
      setLocations(data);

      // Optional: agar collector sirf 1 location ko allowed ho to preselect karo
      if (isCollector) {
        const allowed = Array.isArray(currentUser.locationId)
          ? currentUser.locationId.map(String)
          : [];
        if (allowed.length === 1) setLocation(allowed[0]);
      }
    } catch (e) {
      console.error("Failed to load locations", e);
      setLocations([]);
    }
  };

  const loadLogs = async (userId = null) => {
    try {
      setLoading(true);
      // 👉 Agar per-user logs chahiye toh userId pass karo; warna saare logs aayenge
      const res = await axios.get("/meal/history", {
        params: userId ? { userId } : {},
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.logs || [];
      console.log(data);
      setLogs(data);
    } catch (err) {
      console.error("Error loading logs:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    console.log("paid");
    setLoading(true);
    try {
      const res = await axios.get("/usermaster/all");
      const userData = Array.isArray(res.data) ? res.data : [];
      console.log("userData--", userData);
      setUsers(userData);
      setError(null);
    } catch (err) {
      setUsers([]);
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserInList = (updatedUser) => {
    setUsers((prev) =>
      prev.map((u) =>
        u._id === updatedUser._id ? { ...u, ...updatedUser } : u
      )
    );
  };

  const handleFeeCreated = ({ userId, feeId, fee }) => {
    setUsers((prev) =>
      prev.map((u) =>
        u._id === userId
          ? {
              ...u,
              feeId,
              fees: fee
                ? [fee, ...(Array.isArray(u.fees) ? u.fees : [])]
                : u.fees,
            }
          : u
      )
    );
  };

  const handleAdd = async (newUser) => {
    try {
      const formData = new FormData();
      const required = [
        "firstName",
        "lastName",
        "email",
        "role",
        "uniqueId",
        "dateOfBirth",
        "address",
        "state",
        "city",
        "mobileNo",
        "companyId",
        "placeId",
        "locationId",
        "packageId",
        "batchesId",
        "startDate",
        "endDate",
        "photo",
        "bloodGroup",
        "cardNumber",
      ];

      // dataURL → Blob (agar webcam se aaya ho)
      if (
        typeof newUser.photo === "string" &&
        newUser.photo.startsWith("data:image")
      ) {
        const res = await fetch(newUser.photo);
        const blob = await res.blob();
        formData.append("photo", blob, `webcam_${Date.now()}.jpg`);
      }

      for (const key of required) {
        const value = newUser[key];
        if (value == null) continue;

        if (key === "photo") {
          // agar upar dataURL handle ho chuka hai to skip; warna File to direct
          if (value instanceof File) formData.append("photo", value);
          continue;
        }

        if (key === "batchesId" && Array.isArray(value)) {
          value.forEach((id) => formData.append("batchesId", id));
        } else {
          formData.append(key, value);
        }
      }

       // ✅ yeh block axios.post se *pehle*
    console.log('--- CREATE: FormData check ---');
    const ph = formData.get('photo');
    console.log('FD.has file?', !!ph);
    if (ph) {
      console.log('photo instanceof File?', ph instanceof File);
      console.log('photo name/type/size:', ph.name, ph.type, ph.size);
    }
    for (const [k, v] of formData.entries()) {
      console.log(k, v instanceof File ? `(File ${v.name}, ${v.type}, ${v.size}b)` : v);
    }

      const res = await axios.post("/usermaster", formData,{
      headers: { 'Content-Type': 'multipart/form-data' }
    });
      if (res.data) {
        await loadUsers();
        setShowForm(false);
        setSelectedUser(null);
      }
    } catch (err) {
    const data = err.response?.data;
  if (data?.errors && typeof data.errors === "object") {
    const list = Object.entries(data.errors)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    alert(`${data.message || "Validation failed"}\n${list}`);
  } else {
    alert(data?.message || "Error creating user");
  }
}
  };

  const handleUpdate = async (updatedUser) => {
    try {
    if (!updatedUser?._id) {
      alert("Update failed: missing user id");
      return;
    }
    const formData = new FormData();

    if (typeof updatedUser.photo === "string" && updatedUser.photo.startsWith("data:image")) {
      const res = await fetch(updatedUser.photo);
      const blob = await res.blob();
      formData.append("photo", blob, `webcam_${Date.now()}.jpg`);
    }

      const allowed = [
        "firstName",
        "lastName",
        "uniqueId",
        "address",
        "state",
        "city",
        "mobileNo",
        "email",
        "role",
        "isFeePaid",
        "isActive",
        "batchesId",
        "dateOfBirth",
        "bloodGroup",
        "cardNumber",
        "photo",
      ];

      // 👇 convert dataURL → Blob if needed
      if (
        typeof updatedUser.photo === "string" &&
        updatedUser.photo.startsWith("data:image")
      ) {
        const res = await fetch(updatedUser.photo);
        const blob = await res.blob();
        formData.append("photo", blob, `webcam_${Date.now()}.jpg`);
      }

      for (const k of allowed) {
        if (updatedUser[k] === undefined || updatedUser[k] === null) continue;

        // skip photo if we already handled string-above case
        if (
          k === "photo" &&
          typeof updatedUser.photo === "string" &&
          updatedUser.photo.startsWith("data:image")
        ) {
          continue;
        }

        if (k === "photo" && updatedUser[k] instanceof File) {
          formData.append("photo", updatedUser[k]); // actual file
        } else if (k === "batchesId" && Array.isArray(updatedUser[k])) {
          updatedUser[k].forEach((id) => formData.append("batchesId", id));
        } else {
          formData.append(k, updatedUser[k]);
        }
      }

      // ✅ axios.put se *pehle*
    console.log('--- UPDATE: FormData check ---');
    const ph = formData.get('photo');
    console.log('FD.has file?', !!ph);
    if (ph) {
      console.log('photo instanceof File?', ph instanceof File);
      console.log('photo name/type/size:', ph.name, ph.type, ph.size);
    }
    for (const [k, v] of formData.entries()) {
      console.log(k, v instanceof File ? `(File ${v.name}, ${v.type}, ${v.size}b)` : v);
    }
const res = await axios.put(`/usermaster/${updatedUser._id}`, formData);
      if (res.data?.user) {
        updateUserInList(res.data.user);
        setShowForm(false);
        setSelectedUser(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error updating user");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`/usermaster/${id}`);
      await loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting user");
    }
  };

  const handleFeePaid = async () => {
    await loadUsers();
  };

  const handlePackageUpdate = async () => {
    await loadUsers();
    setShowPackageForm(false);
    setSelectedUser(null);
  };

  const handleViewUser = (user) => {
    console.log("check fee id", user);
    setSelectedUser(user);
    setShowDetailPanel(true);
  };

  const handleTabChange = async (tabId) => {
    setActiveTab(tabId);
    if (tabId === "user-logs") {
      // Agar specific user ke logs chahiye:
      const uid = selectedUser?._id || null;
      await loadLogs(uid);
    }
  };

  if (currentUser.userType === "manager") {
    users = users.filter((e) => {
      return e.companyId.name === currentUser.companyName;
    });
  }

  if (currentUser.userType === "admin") {
    users = users.filter((e) => {
      return e.placeId.name == currentUser.placeId.name;
    });
  }

  if (currentUser.userType === "meal_collector") {
    users = users.filter((e) => {
      return currentUser.locationId.includes(e.locationId._id);
    });
  }

  const filteredUsers = users.filter(
    (u) =>
      u &&
      u._id &&
      (u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.mobileNo?.includes(searchQuery))
  );

  // Role-scope (manager/admin/collector restrictions)
  const roleScopedUsers = React.useMemo(() => {
    let base = users;
    if (currentUser.userType === "manager") {
      base = base.filter((e) => e?.companyId?.name === currentUser.companyName);
    } else if (currentUser.userType === "admin") {
      base = base.filter(
        (e) => e?.placeId?.name === currentUser?.placeId?.name
      );
    } else if (currentUser.userType === "meal_collector") {
      const allowed = Array.isArray(currentUser.locationId)
        ? currentUser.locationId.map(String)
        : [];
      base = base.filter((e) => allowed.includes(String(e?.locationId?._id)));
    }
    return base;
  }, [users, currentUser]);

  // Location dropdown selection
  const locationScopedUsers = React.useMemo(() => {
    if (!location) return roleScopedUsers; // "All Locations"
    return roleScopedUsers.filter(
      (u) => String(u?.locationId?._id) === String(location)
    );
  }, [roleScopedUsers, location]);

  // Search (name/uniqueId/mobile)
  const visibleUsers = React.useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    return locationScopedUsers.filter((u) => {
      if (!u || !u._id) return false;
      const f = (u.firstName || "").toLowerCase();
      const l = (u.lastName || "").toLowerCase();
      const id = (u.uniqueId || "").toLowerCase();
      const mob = u.mobileNo || "";
      return (
        f.includes(q) ||
        l.includes(q) ||
        id.includes(q) ||
        mob.includes(searchQuery)
      );
    });
  }, [locationScopedUsers, searchQuery]);

  // console.log("visibleUsers, currentPage, usersPerPage", visibleUsers, currentPage, usersPerPage);
  const currentUsersData = React.useMemo(() => {
    const start = (currentPage - 1) * usersPerPage;
    return visibleUsers.slice(start, start + usersPerPage);
  }, [visibleUsers, currentPage, usersPerPage]);

  const totalPages = Math.ceil(visibleUsers.length / usersPerPage);

  console.log("currentUsersData:",currentUsersData)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    User Management 👥
                  </h1>
                  <p className="text-gray-600">
                    Manage users, packages, and fees for your organization
                  </p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-full">
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  Actions & Search
                </h2>
                <div className="flex gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name, employee code, or contact..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-4 py-2 pl-10 border rounded-md shadow-sm text-sm text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <select
                    key={`location-${locations.length}-${location || "all"}`}
                    value={location || ""}
                    onChange={(e) => {
                      if (isCollector) return; // lock for collector
                      setCurrentPage(1); // new filter pe page 1
                      setLocation(String(e.target.value || ""));
                    }}
                    disabled={isCollector}
                    autoComplete="off"
                    className={`border w-50 p-2 rounded ${
                      isCollector ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="">All Locations</option>

                    {/* collector ke liye: agar preselected id options list me na ho to fallback dikhao */}
                    {isCollector &&
                      location &&
                      !locations.some(
                        (l) => String(l._id) === String(location)
                      ) && <option value={location}>Selected Location</option>}

                    {locations.map((l) => (
                      <option key={String(l._id)} value={String(l._id)}>
                        {l.locationName || l.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setShowForm(true);
                      setShowDetailPanel(false);
                      setOpenFromPanel(false);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
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
                    Add New User
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-6">
            {/* <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                {[
                  { id: "user-detail", name: "User Detail", icon: "👤" },
                  { id: "package", name: "Package", icon: "📦" },
                  { id: "user-logs", name: "User Logs", icon: "📋" },
                  { id: "fees", name: "Fees", icon: "💰" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-purple-500 text-purple-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => handleTabChange(tab.id)}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div> */}

            {/* Tab Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  <span className="ml-3 text-gray-600">Loading users...</span>
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
              ) : (
                <>
                  {activeTab === "user-detail" && (
                    <UserDetail
                      users={currentUsersData}
                      onEdit={(u) => {
                        setSelectedUser(u);
                        setShowForm(true);
                        setOpenFromPanel(false);
                      }}
                      onDelete={handleDelete}
                      onView={handleViewUser}
                    />
                  )}

                  {/* {activeTab === "package" && (
                    <PackageInfo
                      users={users}
                      onAddPackage={() => {
                        setSelectedUser(null);
                        setShowPackageForm(true);
                      }}
                      onEditPackage={(u) => {
                        setSelectedUser(u);
                        setShowPackageForm(true);
                      }}
                      onDeleteUser={handleDelete}
                      onPackageUpdate={handlePackageUpdate}
                    />
                  )}

                  {activeTab === "user-logs" && <UserLogs logs={logs} />}

                  {activeTab === "fees" && (
                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Company
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Location
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Package
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-4" />
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((u) => (
                            <Fees
                              key={`fees-${u._id}`}
                              user={u}
                              onMarkPaid={handleFeePaid}
                              onFeeCreated={handleFeeCreated}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )} */}
                </>
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} (
                  {visibleUsers.length} total users)
                </div>

                <div className="flex space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
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

      {showDetailPanel && selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => {
            setShowDetailPanel(false);
            setSelectedUser(null);
          }}
          markAllPaid={markAllPaid}
          onEdit={(u) => {
            setOpenFromPanel(true);
            setSelectedUser(u);
            setShowForm(true);
            setShowDetailPanel(false);
          }}
          onMarkPaid={handleFeePaid}
        />
      )}

      {showPackageForm && (
        <PackageForm
          selectedPackage={selectedUser}
          onSuccess={handlePackageUpdate}
          onCancel={() => {
            setShowPackageForm(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showForm && (
        <UserForm
          user={selectedUser}
          hidePackage={openFromPanel}
          onSubmit={selectedUser ? handleUpdate : handleAdd}
          onClose={() => {
            setShowForm(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserList;
