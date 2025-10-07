import { useState, useEffect, useCallback } from "react";
import axios from "../../utils/axiosConfig";
import DeviceForm from "./DeviceForm";
import Alert from "../../components/ui/Alert";

const DeviceList = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(false);

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000);
  };

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/devices");
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading devices:", error);
      showAlert("Failed to load devices", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      const res = await axios.get("/locations");
      setLocations(res.data);
    } catch (error) {
      console.error("Error loading locations:", error);
      showAlert("Failed to load locations", "error");
    }
  }, []);

  useEffect(() => {
    loadDevices();
    loadLocations();
  }, [loadDevices, loadLocations]);

  const handleAdd = async (newDevice) => {
    setLoading(true);
    try {
      const res = await axios.post("/devices", newDevice);
      setDevices([...devices, res.data]);
      setShowForm(false);
      showAlert("Device added successfully");
    } catch (error) {
      console.error("Error adding device:", error);
      showAlert(error.response?.data?.message || "Failed to add device", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedDevice) => {
    setLoading(true);
    try {
      const res = await axios.put(`/devices/${updatedDevice._id}`, updatedDevice);
      setDevices(
        devices.map((device) =>
          device._id === updatedDevice._id ? res.data : device
        )
      );
      setShowForm(false);
      setSelectedDevice(null);
      showAlert("Device updated successfully");
    } catch (error) {
      console.error("Error updating device:", error);
      showAlert(error.response?.data?.message || "Failed to update device", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this device?")) {
      setLoading(true);
      try {
        await axios.delete(`/devices/${id}`);
        setDevices(devices.filter((device) => device._id !== id));
        showAlert("Device deleted successfully");
      } catch (error) {
        console.error("Error deleting device:", error);
        showAlert(error.response?.data?.message || "Failed to delete device", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6">
      {alert.show && <Alert message={alert.message} type={alert.type} onClose={() => setAlert({ show: false })} />}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Device Management</h1>
        <button
          onClick={() => {
            setSelectedDevice(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Add New Device
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {devices.map((device) => (
              <tr key={device._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-laptop text-purple-600"></i>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{device.deviceName}</div>
                      <div className="text-sm text-gray-500">{device.deviceOem}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.deviceIpAddress}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.deviceLocation?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.deviceType}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`h-2.5 w-2.5 rounded-full ${device.isTcpSupported ? 'bg-green-500' : 'bg-gray-300'} mr-2`}></div>
                    {device.isTcpSupported ? "Active" : "Inactive"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => {
                      setSelectedDevice(device);
                      setShowForm(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(device._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <DeviceForm
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          selectedDevice={selectedDevice}
          locations={locations}
          onCancel={() => {
            setShowForm(false);
            setSelectedDevice(null);
          }}
        />
      )}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
    </div>
  );
};

export default DeviceList;
