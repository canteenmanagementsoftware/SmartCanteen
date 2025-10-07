import { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";

const LocationForm = ({ onAdd, onUpdate, selectedLocation, onCancel }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [places, setPlaces] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [errors, setErrors] = useState({});

  const defaultMeal = {
    enabled: true,
    startTime: "07:00",
    endTime: "09:00",
  };

  const [formData, setFormData] = useState({
    company: "",
    place: "",
    locationName: "",
    description: "",
    meals: {
      breakfast: { ...defaultMeal },
      lunch: { ...defaultMeal, startTime: "12:00", endTime: "14:00" },
      supper: { ...defaultMeal, startTime: "16:00", endTime: "17:00" },
      dinner: { ...defaultMeal, startTime: "19:00", endTime: "21:00" },
      lateSnacks: { ...defaultMeal, startTime: "22:00", endTime: "23:00" },
    },
  });

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get("/company");
        setCompanies(Array.isArray(res.data) ? res.data : res.data?.data || []);
        
        // If current user is admin, manager, or meal_collector, automatically set their company
        if ((currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector') && currentUser?.companyId) {
          setSelectedCompany(currentUser.companyId);
          setFormData(prev => ({ ...prev, company: currentUser.companyId }));
          // Load places for their company immediately
          const placesRes = await axios.get(`/places/company/${currentUser.companyId}`);
          setPlaces(Array.isArray(placesRes.data) ? placesRes.data : placesRes.data?.data || []);
        }
      } catch (err) {
        console.error("Failed to load companies", err);
      }
    };
    fetchCompanies();
  }, [currentUser]);

  useEffect(() => {
    const fetchPlaces = async () => {
      if (!selectedCompany) {
        setPlaces([]);
        return;
      }
      try {
        const res = await axios.get(`/places/company/${selectedCompany}`);
        setPlaces(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch (err) {
        console.error("Failed to load places", err);
      }
    };
    fetchPlaces();
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedLocation) {
      setSelectedCompany(selectedLocation.companyId?._id || selectedLocation.companyId || "");
      setFormData({
        company: selectedLocation.companyId?._id || selectedLocation.companyId || "",
        place: selectedLocation.placeId?._id || selectedLocation.placeId || "",
        locationName: selectedLocation.locationName || "",
        description: selectedLocation.description || "",
        meals: selectedLocation.meals || formData.meals,
      });
    }
  }, [selectedLocation]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "company") {
      setSelectedCompany(value);
      setFormData((prev) => ({ ...prev, place: "" }));
    }
  };

  const toggleMeal = (meal) => {
    setFormData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [meal]: {
          ...prev.meals[meal],
          enabled: !prev.meals[meal].enabled
        }
      }
    }));
  };

  const handleTimeChange = (meal, field, value) => {
    setFormData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [meal]: {
          ...prev.meals[meal],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        companyId: formData.company,
        placeId: formData.place,
        locationName: formData.locationName,
        description: formData.description,
        meals: formData.meals,
      };

      if (selectedLocation) {
        await onUpdate({ ...payload, _id: selectedLocation._id });
      } else {
        await onAdd(payload);
      }
    } catch (err) {
      console.error("Save error:", err);
      setErrors({ submit: err.response?.data?.message || "Save failed" });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[1000px] shadow-lg rounded-md bg-white">
        <h3 className="text-xl font-bold mb-4">
          {selectedLocation ? "Edit Location" : "Add New Location"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Company dropdown - show for superadmin, admin, manager, and meal_collector */}
            {(currentUser?.userType === 'superadmin' || currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector') && (
              <select 
                name="company" 
                value={formData.company} 
                onChange={handleChange} 
                className="border p-2 rounded" 
                required
                disabled={currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector'}
              >
                <option value="">Select Company</option>
                {companies.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            )}
            <select name="place" value={formData.place} onChange={handleChange} className="border p-2 rounded" required disabled={!formData.company}>
              <option value="">Select Place</option>
              {places.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <input type="text" name="locationName" placeholder="Location Name" value={formData.locationName} onChange={handleChange} className="w-full border p-2 rounded" required />
          <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="w-full border p-2 rounded" rows="2" />
              <h1 className="text-lg font-semibold" >Meal Schedule</h1>
        <table className="w-full mt-6 text-sm border rounded overflow-hidden">
  <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
    <tr>
      <th className="px-4 py-3 text-left">Meal</th>
      <th className="px-4 py-3 text-left">Start Time</th>
      <th className="px-4 py-3 text-left">End Time</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-200">
    {Object.entries(formData.meals).map(([meal, info]) => (
      <tr key={meal} className="hover:bg-gray-50">
        <td className="px-4 py-3 font-medium text-gray-900">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={info.enabled}
              onChange={() => toggleMeal(meal)}
              className="accent-purple-600"
            />
            <span className="capitalize">{meal}</span>
          </label>
        </td>
        <td className="px-4 py-2">
          <input
            type="time"
            value={info.startTime}
            onChange={(e) => handleTimeChange(meal, "startTime", e.target.value)}
            className="w-full p-2 rounded border border-gray-300 text-gray-700 focus:ring-2 focus:ring-purple-500 appearance-none"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="time"
            value={info.endTime}
            onChange={(e) => handleTimeChange(meal, "endTime", e.target.value)}
            className="w-full p-2 rounded border border-gray-300 text-gray-700 focus:ring-2 focus:ring-purple-500 appearance-none"
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>


          {errors.submit && (
            <div className="p-2 bg-red-100 text-red-700 rounded">{errors.submit}</div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationForm;
