import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import { AuthContext } from '../../context/auth-context';

const PlaceForm = ({ selectedPlace, onSuccess, onCancel }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gst_no: '',
    fssai_no: '',
    pan_no: '',
    company: '',
    isActive: true
  });

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
   
    if (selectedPlace) {
      setFormData({
        name: selectedPlace.name || '',
        description: selectedPlace.description || '',
        gst_no: selectedPlace.gst_no || '',
        fssai_no: selectedPlace.fssai_no || '',
        pan_no: selectedPlace.pan_no || '',
        company: selectedPlace.company?._id || selectedPlace.company || '',
        isActive: selectedPlace.isActive ?? true
      });
    }
  }, [selectedPlace]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get('/company');
        setCompanies(Array.isArray(res.data) ? res.data : []);
        
        // If current user is admin, automatically set their company
        if (currentUser?.userType === 'admin' && currentUser?.companyId) {
          setFormData(prev => ({ ...prev, company: currentUser.companyId }));
        }
      } catch (err) {
        setCompanies([]);
      }
    };
    fetchCompanies();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.company) errors.push('Company is required');
    if (formData.gst_no && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_no)) errors.push('Invalid GST number format');
    if (formData.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_no)) errors.push('Invalid PAN number format');
    if (formData.fssai_no && !/^[0-9]{14}$/.test(formData.fssai_no)) errors.push('Invalid FSSAI number format');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errors = validateForm();
    if (errors.length) {
      setError(errors.join(', '));
      return;
    }

    setLoading(true);
    try {
      if (selectedPlace) {
        await axios.put(`/places/${selectedPlace._id}`, formData);
      } else {
        await axios.post('/places', formData);
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-16 mx-auto p-6 w-[700px] bg-white rounded-md shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">{selectedPlace ? 'Edit Place' : 'Add New Place'}</h2>
          <button onClick={onCancel} className="text-gray-500 text-xl font-bold hover:text-gray-700">×</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Company dropdown - show for superadmin and admin */}
            {(currentUser?.userType === 'superadmin' || currentUser?.userType === 'admin') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
                <select
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  required
                  disabled={currentUser?.userType === 'admin'} // Disable for admin users
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>{company.name}</option>
                  ))}
                </select>
                {currentUser?.userType === 'admin' && (
                  <p className="text-xs text-gray-500 mt-1">Your company is automatically selected</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST No</label>
              <input
                type="text"
                name="gst_no"
                value={formData.gst_no}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="27AAPFU0939F1ZV"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FSSAI No</label>
              <input
                type="text"
                name="fssai_no"
                value={formData.fssai_no}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="14-digit number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN No</label>
              <input
                type="text"
                name="pan_no"
                value={formData.pan_no}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="ABCDE1234F"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 font-medium">Status:</span>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                formData.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {formData.isActive ? "Active" : "Inactive"}
            </button>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white rounded-md ${
                loading ? "bg-indigo-400" : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {loading ? "Saving..." : selectedPlace ? "Update Place" : "Create Place"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlaceForm;
