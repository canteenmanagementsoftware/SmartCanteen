const mongoose = require('mongoose');

const mealDataSchema = new mongoose.Schema({
  actual: { type: Number, default: 0 },
  utilized: { type: Number, default: 0 }
});

const mealEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserMaster',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Packages',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Places',
    required: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'supper', 'dinner', 'latesnacks'],
    required: true
  },
  method: {
    type: String,
    enum: ['face', 'card'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  mealData: {
    breakfast: mealDataSchema,
    lunch: mealDataSchema,
    supper: mealDataSchema,
    dinner: mealDataSchema,
    latesnacks: mealDataSchema
  }
}, {
  timestamps: true
});

const MealEntry = mongoose.model('MealEntry', mealEntrySchema);
module.exports = MealEntry;