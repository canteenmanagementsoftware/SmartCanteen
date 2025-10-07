import { useEffect, useState, useMemo } from "react";
import DataTable from "react-data-table-component";
import { CSVLink } from "react-csv";
import axios from "../../utils/axiosConfig";
import TaxProfileForm from "./TaxProfileForm";

// Simple Modal Component
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

const TaxProfileList = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/taxprofile");
      const list = Array.isArray(res.data) ? res.data : res.data?.data;
      setProfiles(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || "Failed to load tax profiles");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tax profile?"))
      return;

    try {
      await axios.delete(`/taxprofile/${id}`);
      fetchData();
    } catch (err) {
      alert(err?.message || "Failed to delete tax profile");
    }
  };

  const handleCreateOrUpdate = async (payload) => {
    try {
      if (editData?._id) {
        await axios.put(`/taxprofile/${editData._id}`, payload);
      } else {
        await axios.post(`/taxprofile`, payload);
      }
      await fetchData();
      setShowForm(false);
      setEditData(null);
    } catch (err) {
      throw err; // let form show error
    }
  };

  const columns = useMemo(
    () => [
      { name: "Sr No", selector: (_, index) => index + 1, sortable: true },
      {
        name: "Tax Profile",
        selector: (row) => row.taxProfile,
        sortable: true,
      },
      {
        name: "Tax Percentage",
        selector: (row) => row.taxPercentage,
        sortable: true,
      },
      {
        name: "Action",
        cell: (row) => (
          <div className="space-x-2">
            <button
              onClick={() => {
                setEditData(row);
                setShowForm(true);
              }}
              className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(row._id)}
              className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const csvHeaders = [
    { label: "Tax Profile", key: "taxProfile" },
    { label: "Tax Percentage", key: "taxPercentage" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tax Profile List</h2>
        <div className="flex gap-3">
          <CSVLink
            filename="tax_profiles.csv"
            data={profiles}
            headers={csvHeaders}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Export CSV
          </CSVLink>
          <button
            onClick={() => {
              setEditData(null);
              setShowForm(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add New
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {/* Modal for Form */}
      {showForm && (
        <Modal
          onClose={() => {
            setShowForm(false);
            setEditData(null);
          }}
        >
          <TaxProfileForm
            initialData={editData}
            onSuccess={handleCreateOrUpdate}
            onCancel={() => {
              setShowForm(false);
              setEditData(null);
            }}
          />
        </Modal>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={profiles}
        progressPending={loading}
        pagination
        highlightOnHover
        striped
        persistTableHead
        noDataComponent={
          <div className="text-center py-6">
            There are no records to display
          </div>
        }
      />
    </div>
  );
};

export default TaxProfileList;
