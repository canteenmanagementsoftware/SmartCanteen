import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosConfig";

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

const fmtIST = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(d);
};

const UserLogs = ({ user, logs }) => {
  console.log("logs", logs);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  // const [logs, setLogs] = useState([]);

  // useEffect(() => {
  //   const fetchLogs = async () => {
  //     if (!userId) return;
  //     try {
  //       const res = await axios.get(`/api/users/${userId}/logs`);
  //       setLogs(res.data || []);
  //     } catch (err) {
  //       console.error("Error fetching logs:", err);
  //       setLogs([]);
  //     }
  //   };
  //   fetchLogs();
  // }, [userId]);

  if (!logs) {
    return (
      <div className="text-center text-gray-500 py-8">
        No activity logs found
      </div>
    );
  }

  return (
    <div className="space-y-6 m-7">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        User Activity Logs
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Unique Id</th>
              <th className="border p-2">User</th>
              <th className="border p-2">User Type</th>
              <th className="border p-2">Package</th>
              <th className="border p-2">Meal Type</th>
              <th className="border p-2">Location</th>
              <th className="border p-2">Log Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : initialized && logs.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center">
                  No data found
                </td>
              </tr>
            ) : (
              logs.map((m) => (
                <tr>
                  <td className="border p-2">{user._id || "-"}</td>
                  <td className="border p-2">
                    {`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                      "-"}
                  </td>
                  <td className="border p-2">{user.role || "-"}</td>
                  <td className="border p-2">{m.packageName || "-"}</td>
                  <td className="border p-2">{m.mealType || "-"}</td>
                  <td className="border p-2">{m.location || "-"}</td>
                  <td className="border p-2">{fmtIST(m.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserLogs;
