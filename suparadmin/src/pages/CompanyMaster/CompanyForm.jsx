// File: src/components/CompanyForm.jsx
import React, { useState, useEffect } from "react";
import axios from "../../utils/axiosConfig";

const BASE_URL = "http://localhost:5000";

const CompanyForm = ({ selectedCompany, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    logo: null,
    contactNumber: "",
    address: "",
    isActive: true, 
    collectionType: "face",
  });

  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (selectedCompany) {
      setFormData({
        name: selectedCompany.name || "",
        email: selectedCompany.email || "",
        contactNumber: selectedCompany.contactNumber || "",
        address: selectedCompany.address || "",
        logo: null,
        isActive: selectedCompany?.isActive ?? true,
        collectionType: selectedCompany?.collectionType || "face", 
      });
      
      // Set preview URL for existing company logo
      if (selectedCompany.logo) {
        const fullLogoUrl = selectedCompany.logo.startsWith('http') 
          ? selectedCompany.logo 
          : `${BASE_URL}${selectedCompany.logo}`;
        setPreviewUrl(fullLogoUrl);
      } else {
        setPreviewUrl("");
      }
    }
  }, [selectedCompany]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateFile = (file) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSize = 5 * 1024 * 1024;
    if (!validTypes.includes(file.type)) {
      setApiError("Only PNG or JPG images are allowed");
      return false;
    }
    if (file.size > maxSize) {
      setApiError("File size must be under 5MB");
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      const file = files[0];
      if (file && validateFile(file)) {
        // Revoke previous blob URL if it exists
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
        
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setFormData((prev) => ({ ...prev, logo: file }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setApiError(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return setApiError("Company name is required"), false;
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return setApiError("Enter a valid email"), false;
    if (!/^\d{10}$/.test(formData.contactNumber))
      return setApiError("Contact number must be 10 digits"), false;
    if (!formData.address.trim()) return setApiError("Address is required"), false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);

    try {
      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if(key === "logo") return; 
        if (value != null && value !== "") {
          submitData.append(key, value);
        }
      });
      if (formData.logo instanceof File) {
        submitData.append("logo", formData.logo);
      }
      


      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
        timeout: 30000,
      };

      const url = selectedCompany ? `/company/${selectedCompany._id}` : "/company";
      const method = selectedCompany ? "PUT" : "POST";

      const response = await axios({
        method,
        url,
        data: submitData,
        ...config,
        
      });

      onSuccess(response.data);
    } catch (err) {
      const status = err.response?.status;
      let message = err.response?.data?.message || err.message || "An error occurred";
      if (status === 500) message = "Server error occurred. Please try again later.";
      if (status === 413) message = "Image is too large. Please select one under 5MB.";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">
            {selectedCompany ? "Edit Company" : "Add New Company"}
          </h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">×</button>
        </div>



        {apiError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-md font-medium text-gray-700 mb-3">Company Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Company Name" className="w-full p-2 border rounded-md" required />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Company Email" className="w-full p-2 border rounded-md" required />
              <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="Contact Number" className="w-full p-2 border rounded-md" required />
            </div>
            <div className="mt-4">
              <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Full Address" rows="3" className="w-full p-2 border rounded-md" required />
            </div>
            <div>
              <label className="block text-md text-gray-700 font-medium mb-3">Meal Collection Method</label>
              <select
                name="collectionType"
                value={formData.collectionType}
                onChange={handleChange}
                className="w-70 p-2 border rounded-md"
                required
              >
                <option value="face">By the Face</option>
                <option value="card">By the Card</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-24 h-24 border rounded-lg overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Company Logo"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                  console.error('Preview image failed to load:', previewUrl);
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="h-full w-full bg-gray-200 flex items-center justify-center"><span class="text-gray-500 text-xs">Error loading</span></div>';
                  }}
                />
              ) : (
                <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No logo</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-purple-700">
                Choose Logo
                <input type="file" name="logo" onChange={handleChange} accept=".png,.jpg,.jpeg" className="hidden" />
              </label>
              <p className="mt-1 text-sm text-gray-500">Accepted formats: PNG, JPG. Max file size: 5MB</p>
            </div>
          </div>
          <div className="flex items-center justify-start space-x-3">
            <label className="text-gray-700 font-medium">Status:</label>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                formData.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`
              }
            >
              {formData.isActive ? "Active" : "Inactive"}
             </button>
           </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100" disabled={isSubmitting}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className={`px-4 py-2 text-white rounded-md ${isSubmitting ? "bg-purple-400" : "bg-purple-600 hover:bg-purple-700"}`}>
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"></path>
                  </svg>
                  {selectedCompany ? "Updating..." : "Creating..."}
                </>
              ) : selectedCompany ? "Update Company" : "Create Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;