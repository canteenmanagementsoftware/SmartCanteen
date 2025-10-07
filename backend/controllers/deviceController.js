const Device = require("../models/deviceModel");

// Get all devices
exports.getAllDevices = async (req, res) => {
  try {
    const devices = await Device.find().populate("deviceLocation");
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};

// Create a device
exports.createDevice = async (req, res) => {
  try {
    const { deviceName, deviceIpAddress, deviceLocation, deviceOem, deviceType } = req.body;
    
    if (!deviceName || !deviceIpAddress || !deviceLocation || !deviceOem || !deviceType) {
        return res.status(400).json({
            error: "Missing required fields",
            required: ["deviceName", "deviceIpAddress", "deviceLocation", "deviceOem", "deviceType"]
        });
    }

    const device = new Device(req.body);
    await device.save();
    
    // Populate location details before sending response
    const savedDevice = await Device.findById(device._id).populate("deviceLocation");
    
    res.status(201).json({
        message: "Device created successfully",
        device: savedDevice
    });
  } catch (err) {
    console.error("Device creation error:", err);
    res.status(400).json({
        error: "Device creation failed",
        message: err.message,
        details: err.errors || {}
    });
  }
};

// Update a device
exports.updateDevice = async (req, res) => {
  try {
    const updated = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Update failed", message: err.message });
  }
};

// Delete a device
exports.deleteDevice = async (req, res) => {
  try {
    await Device.findByIdAndDelete(req.params.id);
    res.json({ message: "Device deleted" });
  } catch (err) {
    res.status(400).json({ error: "Delete failed", message: err.message });
  }
};
