import React, { useState, useEffect } from "react";
import axios from "../../utils/axiosConfig";

const TexForm = ({ initialData, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({ name: "", isActive: true });
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setFormData({ name: "", isActive: true });
    }
    setError("");
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      return setError("Tax Name is required");
    }
    try {
      const payload = { name: formData.name.trim(), isActive: !!formData.isActive };
      await axios.post("/taxes", payload);
      onSuccess?.(); // sirf signal, parent refetch karega
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Error saving tax");
    }
  };

  return (
    <div className="bg-white p-6 shadow rounded-md space-y-4">
      <h2 className="text-lg font-bold">{initialData ? "Edit" : "Add"} Tax</h2>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Enter Tax Name"
        className="w-full border px-4 py-2 rounded"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
        />
        Is Active
      </label>
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Save</button>
        {onCancel && (
          <button onClick={onCancel} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancel</button>
        )}
      </div>
    </div>
  );
};

export default TexForm;
