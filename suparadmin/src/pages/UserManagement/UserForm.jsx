// src/pages/UserManagement/UserForm.jsx
import { useState, useEffect, useContext } from "react";
import axios from "../../utils/axiosConfig";
import WebcamCapture from "../../components/WebcamCapture";
import { AuthContext } from "../../context/auth-context";
import { getImageUrl } from "../../utils/imageHelper";

const UserForm = ({ user, onSubmit, onClose, hidePackage = false }) => {
  const { user: currentUser } = useContext(AuthContext);

  // Core form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    uniqueId: "",
    dateOfBirth: "",
    address: "",
    state: "",
    city: "",
    mobileNo: "",
    companyId: "",
    placeId: "",
    locationId: "",
    packageId: "",
    batchesId: [],
    startDate: "",
    endDate: "",
    photo: null, // only File when user changes
  });

  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [locations, setLocations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [batches, setBatches] = useState([]);

  const [useWebcam, setUseWebcam] = useState(false);
  // preview only: dataURL (new capture) OR stays null so we fall back to DB photo
  const [capturedImage, setCapturedImage] = useState(null);
  const [showExistingPhoto, setShowExistingPhoto] = useState(true);

  // Preview priority: 1) capturedImage 2) user.photo via getImageUrl 3) placeholder
const previewSrc =
  capturedImage ??
  (showExistingPhoto && user?.photo ? getImageUrl(user.photo) : "https://via.placeholder.com/160");

  const clearPhotoAndOpenCamera = () => {
  setCapturedImage(null);
  setShowExistingPhoto(false);      // DB photo ko preview se hata do
  setFormData((prev) => ({ ...prev, photo: null }));
  setUseWebcam(true);               // webcam open
};

  // Seed companies on mount
  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   useEffect(() => {
    if (import.meta.env?.DEV) {
      console.log("[UserForm] user?.photo =>", user?.photo);
      console.log("[UserForm] computed previewSrc =>", previewSrc);
    }
  }, [user, capturedImage, previewSrc]);

  // When editing, seed fields + dependent dropdowns
  useEffect(() => {
    if (!user) return;

    const companyId = user.companyId?._id || user.companyId || "";
    const placeId = user.placeId?._id || user.placeId || "";
    const locationId = user.locationId?._id || user.locationId || "";
    const packageId = user.packageId?._id || user.packageId || "";

    setFormData((prev) => ({
      ...prev,
      ...user,
      companyId,
      placeId,
      locationId,
      packageId,
      batchesId: user.batchesId?._id || user.batchesId || [],
      photo: null, // keep null; send only if user selects a new file
    }));

    if (companyId) fetchPlaces(companyId);
    if (placeId) fetchLocations(placeId);
    if (locationId) fetchPackages(locationId);

    // NOTE: capturedImage ko DB photo se set NA karein; previewSrc fallback handle karega
    setCapturedImage(null);
    setShowExistingPhoto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchCompanies = async () => {
    try {
      const res = await axios.get("/company");
      const companiesData = Array.isArray(res.data) ? res.data : res.data.data || [];
      setCompanies(companiesData);

      if (
        (currentUser?.userType === "admin" ||
          currentUser?.userType === "manager" ||
          currentUser?.userType === "meal_collector") &&
        currentUser?.companyId
      ) {
        setFormData((prev) => ({ ...prev, companyId: currentUser.companyId }));
        await fetchPlaces(currentUser.companyId);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  const fetchPlaces = async (companyId = "") => {
    try {
      const response = await axios.get(`/places/company/${companyId}`);
      setPlaces(Array.isArray(response.data) ? response.data : response.data.data || []);
    } catch (error) {
      console.error("Error fetching places:", error);
      setPlaces([]);
    }
  };

  const fetchLocations = async (placeId) => {
    try {
      if (!placeId) {
        setLocations([]);
        return;
      }
      const response = await axios.get(`/locations?placeId=${placeId}`);
      setLocations(response.data.data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    }
  };

  const fetchPackages = async (locationId) => {
    try {
      const res = await axios.get(`/packages/by-location?locationId=${locationId}`);
      setPackages(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (error) {
      console.error("Error fetching packages:", error);
      setPackages([]);
    }
  };

  const fetchLocationDetails = async (locationId) => {
    try {
      const res = await axios.get(`/locations/id/${locationId}`);
      const location = res.data;
      if (location?.startDate || location?.endDate) {
        setFormData((prev) => ({
          ...prev,
          startDate: location.startDate || "",
          endDate: location.endDate || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching location details:", error);
    }
  };

  const fetchLocationMeals = async (locationId) => {
    try {
      const res = await axios.get(`/locations/id/${locationId}`);
      const data = res.data;
      if (!data || !data.meals) return;

      const mealConfig = {};
      Object.keys(data.meals).forEach((meal) => {
        mealConfig[meal] = {
          days: [],
          startTime: data.meals[meal].startTime,
          endTime: data.meals[meal].endTime,
        };
      });

      setFormData((prev) => ({
        ...prev,
        mealConfig,
        startDate: new Date().toISOString().split("T")[0],
      }));
    } catch (err) {
      console.error("Failed to fetch meal config from location", err);
    }
  };

  const fetchBatches = async (companyId) => {
    try {
      const res = await axios.get(`/batches/by-company?companyId=${companyId}`);
      const batchList = Array.isArray(res.data) ? res.data : res.data.data || [];
      setBatches(batchList);
      const allBatchIds = batchList.map((b) => b._id);
      setFormData((prev) => ({ ...prev, batchesId: allBatchIds }));
    } catch (error) {
      console.error("Error fetching batches:", error);
      setBatches([]);
      setFormData((prev) => ({ ...prev, batchesId: [] }));
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "companyId") {
      await fetchPlaces(value);
      setFormData((prev) => ({
        ...prev,
        companyId: value,
        placeId: "",
        locationId: "",
        packageId: "",
      }));
    }

    if (name === "placeId") {
      try {
        const response = await axios.get(`/locations?placeId=${value}`);
        setLocations(response.data.data || []);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocations([]);
      }
      setFormData((prev) => ({ ...prev, locationId: "", packageId: "" }));
    }

    if (name === "locationId") {
      setFormData((prev) => ({ ...prev, packageId: "" }));
      await fetchLocationDetails(value);
      await fetchLocationMeals(value);

      try {
        const res = await axios.get(`/locations/id/${value}`);
        const data = res.data;
        if (data?.meals) {
          const mealConfig = {};
          Object.keys(data.meals).forEach((meal) => {
            mealConfig[meal] = {
              days: [],
              startTime: data.meals[meal].startTime,
              endTime: data.meals[meal].endTime,
            };
          });
          setFormData((prev) => ({
            ...prev,
            mealConfig,
            startDate: new Date().toISOString().split("T")[0],
          }));
        }
        if (data?.startDate || data?.endDate) {
          setFormData((prev) => ({
            ...prev,
            startDate: data.startDate || "",
            endDate: data.endDate || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching location meals/dates:", error);
      }

      try {
        const res = await axios.get(`/packages/by-location?locationId=${value}`);
        const pkgList = Array.isArray(res.data) ? res.data : res.data.data || [];
        setPackages(pkgList);
      } catch (error) {
        console.error("Error fetching packages:", error);
        setPackages([]);
      }
    }

    if (name === "packageId") {
      const selectedPkg = packages.find((pkg) => pkg._id === value);
      if (selectedPkg) {
        const today = new Date().toISOString().split("T")[0];
        const validity = selectedPkg.validity_date?.split("T")[0] || "";
        setFormData((prev) => ({ ...prev, startDate: today, endDate: validity }));
      }
    }
  };

  const dataURLtoFile = async (dataUrl, filename = `webcam_${Date.now()}.jpg`) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/jpeg" });
  };

  const handleImageCapture = async (image) => {
    const file = await dataURLtoFile(image);
    setCapturedImage(image); // preview only
    setFormData((prev) => ({ ...prev, photo: file })); // send File in submit
    setUseWebcam(false);
  };

  const removePhoto = () => {
    setCapturedImage(null);
    setFormData((prev) => ({ ...prev, photo: null }));
  };

  const formatDateInput = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const photoFile =
        formData.photo && formData.photo instanceof File ? formData.photo : undefined;

      const payload = {
        _id: user?._id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        uniqueId: formData.uniqueId,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        state: formData.state,
        city: formData.city,
        mobileNo: formData.mobileNo,
        companyId: formData.companyId,
        placeId: formData.placeId,
        locationId: formData.locationId,
        packageId: formData.packageId,
        batchesId: formData.batchesId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        ...(photoFile ? { photo: photoFile } : {}),
      };

      const finalPayload = user ? { ...payload, _id: user._id } : payload;

      await onSubmit(payload);

      // reset
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        role: "",
        uniqueId: "",
        dateOfBirth: "",
        address: "",
        state: "",
        city: "",
        mobileNo: "",
        companyId: "",
        placeId: "",
        locationId: "",
        packageId: "",
        batchesId: [],
        startDate: "",
        endDate: "",
        photo: null,
      });
      setCapturedImage(null);
      setUseWebcam(false);

      onClose && onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(error?.message || "Failed to save user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{user ? "Edit User" : "Add New User"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Personal Information</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formatDateInput(formData.dateOfBirth)}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unique ID</label>
                <input
                  type="text"
                  name="uniqueId"
                  value={formData.uniqueId}
                  onChange={handleChange}
                  placeholder="Employee ID/Roll No"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                <select
                  name="role"
                  value={formData.role || ""}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select Type</option>
                  <option value="visitor">Visitor</option>
                  <option value="employee">Employee</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select Blood Group</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber || ""}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Photo Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Profile Photo</h4>
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
  <img
    src={previewSrc}
    alt="Profile"
    className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
    onError={(e) => {
      console.warn("IMG failed to load:", e.currentTarget.src);
      e.currentTarget.onerror = null;
      e.currentTarget.src = "https://via.placeholder.com/160";
    }}
  />

  {(capturedImage || (showExistingPhoto && user?.photo)) && ( // UPDATED condition
    <button
      type="button"
      onClick={clearPhotoAndOpenCamera}  // UPDATED handler
      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
      title="Remove & open camera"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )}
</div>


                {useWebcam ? (
                  <WebcamCapture onCapture={handleImageCapture} onCancel={() => setUseWebcam(false)} />
                ) : (
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {setShowExistingPhoto(false); setUseWebcam(true)}}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Take Photo
                    </button>

                    <label className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center cursor-pointer">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Photo
                      <input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setShowExistingPhoto(false);                    // UPDATED
        setCapturedImage(event.target.result);          // preview
        setFormData((prev) => ({ ...prev, photo: file })); // send File
      };
      reader.readAsDataURL(file);
    }
  }}
  className="hidden"
/>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address / City / State */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Package Section */}
          {!hidePackage && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Package Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Company</label>
                  <select
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required={!hidePackage}
                    disabled={
                      currentUser?.userType === "admin" ||
                      currentUser?.userType === "manager" ||
                      currentUser?.userType === "meal_collector"
                    }
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {(currentUser?.userType === "admin" ||
                    currentUser?.userType === "manager" ||
                    currentUser?.userType === "meal_collector") && (
                    <p className="text-xs text-gray-500 mt-1">Your company is automatically selected</p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Place</label>
                  <select
                    name="placeId"
                    value={formData.placeId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required={!hidePackage}
                  >
                    <option value="">Select Place</option>
                    {places.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Location</label>
                  <select
                    name="locationId"
                    value={formData.locationId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required={!hidePackage}
                  >
                    <option value="">Select Location</option>
                    {locations.map((loc) => (
                      <option key={loc._id} value={loc._id}>{loc.locationName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Package</label>
                  <select
                    name="packageId"
                    value={formData.packageId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required={!hidePackage}
                  >
                    <option value="">Select Package</option>
                    {packages.map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formatDateInput(formData.startDate)}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formatDateInput(formData.endDate)}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              {user ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
