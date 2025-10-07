const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema({
  mealType: {
    type: String,
    required: [true, 'Meal type is required'],
    set: function(val) {
      // Convert to proper case format
      const normalized = val.toLowerCase();
      if (normalized === 'latesnacks' || normalized === 'latesnack') {
        return 'latesnacks';
      }
      return normalized;
    },
    enum: {
      values: ['breakfast','lunch','supper','dinner','latesnacks'],
      message: 'Invalid meal type. Must be one of: breakfast, lunch, supper, dinner, latesnacks'
    }
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  startTime: { 
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(time) {
        // Format: HH:MM AM/PM or HH:MM
        const timeRegex12Hour = /^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/;
        const timeRegex24Hour = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return timeRegex12Hour.test(time) || timeRegex24Hour.test(time);
      },
      message: 'Start time must be in 12-hour format (e.g., 9:00 AM) or 24-hour format (e.g., 09:00)'
    }
  },
  endTime: { 
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(time) {
        // Format: HH:MM AM/PM or HH:MM
        const timeRegex12Hour = /^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/;
        const timeRegex24Hour = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return timeRegex12Hour.test(time) || timeRegex24Hour.test(time);
      },
      message: 'End time must be in 12-hour format (e.g., 5:00 PM) or 24-hour format (e.g., 17:00)'
    }
  },
  days: {
    type: [String],
    required: [true, 'Days are required'],
    validate: {
      validator: function(days) {
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days.every(day => validDays.includes(day));
      },
      message: 'Invalid day value'
    }
  }
}, { _id: false }); // prevent _id inside each meal

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Package name is required'],
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },
  place_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Places",
    required: [true, 'Place is required']
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location",
    required: [true, 'Location is required']
  },
  meals: {
    type: [mealSchema],
    required: [true, 'Meal configuration is required'],
    validate: {
      validator: function(meals) {
        return meals && Array.isArray(meals) && meals.length > 0;
      },
      message: 'Package must have at least one meal configuration'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  description: {
    type: String,
    trim: true
  },
  is_fixed_validity: {
    type: Boolean,
    default: false
  },
  validity_days: {
    type: Number,
    required: function() {
      return this.is_fixed_validity; // Only required when using fixed validity
    },
    validate: {
      validator: function(value) {
        // If is_fixed_validity is false, validity_days is not required
        if (!this.is_fixed_validity) {
          return true;
        }
        // If is_fixed_validity is true, validity_days is required and must be positive
        return value != null && value > 0;
      },
      message: 'Validity days is required and must be positive when using fixed validity'
    }
  },
  validity_date: {
    type: Date,
    required: function() {
      return !this.is_fixed_validity; // Only required when not fixed validity
    },
    validate: {
      validator: function(value) {
        // If is_fixed_validity is true, validity_date is not required
        if (this.is_fixed_validity) {
          return true;
        }
        // If is_fixed_validity is false, validity_date is required
        return value != null;
      },
      message: 'Validity date is required when not using fixed validity'
    }
  },
  status: {
    type: String,
    enum: {
      values: ["active", "inactive"],
      message: 'Status must be either active or inactive'
    },
    default: "active"
  }
}, { timestamps: true });

// Function to convert 24hr time to 12hr format
const convert24to12 = (time24) => {
  // If already in 12-hour format, return as is
  if (time24.includes('AM') || time24.includes('PM')) {
    return time24;
  }

  const [hours24, minutes] = time24.split(':').map(num => num.padStart(2, '0'));
  let period = 'AM';
  let hours12 = parseInt(hours24);

  if (hours12 >= 12) {
    period = 'PM';
    if (hours12 > 12) {
      hours12 -= 12;
    }
  }
  if (hours12 === 0) {
    hours12 = 12;
  }

  return `${hours12}:${minutes} ${period}`;
};

// Add a pre-save middleware to ensure meals data is properly structured and fetch location timings
packageSchema.pre('save', async function(next) {
  try {
    if (!this.meals || !Array.isArray(this.meals)) {
      throw new Error('Meals must be an array');
    }

    // Validate each meal before saving
    for (const meal of this.meals) {
      if (!meal.mealType || !meal.startTime || !meal.endTime || !Array.isArray(meal.days)) {
        throw new Error(`Invalid meal configuration: ${meal.mealType || 'unknown meal'}`);
      }
      
      // Validate meal type
      const validMealTypes = ['breakfast', 'lunch', 'supper', 'dinner', 'latesnacks'];
      const normalizedType = meal.mealType.toLowerCase();
      if (!validMealTypes.includes(normalizedType)) {
        throw new Error(`Invalid meal type: ${meal.mealType}`);
      }
      
      // Validate days
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      if (!meal.days.every(day => validDays.includes(day))) {
        throw new Error(`Invalid days for meal: ${meal.mealType}`);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Packages", packageSchema);