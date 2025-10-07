const mongoose = require('mongoose');

const applicableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Applicable', applicableSchema);
// Model name 'Applicable' => collection: 'applicables' (starts with "applicable")
