import React, { useState, useEffect } from "react";
import axios from "../../utils/axiosConfig";
import TexForm from "./TexForm";

// Simple Modal
const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="bg-white rounded shadow-lg p-6 min-w-[350px] relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
        aria-label="Close"
      >
        ×
      </button>
      {children}
    </div>
  </div>
);

const TexList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [texList, setTexList] = useState([]);              // ← no hardcoded data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);          // (keep for future edit)

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/taxes");
      setTexList(res.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load taxes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tax?")) return;
    try {
      await axios.delete(`/taxes/${id}`);
      fetchTaxes(); // always sync with DB
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Delete failed");
    }
  };

  // Optional: hide Edit until PUT implemented
  // const handleUpdate = async (updated) => { ... }

  const filteredList = texList.filter((tex) =>
    tex.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Tax Master List</h2>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            onClick={() => { setEditData(null); setShowForm(true); }}
          >
            + Add New
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {loading ? "Loading…" : error ? <span className="text-red-600">{error}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Search:</span>
            <input
              type="text"
              className="border border-gray-300 rounded px-3 py-1 text-sm w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Sr No.</th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Tax Name</th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Is Active</th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length > 0 ? (
                filteredList.map((tex, index) => (
                  <tr key={tex._id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 text-sm">{index + 1}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">{tex.name}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${tex.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {tex.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm space-x-2">
                      {/* Edit ko baad me enable karo jab PUT ready ho */}
                      {/* <button
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs"
                        onClick={() => { setEditData(tex); setShowForm(true); }}
                      >Edit</button> */}
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                        onClick={() => handleDelete(tex._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    {loading ? "Loading…" : "No results found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <Modal onClose={() => { setShowForm(false); setEditData(null); }}>
          <TexForm
            initialData={editData}
            onSuccess={() => { setShowForm(false); setEditData(null); fetchTaxes(); }}
            onCancel={() => { setShowForm(false); setEditData(null); }}
          />
        </Modal>
      )}
    </div>
  );
};

export default TexList;
