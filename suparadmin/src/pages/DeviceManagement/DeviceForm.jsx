import { useState, useEffect } from "react";
import axios from "../../utils/axiosConfig";

const DeviceForm = ({ onAdd, onUpdate, selectedDevice, onCancel }) => {
  const [places, setPlaces] = useState([]);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    deviceName: "",
    deviceIpAddress: "",
    deviceLocation: "",
    placeId: "",
    deviceOem: "",
    deviceType: "",
    isTcpSupported: false,
    isUsbSupported: false,
    serialNumber: "",
    description: ""
  });

  useEffect(() => {
    fetchPlaces();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      setFormData(selectedDevice);
      if (selectedDevice.placeId) {
        fetchLocations(selectedDevice.placeId);
      }
    }
  }, [selectedDevice]);

  
  const fetchPlaces = async () => {
    try {
      const response = await axios.get('/places');
      const placesArray = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setPlaces(placesArray);
    } catch (error) {
      console.error('Error fetching places:', error);
      setPlaces([]); 
    }
  };
  

  const fetchLocations = async (placeId) => {
    try {
      const response = await axios.get(`/places/${placeId}/locations`);
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'placeId') {
      fetchLocations(value);
      setFormData(prev => ({
        ...prev,
        deviceLocation: '',
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedDevice) {
      onUpdate(formData);
    } else {
      onAdd(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">
            {selectedDevice ? 'Edit Device' : 'Add New Device'}
          </h3>
          <button 
            onClick={onCancel} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-md font-medium text-gray-700 mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                name="deviceName"
                value={formData.deviceName}
                onChange={handleChange}
                placeholder="Device Name"
                className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              />
              <input
                type="text"
                name="deviceOem"
                value={formData.deviceOem}
                onChange={handleChange}
                placeholder="Device OEM"
                className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              />
              <select
                name="deviceType"
                value={formData.deviceType}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Select Device Type</option>
                <option value="router">Tablet</option>
                <option value="switch">Mobile</option>
                <option value="access_point">Leptop</option>
                <option value="biometric">Pc</option>
              </select>
              {/* <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="Serial Number"
                className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500"
              /> */}
               {/* <input
                type="text"
                name="deviceIpAddress"
                value={formData.deviceIpAddress}
                onChange={handleChange}
                placeholder="IP Address"
                className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              /> */}
               <label className="flex items-center space-x-2 text-gray-700">
                  <input
                    type="checkbox"
                    name="isTcpSupported"
                    checked={formData.isTcpSupported}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>TCP Supported</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-700">
                  <input
                    type="checkbox"
                    name="isUsbSupported"
                    checked={formData.isUsbSupported}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>USB Supported</span>
                </label>
            </div>
          </div>
    

          {/* Location Information */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-md font-medium text-gray-700 mb-3">Location Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <select
                name="placeId"
                value={formData.placeId}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Select Place</option>
                {places.map(place => (
                  <option key={place._id} value={place._id}>{place.name}</option>
                ))}
              </select>
              <select
                name="deviceLocation"
                value={formData.deviceLocation}
                onChange={handleChange}
                className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={!formData.placeId}
              >
                <option value="">Select Location</option>
                {locations.map(location => (
                  <option key={location._id} value={location._id}>
                    {location.locationName}
                  </option>
                ))}
              </select>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Device Description"
                className="w-full p-2 border rounded-md col-span-2 focus:ring-purple-500 focus:border-purple-500"
                rows="3"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              {selectedDevice ? 'Update Device' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceForm;
