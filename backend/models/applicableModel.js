const mongoose = require('mongoose');

const applicableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

// optional: unique index for faster checks
applicableSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Applicable', applicableSchema);
// Model name 'Applicable' => collection: 'applicables' (starts with "applicable")
