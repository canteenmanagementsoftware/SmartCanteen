// models/userMasterModel.js
const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const PackageAssignmentSchema = new Schema(
  {
    companyId:  { type: Types.ObjectId, ref: "Company",  required: true },
    placeId:    { type: Types.ObjectId, ref: "Places",   required: true },
    locationId: { type: Types.ObjectId, ref: "Location", required: true },
    packageId:  { type: Types.ObjectId, ref: "Packages", required: true },

    startDate:  { type: Date, required: true },
    endDate:    { type: Date, required: true },

    status:     { type: String, enum: ["scheduled","active","expired","cancelled"], default: "scheduled" },
    assignedAt: { type: Date, default: () => new Date() },

    // optional snapshots (future-proof history)
    packageName:  String,
    packagePrice: Number,
  },
  { _id: true }
);

const userModelSchema = new Schema(
  {
    // 🔁 ROOT ASSIGNMENT FIELDS REMOVED:
    // companyId, placeId, locationId, packageId, startDate, endDate -> now inside packages[]

    feeId: { type: String },
    batchesId: [{ type: Types.ObjectId, ref: "Batch" }],

    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    uniqueId:  { type: String, required: true, unique: true },
    dateOfBirth: { type: Date, required: true },

    photo: { type: String },
    address: { type: String, required: true },
    state:   { type: String, required: true },
    city:    { type: String, required: true },
    mobileNo:{ type: String, required: true },
    email:   { type: String, required: true, lowercase: true, trim: true },

    role: {
      type: String,
      enum: ["visitor", "employee", "student"],
      required: true,
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    cardNumber: { type: String, unique: true, sparse: true },
    isFeePaid:  { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true },

    // 🔑 NEW: embedded assignments
    packages: { type: [PackageAssignmentSchema], default: [] },
  },
  { timestamps: true }
);

// helpful multikey indexes for queries
userModelSchema.index({
  "packages.packageId": 1,
  "packages.startDate": 1,
  "packages.endDate": 1,
});
// If you often check active today across users:
userModelSchema.index({ "packages.startDate": 1, "packages.endDate": 1 });

module.exports = mongoose.model("UserMaster", userModelSchema);
