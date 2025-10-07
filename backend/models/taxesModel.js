const mongoose = require('mongoose');

const taxesSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// optional: faster lookups
taxesSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Taxes', taxesSchema); // NOTE: model name 'Taxes'
