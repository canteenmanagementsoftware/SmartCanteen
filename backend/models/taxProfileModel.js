const mongoose = require('mongoose');

const taxProfileSchema = new mongoose.Schema({
  taxProfile:    { type: String, required: true, trim: true },
  taxPercentage: { type: Number, required: true, min: 0 },

  // IDs per row (tax + applicability)
  percentages: [{
    tax:           { type: mongoose.Schema.Types.ObjectId, ref: 'Taxes', required: true },
    percentage:    { type: Number, required: true, min: 0 },
    applicability: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicable', required: true },
  }],

  // Governance (server fills from req.user)
  isDeleted:      { type: Boolean, default: false },

  createdById:    { type: mongoose.Schema.Types.ObjectId, default: null },
  createdByType:  { type: String, enum: ['superadmin','admin','manager','meal_collector'], default: null },

  modifiedById:   { type: mongoose.Schema.Types.ObjectId, default: null },
  modifiedByType: { type: String, enum: ['superadmin','admin','manager','meal_collector'], default: null },
}, { timestamps: true });

taxProfileSchema.index({ isDeleted: 1, taxProfile: 1 });

module.exports = mongoose.model('TaxProfile', taxProfileSchema);
