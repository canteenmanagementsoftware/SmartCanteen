const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
    deviceName: {
        type: String,
        required: true,
    },
    deviceIpAddress: {
        type: String,
        required: true,
    },
    deviceLocation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
        required: true,
    },
    deviceOem: {
        type: String,
        required: true,
    },
    deviceType: {
        type: String,
        enum: ["Mobile", "Tablet", "Laptop", "Desktop", "Other"],
        required: true,
    },
    isTcpSupported: {
        type: Boolean,
        default: false,
    },
    isUsbSupported: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model("Device", deviceSchema);