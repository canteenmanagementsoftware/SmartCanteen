// models/adminUserModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema, Types } = mongoose;

const adminUserSchema = new Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },

  password: { type: String, required: [true, 'Password is required'] },

  type: {
    type: String,
    required: false, // existing data compatibility
    enum: ['manager', 'admin', 'meal_collector'] // add 'superadmin' agar zarurat ho
  },

  companyId: { type: Types.ObjectId, ref: 'Company', required: false },

  // ✅ MULTI-PLACE
  placeIds: [{ type: Types.ObjectId, ref: 'Places', default: [] }],

  // ✅ MULTI-LOCATION (aapke paas already array tha; naam same rakha)
  locationId: [{ type: Types.ObjectId, ref: 'Location', default: [] }],

  // (LEGACY) keep old single field for backward compat if somewhere still sends it:
  placeId: { type: Types.ObjectId, ref: 'Places', select: false },

  role: { type: String, default: 'admin', enum: ['admin'] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Password hash on create/change
adminUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// If someone still sets legacy placeId, merge it into placeIds
adminUserSchema.pre('validate', function(next) {
  if (this.placeId && (!this.placeIds || this.placeIds.length === 0)) {
    this.placeIds = [this.placeId];
  }
  next();
});

// Optional: Validate that every location belongs to one of the selected places
adminUserSchema.path('locationId').validate({
  isAsync: true,
  validator: async function(v) {
    if (!Array.isArray(v) || v.length === 0) return true;
    if (!Array.isArray(this.placeIds) || this.placeIds.length === 0) return true; // company/places not chosen yet
    const Location = this.model('Location');
    const count = await Location.countDocuments({
      _id: { $in: v },
      placeId: { $in: this.placeIds }
    });
    return count === v.length;
  },
  message: 'Some selected locations do not belong to the chosen places.'
});

// Helpful indexes
adminUserSchema.index({ companyId: 1, isActive: 1 });
adminUserSchema.index({ type: 1, isActive: 1 });
adminUserSchema.index({ 'placeIds': 1 });
adminUserSchema.index({ 'locationId': 1 });

module.exports = mongoose.model('AdminUser', adminUserSchema);
