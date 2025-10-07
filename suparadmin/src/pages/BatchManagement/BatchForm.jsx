import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";

const BatchForm = ({ selectedBatch, onSuccess, onCancel }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [places, setPlaces] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState({
    places: false,
    locations: false,
    submit: false
  });
  const [companies, setCompanies] = useState([]);

  const [formData, setFormData] = useState({
    batch_name: "",
    year: new Date().getFullYear(),
    place_id: "",
    location_id: "",
    company_id: "",
    semester: "",
    description: "",
    status: "active"
  });

  const SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

  // Remove this useEffect as we're now calling loadPlaces from loadCompanies

  useEffect(() => {
    if (selectedBatch) {
      const placeId = selectedBatch.place_id?._id || selectedBatch.place_id || "";
      const locationId = selectedBatch.location_id?._id || selectedBatch.location_id || "";
      const companyId = selectedBatch.company_id?._id || selectedBatch.company_id || "";
      
      setFormData({
        batch_name: selectedBatch.batch_name || "",
        year: selectedBatch.year || new Date().getFullYear(),
        place_id: placeId,
        location_id: locationId,
        company_id: companyId,
        semester: selectedBatch.semester || "",
        description: selectedBatch.description || "",
        status: selectedBatch.status || "active"
      });

      if (placeId) {
        loadLocationsForPlace(placeId);
      }
    }
  }, [selectedBatch]);

  const loadCompanies = async () => {
    try {
      const res = await axios.get("/company"); 
      const companiesData = Array.isArray(res.data) ? res.data : res.data.data;
      setCompanies(companiesData);
      
      // If current user is admin, manager, or meal_collector, automatically set their company
      if ((currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector') && currentUser?.companyId) {
        setFormData(prev => ({ ...prev, company_id: currentUser.companyId }));
        // Load places for their company immediately
        await loadPlaces(currentUser.companyId);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load companies");
    }
  };
             useEffect(() => {
       loadCompanies();
   }, [currentUser]);


  const loadPlaces = async (companyId) => {
    if (!companyId) {
      setPlaces([]);
      return;
    }
    setLoading(prev => ({ ...prev, places: true }));
    try {
      const res = await axios.get(`/places/company/${companyId}`);
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : null;
  
      if (!data) throw new Error("Invalid data format received from /places");
      setPlaces(data);
    } catch (err) {
      console.error("Failed to load places:", err);
      setError(err.response?.data?.message || "Failed to load places.");
    } finally {
      setLoading(prev => ({ ...prev, places: false }));
    }
  };
  


  const loadLocationsForPlace = async (placeId) => {
  if (!placeId) return;
  setLoading(prev => ({ ...prev, locations: true }));
  try {
    const res = await axios.get(`/locations?placeId=${placeId}`);

    const data = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data.data)
      ? res.data.data
      : null;

    if (!data) throw new Error("Invalid location data");

    setLocations(data);
  } catch (err) {
    console.error("Failed to load locations:", err);
    setError(err.response?.data?.message || "Failed to load locations.");
  } finally {
    setLoading(prev => ({ ...prev, locations: false }));
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    

    // Basic validation
    if (!formData.batch_name.trim()) {
      return setError("Batch name is required");
    }
    if (!formData.place_id) {
      return setError("Place is required");
    }
    if (!formData.location_id) {
      return setError("Location is required");
    }

    try {
      setLoading(prev => ({ ...prev, submit: true }));

      const cleanedData = {
        batch_name: formData.batch_name.trim(),
        year: Number(formData.year),
        place_id: formData.place_id,
        location_id: formData.location_id,
        company_id: formData.company_id,
        semester: formData.semester,
        description: formData.description?.trim(),
        status: formData.status || "active",
      };



      let response;
      if (selectedBatch) {
        response = await axios.put(`/batches/${selectedBatch._id}`, cleanedData);
      } else {
        response = await axios.post("/batches", cleanedData);
      }


      // If we reach here, the request was successful
      setError(""); // Clear any existing errors
      onSuccess();
    } catch (err) {
      
      setError(err?.response?.data?.message || "Failed to save batch.");
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
    
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">
            {selectedBatch ? "Edit Batch" : "Add New Batch"}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            ✖
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-300 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company & Semester */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <select
                value={formData.company_id}
                onChange={(e) => {
                  const companyId = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    company_id: companyId,
                    place_id: "", 
                    location_id: "" 
                  }));
                  loadPlaces(companyId); 
                }}
                className="w-full border px-3 py-2 rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector'}
              >
                <option value="">Select Company</option>
                {companies.map(company => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {(currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector') && (
                <p className="text-xs text-gray-500 mt-1">Your company is automatically selected</p>
              )}
            </div>

              {/* Place & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Place</label>
              <select
                value={formData.place_id}
                onChange={(e) => {
                  const placeId = e.target.value;
                  setFormData(prev => ({ ...prev, place_id: placeId, location_id: "" }));
                  loadLocationsForPlace(placeId);
                }}
                className="w-full border px-3 py-2 rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={loading.places}
              >
                <option value="">Select Place</option>
                {places.map(place => (
                  <option key={place._id} value={place._id}>{place.name}</option>
                ))}
              </select>
              {loading.places && <p className="text-sm text-gray-500 mt-1">Loading places...</p>}
            </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Location</label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value }))}
                className="w-full border px-3 py-2 rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={!formData.place_id || loading.locations}
              >
                <option value="">Select Location</option>
                {locations.map(loc => (
                  <option key={loc._id} value={loc._id}>{loc.locationName}</option>
                ))}
              </select>
              {loading.locations && <p className="text-sm text-gray-500 mt-1">Loading locations...</p>}
            </div>
            </div>
          

            <div>
              <label className="block text-sm font-medium mb-1">Semester</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))
                }
                className="w-full border px-3 py-2 rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Select Semester</option>
                {SEMESTERS.map(semester => (
                  <option key={semester} value={semester}>
                    {semester} Semester
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch Name & Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Batch Name</label>
              <input
                type="text"
                value={formData.batch_name}
                onChange={(e) => setFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                required
                className="w-full border px-3 py-2 rounded-md focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Year</label>
              <input
                type="number"
                value={formData.year}
                min="2000"
                max="2100"
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                required
                className="w-full border px-3 py-2 rounded-md"
              />
            </div>
          </div>

        

          {/* Description */}
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full border px-3 py-2 rounded-md focus:ring-purple-500 focus:border-purple-500"
            ></textarea>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading.submit}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              {loading.submit ? "Saving..." : selectedBatch ? "Update Batch" : "Create Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

BatchForm.propTypes = {
  selectedBatch: PropTypes.object,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default BatchForm;
