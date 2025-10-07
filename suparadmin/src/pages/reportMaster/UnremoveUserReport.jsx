import React, { useEffect, useState, useContext } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";

const UnremovedUserReport = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [unremovedCount, setUnremovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUnremovedUsers = async () => {
    try {
      setLoading(true);
      let res;
      
      // If user is not superadmin, filter by their company
      if (currentUser?.userType !== 'superadmin' && currentUser?.companyId) {
        res = await axios.get(`/reports/unremoved-users?companyId=${currentUser.companyId}`);
      } else {
        res = await axios.get("/reports/unremoved-users");
      }
      
      setUsers(res.data.users || []); 
      setUnremovedCount(res.data.unremovedCount || 0);
      setError("");
    } catch (error) {
      setError("Failed to fetch user data.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUsers = async () => {
    try {
      const res = await axios.post("/reports/remove-unremoved-users");
      alert(res.data.message || "Users removed successfully.");
      fetchUnremovedUsers();
    } catch (error) {
      alert("Error removing users.");
    }
  };

  useEffect(() => {
    fetchUnremovedUsers();
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold text-gray-700">
          Unremoved Users: {unremovedCount}
        </div>
        <button
          onClick={handleRemoveUsers}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow"
        >
          REMOVE USERS
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading data...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No unremoved user data found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border p-2">USER</th>
                <th className="border p-2">UNIQUE NUMBER</th>
                <th className="border p-2">PLACE</th>
                <th className="border p-2">LOCATION</th>
                <th className="border p-2">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{user.userName || "-"}</td>
                  <td className="border p-2">{user.uniqueNumber || "-"}</td>
                  <td className="border p-2">{user.place || "-"}</td>
                  <td className="border p-2">{user.location || "-"}</td>
                  <td className="border p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {user.status || "Unknown"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UnremovedUserReport;
