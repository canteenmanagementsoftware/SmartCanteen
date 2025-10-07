import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "../../utils/axiosConfig";
import PackageInfo from "./PackageInfo";
import UserLogs from "./UserLogs";
import UserFees from "./UserFees";

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

const UserDetailPanel = ({
  user,
  onClose,
  onEdit,
  markAllPaid,
  onMarkPaid,
}) => {
  // console.log("useEffect", user);
  const [activeTab, setActiveTab] = useState("details");

  // 🔁 Keep a local copy so we can refresh after adding a package
  const [userDoc, setUserDoc] = useState(user);

  const handleFeeDeletedLocal = ({ feeId }) => {
  setUserDoc((prev) => {
    const prevFees = Array.isArray(prev?.fees) ? prev.fees : [];
    return {
      ...prev,
      feeId: prev.feeId === feeId ? null : prev.feeId,
      isFeePaid: false,            // so rows will show "pending"
      fees: prevFees.filter((f) => String(f?._id) !== String(feeId)),
      // 🔸 DO NOT touch prev.packages — keep them as-is so rows stay visible
    };
  });
};


const handleMarkAllPaidLocal = async (u) => {
   // 🔹 OPTIMISTIC: flip UI immediately
   const prevIsFeePaid = userDoc?.isFeePaid;
   const prevFees = userDoc?.fees;
   setUserDoc((prev) => ({
     ...prev,
     isFeePaid: true,
     // if you also want each fee badge to show Paid immediately:
     fees: (prev?.fees || []).map((f) => ({ ...f, status: "paid" })),
   }));
   try {
     await markAllPaid?.(u); // server call
   } catch (e) {
     // 🔁 rollback on failure
     setUserDoc((prev) => ({ ...prev, isFeePaid: prevIsFeePaid, fees: prevFees }));
     console.error(e);
     alert(e?.response?.data?.message || "Failed to mark as paid.");
   }
 };

  useEffect(() => {
    setUserDoc(user);
  }, [user]);

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "details", label: "User Detail", icon: "👤" },
    { id: "package", label: "Package", icon: "📦" },
    { id: "user-logs", label: "User Logs", icon: "📋" },
    { id: "fees", label: "Fees", icon: "💰" },
  ];

const handleFeeCreatedLocal = ({ userId, feeId, fee }) => {
  setUserDoc((prev) => {
    const prevFees = Array.isArray(prev?.fees) ? prev.fees : [];
    return {
      ...prev,
      feeId: feeId || prev.feeId,       // Mark All as Paid ko enable karega
      fees: fee ? [fee, ...prevFees] : prevFees,
      isFeePaid: false,                 // creation par paid mat karo
    };
  });
};



  // 👉 Logs only (package tab ke liye koi extra fetch zaroori nahi;
  // PackageInfo userDoc.packages se render karega)
  useEffect(() => {
    let isMounted = true;
    if (!userDoc?._id) return;

    const fetchLogs = async () => {
      if (activeTab !== "user-logs") return;
      try {
        setIsLoading(true);
        const response = await axios.get(`/meal/history/${userDoc._id}`);
        if (isMounted) setLogs(response.data.data || []);
      } catch (err) {
        console.error("Error loading user logs:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [activeTab, userDoc?._id]);

  // 🧩 AddPackage: PackageInfo yeh call karega
  const handleAddPackage = async (uId, payload) => {
    // payload = { companyId, placeId, locationId, packageId, startDate, endDate }
    // (optional client validation)
    if (!payload.startDate || !payload.endDate) {
      return alert("Start/End date required");
    }
    if (new Date(payload.startDate) > new Date(payload.endDate)) {
      return alert("End date must be on/after Start date");
    }

    try {
      const { data } = await axios.post(`/usermaster/${uId}/packages`, payload);
      setUserDoc(data?.user || data);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to add package");
    }
  };

  // 🗑️ Bulk delete: all active assignments
  const handleDeleteAllActive = async (uId, assignmentIds = []) => {
    if (!uId) return;
    if (!assignmentIds.length) {
      return alert("No active packages to delete.");
    }
    const ok = window.confirm(
      `Delete ${assignmentIds.length} active package(s)?`
    );
    if (!ok) return;
    try {
      // hit existing single-delete endpoint in parallel
      await Promise.all(
        assignmentIds.map((aid) =>
          axios.delete(`/usermaster/${uId}/packages/${aid}`)
        )
      );
      // refresh the user so UI stays in sync
      const { data } = await axios.get(`/usermaster/${uId}`);
      setUserDoc(data?.user || data);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to delete active packages");
    }
  };

  // 🗑️ Delete single assignment
  const handleDeleteAssignment = async (row) => {
    if (!row?.userId || !row?.assignmentId) return;
    if (
      !window.confirm(
        `Delete package "${row.packageName}" for ${row.userName}?`
      )
    )
      return;
    try {
      const { data } = await axios.delete(
        `/usermaster/${row.userId}/packages/${row.assignmentId}`
      );
      // server returns shaped user
      setUserDoc(data?.user || data);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to delete package");
    }
  };

  const renderTab = () => {
    if (isLoading) {
      return (
        <div className="p-4 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      );
    }

    switch (activeTab) {
      case "details": {
        const details = [
          {
            key: "name",
            label: "Name",
            value: `${userDoc.firstName} ${userDoc.middleName || ""} ${
              userDoc.lastName
            }`.trim(),
          },
          { key: "email", label: "Email", value: userDoc.email },
          { key: "mobile", label: "Mobile", value: userDoc.mobileNo },
          {
            key: "status",
            label: "Status",
            value: userDoc.isActive ? "Active" : "Inactive",
          },
          {
            key: "dob",
            label: "Date of Birth",
            value: formatDateTime(userDoc.dateOfBirth),
          },
          { key: "city", label: "City", value: userDoc.city },
          { key: "state", label: "State", value: userDoc.state },
          { key: "address", label: "Address", value: userDoc.address },
        ];
        return (
          <div className="p-4 space-y-2">
            {details.map((d) => (
              <div
                key={d.key}
                className={d.key === "name" ? "font-semibold" : ""}
              >
                {d.label}: {d.value}
              </div>
            ))}
          </div>
        );
      }
      case "package":
        // 👇 New model: PackageInfo internally flattens userDoc.packages
        return (
          <PackageInfo
            user={userDoc}
            onAddPackage={handleAddPackage} // ⭐ pass handler
            onDeleteAssignment={handleDeleteAssignment}
            onDeleteAllActive={handleDeleteAllActive}
          />
        );
      case "user-logs":
        return <UserLogs user={userDoc} logs={logs} />;
      case "fees":
        return (
          <UserFees
            markAllPaid={handleMarkAllPaidLocal}
            user={userDoc}
            onMarkPaid={onMarkPaid}
            onFeeCreated={handleFeeCreatedLocal}
            onFeeDeleted={handleFeeDeletedLocal}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[100%] bg-white shadow-lg z-50 overflow-y-auto">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">
            {userDoc.firstName} {userDoc.lastName}
          </h2>
          <p className="text-sm text-gray-500">{userDoc.email}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-red-600 text-xl"
        >
          ×
        </button>
      </div>

      <div className="flex border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-500"
            }`}
          >
            {tab.label} <span className="mr-2">{tab.icon}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">{renderTab()}</div>

      <div className="p-4 border-t">
        <button
          onClick={() => onEdit(userDoc)}
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Edit User
        </button>
      </div>
    </div>
  );
};

UserDetailPanel.propTypes = {
  user: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onMarkPaid: PropTypes.func,
  markAllPaid: PropTypes.func,
};

export default UserDetailPanel;
