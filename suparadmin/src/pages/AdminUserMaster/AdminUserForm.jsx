import { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import Alert from "../../components/ui/Alert";
import { AuthContext } from "../../context/auth-context";

const USER_TYPES = [
  { id: "manager", label: "Manager" },
  { id: "admin", label: "Admin" },
  { id: "meal_collector", label: "Meal Collector" },
];

const isValidObjectId = (id) => id && /^[0-9a-fA-F]{24}$/.test(id);

const AdminUserForm = ({ selectedUser, onSuccess, onCancel }) => {
  const { user: currentUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    type: "",
    companyId: "",
    placeId: [],
    locationId: [],
  });

  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [locations, setLocations] = useState([]);

  const PASSWORD_MASK = "********";
  const [passwordChanged, setPasswordChanged] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState({
    companies: false,
    places: false,
    locations: false,
  });

  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [errors, setErrors] = useState({});

  // ---------- helpers ----------
  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const toArrayIds = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .map((x) => (typeof x === "string" ? x : x?._id))
        .filter(Boolean);
    }
    return [typeof val === "string" ? val : val?._id].filter(Boolean);
  };

  // ---------- load companies ----------
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoadingDropdowns((p) => ({ ...p, companies: true }));
        const res = await axios.get("/company");
        const companiesData = Array.isArray(res.data) ? res.data : [];
        setCompanies(companiesData);

        if (
          (currentUser?.userType === "admin" ||
            currentUser?.userType === "manager" ||
            currentUser?.userType === "meal_collector") &&
          currentUser?.companyId
        ) {
          const only = companiesData.find(
            (c) => c._id === currentUser.companyId
          );
          if (only) {
            setCompanies([only]);
            setField("companyId", currentUser.companyId);
            await loadPlaces(currentUser.companyId);
          }
        }
      } catch (err) {
        setAlert({
          show: true,
          message:
            "Failed to load companies: " +
            (err.response?.data?.message || err.message),
          type: "error",
        });
      } finally {
        setLoadingDropdowns((p) => ({ ...p, companies: false }));
      }
    };
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ---------- hydrate on edit ----------
  useEffect(() => {
    const loadUserData = async () => {
      if (!selectedUser) return;
      const preCompanyId =
        selectedUser.companyId?._id || selectedUser.companyId || "";
      const prePlaceIds = toArrayIds(
        selectedUser.placeIds || selectedUser.placeId
      );
      const preLocationIds = toArrayIds(selectedUser.locationId);

      setFormData({
        name: selectedUser.name || "",
        email: selectedUser.email || "",
        password: PASSWORD_MASK,
        type: selectedUser.type || "",
        companyId: preCompanyId,
        placeId: prePlaceIds,
        locationId: preLocationIds,
      });

      setPasswordChanged(false);

      if (preCompanyId) {
        try {
          setLoadingDropdowns((p) => ({ ...p, places: true }));
          const placesRes = await axios.get(`/places/company/${preCompanyId}`);
          const placesArr = Array.isArray(placesRes.data?.data)
            ? placesRes.data.data
            : [];
          setPlaces(placesArr);

          if (prePlaceIds.length) {
            await loadLocationsByPlaces(prePlaceIds);
          }
        } catch (err) {
          setAlert({
            show: true,
            message:
              "Failed to load user data: " +
              (err.response?.data?.message || err.message),
            type: "error",
          });
        } finally {
          setLoadingDropdowns((p) => ({
            ...p,
            places: false,
            locations: false,
          }));
        }
      }
    };
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  // ---------- data loaders ----------
  const loadPlaces = async (companyId) => {
    if (!isValidObjectId(companyId)) return;
    try {
      setLoadingDropdowns((p) => ({ ...p, places: true }));
      setPlaces([]);
      setField("placeId", []);
      setField("locationId", []);
      const res = await axios.get(`/places/company/${companyId}`);
      setPlaces(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setAlert({
        show: true,
        message:
          "Failed to load places: " +
          (err.response?.data?.message || err.message),
        type: "error",
      });
    } finally {
      setLoadingDropdowns((p) => ({ ...p, places: false }));
    }
  };

  const loadLocationsByPlaces = async (placeIds) => {
    const valid = (placeIds || []).filter(isValidObjectId);
    if (!valid.length) {
      setLocations([]);
      setField("locationId", []);
      return;
    }
    try {
      setLoadingDropdowns((p) => ({ ...p, locations: true }));
      const requests = valid.map((id) => axios.get(`/locations/places/${id}`));
      const responses = await Promise.allSettled(requests);

      const map = new Map();
      for (const r of responses) {
        if (r.status === "fulfilled") {
          const arr = Array.isArray(r.value?.data?.data)
            ? r.value.data.data
            : [];
          for (const loc of arr) {
            const _id = loc?._id || loc?.id;
            if (_id && !map.has(_id)) map.set(_id, loc);
          }
        }
      }
      const merged = Array.from(map.values());
      setLocations(merged);

      const allowed = new Set(merged.map((l) => String(l._id)));
      setFormData((prev) => ({
        ...prev,
        locationId: (prev.locationId || []).filter((id) =>
          allowed.has(String(id))
        ),
      }));
    } finally {
      setLoadingDropdowns((p) => ({ ...p, locations: false }));
    }
  };

  // ---------- handlers ----------
  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "placeIds") {
      let next = Array.isArray(formData.placeId) ? [...formData.placeId] : [];
      if (checked) {
        if (!next.includes(value)) next.push(value);
      } else {
        next = next.filter((id) => id !== value);
      }
      setField("placeId", next);
      await loadLocationsByPlaces(next);
      if (next.length === 0) setField("locationId", []);
      return;
    }

    if (name === "locationId") {
      let next = Array.isArray(formData.locationId)
        ? [...formData.locationId]
        : [];
      if (checked) {
        if (!next.includes(value)) next.push(value);
      } else {
        next = next.filter((id) => id !== value);
      }
      setField("locationId", next);
      return;
    }

    if (name === "companyId") {
      setField("companyId", value);
      setPlaces([]);
      setLocations([]);
      setField("placeId", []);
      setField("locationId", []);
      if (value) await loadPlaces(value);
      return;
    }

    setField(name, value);
  };

  // ---------- validation ----------
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Invalid email format";

    if (!selectedUser) {
      if (!formData.password.trim()) {
        newErrors.password = "Password is required";
      } else if (formData.password.trim().length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
    } else if (passwordChanged && formData.password.trim().length > 0) {
      if (formData.password.trim().length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
    }

    if (!formData.type) newErrors.type = "User type is required";
    if (!formData.companyId) newErrors.companyId = "Company is required";
    if (!formData.placeId || formData.placeId.length === 0)
      newErrors.placeId = "Select at least one place";
    if (!formData.locationId || formData.locationId.length === 0)
      newErrors.locationId = "Select at least one location";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------- submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        type: formData.type,
        companyId: formData.companyId,
        placeIds: formData.placeId.filter(Boolean),
        locationId: formData.locationId.filter(Boolean),
        isActive: true,
      };

      if (!selectedUser) {
        payload.password = formData.password.trim();
      } else if (passwordChanged && formData.password.trim().length > 0) {
        payload.password = formData.password.trim();
      }

      const endpoint = selectedUser
        ? `/admin-users/${selectedUser._id}`
        : "/admin-users";
      const method = selectedUser ? "put" : "post";
      const response = await axios[method](endpoint, payload);

      onSuccess(response.data);
      setAlert({
        show: true,
        message: `User ${selectedUser ? "updated" : "created"} successfully!`,
        type: "success",
      });
      setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
    } catch (error) {
      setAlert({
        show: true,
        message: error.response?.data?.message || "Failed to save user",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  const isCompanyLocked =
    currentUser?.userType === "admin" ||
    currentUser?.userType === "manager" ||
    currentUser?.userType === "meal_collector";

  return (
    <div className="fixed inset-0 z-50">
      {/* translucent backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      {/* modal */}
      <div className="fixed inset-0 p-4 md:p-6 flex items-center justify-center overflow-y-auto overscroll-contain">
        {/* card */}
        <div className="relative w-full max-w-2xl rounded-2xl bg-white/95 shadow-2xl ring-1 ring-black/5 max-h-[90vh] overflow-y-auto">
          {/* header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedUser ? "Edit Admin User" : "Add New Admin User"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign role & access (company → place(s) → location(s))
              </p>
            </div>
            <button
              onClick={onCancel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {alert.show && (
            <div className="px-6 pt-4">
              <Alert
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ show: false })}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
            {/* Account section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Account
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onFocus={() => {
                      if (
                        selectedUser &&
                        !passwordChanged &&
                        formData.password === PASSWORD_MASK
                      ) {
                        setPasswordChanged(true);
                        setField("password", "");
                      }
                    }}
                    onChange={(e) => {
                      setPasswordChanged(true);
                      setField("password", e.target.value);
                    }}
                    placeholder={
                      selectedUser
                        ? "Leave blank to keep current password"
                        : "Set an initial password"
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 8 characters.
                  </p>
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    disabled={loading}
                  >
                    <option value="">Select Type</option>
                    {USER_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.type && (
                    <p className="text-xs text-red-500 mt-1">{errors.type}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Organization section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Organization
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <select
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    disabled={
                      loading ||
                      loadingDropdowns.companies ||
                      currentUser?.userType !== "superadmin"
                    }
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {currentUser?.userType !== "superadmin" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Your company is automatically selected.
                    </p>
                  )}
                  {errors.companyId && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.companyId}
                    </p>
                  )}
                </div>

                {/* Places (multi) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place(s)
                  </label>
                  <div
                    className={`border rounded-lg p-3 max-h-48 overflow-y-auto bg-white ${
                      !formData.companyId || loadingDropdowns.places
                        ? "opacity-60"
                        : ""
                    }`}
                  >
                    {!formData.companyId ? (
                      <div className="text-gray-400 text-sm">
                        Select company first
                      </div>
                    ) : loadingDropdowns.places ? (
                      <div className="text-gray-400 text-sm">
                        Loading places...
                      </div>
                    ) : places.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {places.map((p) => (
                          <label
                            key={p._id}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              name="placeIds"
                              value={p._id}
                              checked={formData.placeId.includes(p._id)}
                              onChange={handleChange}
                              disabled={loading}
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">
                              {p.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        No places available
                      </div>
                    )}
                  </div>
                  {errors.placeId && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.placeId}
                    </p>
                  )}
                </div>

                {/* Locations (multi) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location(s)
                  </label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                    {loadingDropdowns.locations ? (
                      <div className="text-gray-400 text-sm">
                        Loading locations...
                      </div>
                    ) : locations.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {locations.map((loc) => (
                          <label
                            key={loc._id}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              name="locationId"
                              value={loc._id}
                              checked={formData.locationId.includes(loc._id)}
                              onChange={handleChange}
                              disabled={loading}
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">
                              {loc.locationName || loc.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        No locations available
                      </div>
                    )}
                  </div>
                  {errors.locationId && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.locationId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* footer actions */}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-md text-white bg-purple-600 hover:bg-purple-700 shadow-sm ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                {loading ? "Processing..." : selectedUser ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUserForm;
