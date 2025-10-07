import { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import { AuthContext } from "../../context/auth-context";

// Time conversion utilities
const convert24to12 = (time24) => {
  if (!time24) return '';
  const [hours24, minutes] = time24.split(':');
  let period = 'AM';
  let hours12 = parseInt(hours24);

  if (hours12 >= 12) {
    period = 'PM';
    if (hours12 > 12) {
      hours12 -= 12;
    }
  }
  if (hours12 === 0) {
    hours12 = 12;
  }

  return `${hours12}:${minutes} ${period}`;
};

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const MEAL_TYPES = {
  breakfast: "breakfast",
  lunch: "lunch",
  supper: "supper",
  dinner: "dinner",
  latesnacks: "latesnacks",
  lateSnacks: "latesnacks" // Add both variants to handle different cases
};

const PackageForm = ({ selectedPackage, onSuccess, onCancel }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: "",
    company_id: "",
    place_id: "",
    location_id: "",
    price: "",
    is_fixed_validity: false,
    validity_days: "",
    validity_date: "",
    mealConfig: {},
  });

  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  loadCompanies();

  // If current user is admin, automatically set their company
  if (currentUser?.userType === 'admin' && currentUser?.companyId) {
    setFormData(prev => ({ ...prev, company_id: currentUser.companyId }));
  }

  if (selectedPackage) {
    const companyId = selectedPackage.company_id?._id ?? "";
    const placeId = selectedPackage.place_id?._id ?? "";
    const locationId = selectedPackage.location_id?._id ?? "";

    // ✅ First fetch latest meals from location
    axios.get(`/locations/id/${locationId}`).then(res => {
      const latestMeals = res.data?.meals || {};
      const availableMealKeys = Object.keys(latestMeals);

      const reconstructedMealConfig = {};
      if (selectedPackage?.meals?.length) {
        selectedPackage.meals.forEach((meal) => {
          const mealType = meal.mealType;
          if (availableMealKeys.includes(mealType)) {
            reconstructedMealConfig[mealType] = {
              mealType: mealType,
              isEnabled: meal.isEnabled,
              days: meal.days || [],
              startTime: meal.startTime,
              endTime: meal.endTime,
            };
          }
        });
      }

      // Update form
      setFormData((prev) => ({
        ...prev,
        name: selectedPackage.name ?? "",
        company_id: companyId,
        place_id: placeId,
        location_id: locationId,
        price: selectedPackage.price ?? "",
        is_fixed_validity: selectedPackage.is_fixed_validity ?? false,
        validity_days: selectedPackage.validity_days ?? "",
        validity_date: selectedPackage.validity_date?.split("T")[0] ?? "",
        mealConfig: reconstructedMealConfig,
      }));

      if (companyId) loadPlaces(companyId);
      if (placeId) loadLocations(placeId);
    }).catch(err => {
      console.error("Error fetching meals from location during edit:", err);
    });
  }
}, [selectedPackage]);


  const loadCompanies = async () => {
    try {
      const res = await axios.get("/company");
      const companiesData = res.data.data || res.data;
      setCompanies(companiesData);
      
      // If current user is admin, manager, or meal_collector, automatically set their company
      if ((currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector') && currentUser?.companyId) {
        setFormData(prev => ({ ...prev, company_id: currentUser.companyId }));
        // Load places for their company
        await loadPlaces(currentUser.companyId);
      }
    } catch {
      setError("Failed to load companies");
    }
  };

  const loadPlaces = async (companyId) => {
    try {
      const res = await axios.get(`/places/company/${companyId}`);
      setPlaces(res.data.data || res.data);
    } catch {
      setError("Failed to load places");
    }
  };

  const loadLocations = async (placeId) => {
    try {
      const res = await axios.get(`/locations?placeId=${placeId}`);
      setLocations(res.data.data || res.data);
    } catch {
      setError("Failed to load locations");
    }
  };

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };

      if (name === "company_id") {
        updated.place_id = "";
        updated.location_id = "";
        loadPlaces(value);
      }

      if (name === "place_id") {
        updated.location_id = "";
        loadLocations(value);
      }

      if (name === "location_id") {
        fetchLocationMeals(value);
      }

      if (name === "is_fixed_validity") {
        updated.validity_days = "";
        updated.validity_date = "";
      }

      return updated;
    });
  };

  const fetchLocationMeals = async (locationId) => {
  try {
    const res = await axios.get(`/locations/id/${locationId}`);
    const mealData = res.data?.meals || {};
    const mealConfig = {};

    Object.entries(mealData).forEach(([mealKey, config]) => {
      // ✅ Add only if meal is enabled
      if (!config?.enabled) return;

      const normalizedMeal = mealKey.toLowerCase().replace(/\s+/g, '');
      const key = MEAL_TYPES[normalizedMeal] || normalizedMeal;

      mealConfig[key] = {
        mealType: key,
        isEnabled: false,
        days: [],
        startTime: convert24to12(config.startTime),
        endTime: convert24to12(config.endTime),
      };
    });

    setFormData((prev) => ({ ...prev, mealConfig }));
  } catch (err) {
    console.error("Failed to fetch meal config from location", err);
    setFormData((prev) => ({ ...prev, mealConfig: {} }));
  }
};



  const toggleMealDay = (meal, day) => {
    setFormData((prev) => {
      const days = prev.mealConfig[meal]?.days || [];
      const updatedDays = days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day];

      return {
        ...prev,
        mealConfig: {
          ...prev.mealConfig,
          [meal]: {
            ...prev.mealConfig[meal],
            days: updatedDays,
          },
        },
      };
    });
  };

  const toggleAllDaysForMeal = (meal) => {
    setFormData((prev) => {
      const newDays = prev.mealConfig[meal]?.days.length === weekdays.length ? [] : [...weekdays];
      return {
        ...prev,
        mealConfig: {
          ...prev.mealConfig,
          [meal]: {
            ...prev.mealConfig[meal],
            days: newDays,
          },
        },
      };
    });
  };

  const toggleAllMealsForDay = (day) => {
    const allSelected = Object.values(formData.mealConfig).every(m => m.days.includes(day));
    setFormData((prev) => {
      const updatedMealConfig = { ...prev.mealConfig };
      Object.keys(updatedMealConfig).forEach((meal) => {
        const currentDays = updatedMealConfig[meal].days || [];
        updatedMealConfig[meal].days = allSelected
          ? currentDays.filter((d) => d !== day)
          : [...new Set([...currentDays, day])];
      });
      return {
        ...prev,
        mealConfig: updatedMealConfig,
      };
    });
  };

  const toggleMeal = (meal) => {
    setFormData((prev) => ({
      ...prev,
      mealConfig: {
        ...prev.mealConfig,
        [meal]: {
          ...prev.mealConfig[meal],
          isEnabled: !prev.mealConfig[meal].isEnabled,
          days: !prev.mealConfig[meal].isEnabled ? [] : prev.mealConfig[meal].days
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Enhanced validation
    if (!formData.name || !formData.name.trim()) {
      setError("Package name is required.");
      return;
    }

    if (!formData.company_id) {
      setError("Company is required.");
      return;
    }

    if (!formData.place_id) {
      setError("Place is required.");
      return;
    }

    if (!formData.location_id) {
      setError("Location is required.");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    if (formData.is_fixed_validity && (!formData.validity_days || parseInt(formData.validity_days) <= 0)) {
      setError("Validity Days is required and must be positive.");
      return;
    }

    if (!formData.is_fixed_validity && !formData.validity_date) {
      setError("Validity Date is required.");
      return;
    }

    // Check if at least one meal is enabled and has days selected
    const hasEnabledMealsWithDays = Object.values(formData.mealConfig)
      .some(meal => meal.isEnabled && meal.days && meal.days.length > 0);

    if (!hasEnabledMealsWithDays) {
      setError("Please enable at least one meal and select days for it.");
      return;
    }

    setLoading(true);
    try {
      // Transform enabled meals into the required format
      const meals = Object.entries(formData.mealConfig)
        .filter(([, config]) => config.isEnabled)
        .map(([, config]) => ({
          mealType: config.mealType,
          isEnabled: config.isEnabled,
          startTime: config.startTime, // Already in 12-hour format
          endTime: config.endTime,     // Already in 12-hour format
          days: config.days || []
        }));

      const packageData = {
        name: formData.name.trim(),
        company_id: formData.company_id,
        place_id: formData.place_id,
        location_id: formData.location_id,
        price: parseFloat(formData.price),
        is_fixed_validity: formData.is_fixed_validity,
        validity_days: formData.is_fixed_validity ? parseInt(formData.validity_days) : undefined,
        validity_date: !formData.is_fixed_validity ? formData.validity_date : undefined,
        meals: meals,
        status: "active"
      };

      // Remove mealConfig as it's not needed in the backend
      delete packageData.mealConfig;



      // Test API accessibility
      try {
        const testRes = await axios.get('/packages');   
      } catch (testErr) {
        setError('API is not accessible. Please check your connection.');
        setLoading(false);
        return;
      }

      let response;
      try {
        if (selectedPackage) {
          response = await axios.put(`/packages/${selectedPackage._id}`, packageData);
        } else {
          response = await axios.post("/packages", packageData);
        }


        // If we reach here, the request was successful

        setError(""); // Clear any existing errors
        onSuccess();
      } catch (requestError) {
        throw requestError; // Re-throw to be caught by outer catch
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save package.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-200 bg-opacity-90 z-50 overflow-y-auto">
      <div className="mx-auto mt-12 p-6 bg-white w-[1000px] rounded shadow-lg">
        <h2 className="text-2xl font-bold mb-4">{selectedPackage ? "Edit" : "Add"} Package</h2>

        {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4">{error}</div>}


        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border rounded px-3 py-1" required />
            </div>

            {/* Company dropdown - show for superadmin, admin, manager, and meal_collector */}
            {(currentUser?.userType === 'superadmin' || currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector') && (
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <select 
                  name="company_id" 
                  value={formData.company_id} 
                  onChange={handleChange} 
                  className="w-full border rounded px-3 py-1" 
                  required
                  disabled={currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector'}
                >
                  <option value="">Select Company</option>
                  {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {(currentUser?.userType === 'admin' || currentUser?.userType === 'manager' || currentUser?.userType === 'meal_collector') && (
                  <p className="text-xs text-gray-500 mt-1">Your company is automatically selected</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Place</label>
              <select name="place_id" value={formData.place_id} onChange={handleChange} className="w-full border rounded px-3 py-1" required disabled={!formData.company_id}>
                <option value="">Select Place</option>
                {places.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <select name="location_id" value={formData.location_id} onChange={handleChange} className="w-full border rounded px-3 py-1" required disabled={!formData.place_id}>
                <option value="">Select Location</option>
                {locations.map((l) => <option key={l._id} value={l._id}>{l.name || l.locationName}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border rounded px-3 py-1" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{formData.is_fixed_validity ? "Validity Days" : "Validity Date"}</label>
              {formData.is_fixed_validity ? (
                <input type="number" name="validity_days" value={formData.validity_days} onChange={handleChange} className="w-full border rounded px-3 py-1" required />
              ) : (
                <input type="date" name="validity_date" value={formData.validity_date} onChange={handleChange} className="w-full border rounded px-3 py-1" required />
              )}
            </div>

            <label className="flex items-center col-span-2 space-x-2">
              <input type="checkbox" name="is_fixed_validity" checked={formData.is_fixed_validity} onChange={handleChange} />
              <span>Fixed Validity</span>
            </label>
          </div>

          {Object.keys(formData.mealConfig).length > 0 && (
            <div className="overflow-x-auto">
              <h3 className="text-lg font-semibold mb-2">Meal Configuration</h3>
              <table className="w-full border text-sm table-auto">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Meal</th>
                    <th className="border p-2">Enable</th>
                    <th className="border p-2">Start</th>
                    <th className="border p-2">End</th>
                    {weekdays.map((day) => (
                      <th key={day} className="border p-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-medium">{day.slice(0, 3)}</span>
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-purple-600"
                            onChange={() => toggleAllMealsForDay(day)}
                            checked={
                              Object.values(formData.mealConfig)
                                .filter(m => m.isEnabled)
                                .every(m => m.days.includes(day))
                            }
                          />
                        </div>
                      </th>
                    ))}
                    <th className="border p-2 text-center">All</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(formData.mealConfig).map(([meal, config]) => (
                    <tr key={meal} className={`hover:bg-gray-50 ${!config.isEnabled ? 'opacity-50' : ''}`}>
                      <td className="border p-2 capitalize font-semibold">
                        {(MEAL_TYPES[meal] || meal).charAt(0).toUpperCase() + (MEAL_TYPES[meal] || meal).slice(1)}
                      </td>
                      <td className="border p-2 text-center">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-purple-600"
                          checked={config.isEnabled}
                          onChange={() => toggleMeal(meal)}
                        />
                      </td>
                      <td className="border p-2 text-center">{config.startTime}</td>
                      <td className="border p-2 text-center">{config.endTime}</td>
                      {weekdays.map((day) => (
                        <td key={day} className="border text-center">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-purple-600"
                            checked={config.days.includes(day)}
                            onChange={() => toggleMealDay(meal, day)}
                            disabled={!config.isEnabled}
                          />
                        </td>
                      ))}
                      <td className="border text-center">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-purple-600"
                          checked={config.days.length === weekdays.length}
                          onChange={() => toggleAllDaysForMeal(meal)}
                          disabled={!config.isEnabled}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" disabled={loading}>
              {loading ? "Saving..." : selectedPackage ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageForm;
