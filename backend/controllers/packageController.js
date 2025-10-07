const mongoose = require("mongoose");
const Packages = require("../models/packageModel");
require("../models/placeModel");
require("../models/locationModel");

const validateMealConfig = (mealConfig) => {
  if (!mealConfig || typeof mealConfig !== 'object') {
    console.log("Invalid mealConfig format:", mealConfig);
    return { isValid: false, error: 'Invalid meal configuration format' };
  }
  
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  // Updated time format to handle both 12-hour and 24-hour formats
  const timeFormat12Hour = /^(1[0-2]|0?[1-9]):[0-5][0-9] (AM|PM)$/;
  const timeFormat24Hour = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const validMealTypes = ['breakfast', 'lunch', 'supper', 'dinner', 'latesnacks', 'latesnack', 'latesnacks'];
  
  // If it's already in meals array format
  if (Array.isArray(mealConfig)) {
    for (const meal of mealConfig) {
      const normalizedMealType = meal.mealType.toLowerCase();
      if (!validMealTypes.includes(normalizedMealType)) {
        return { isValid: false, error: `Invalid meal type: ${meal.mealType}` };
      }
      
      // Check both 12-hour and 24-hour formats
      const isValidStartTime = timeFormat12Hour.test(meal.startTime) || timeFormat24Hour.test(meal.startTime);
      const isValidEndTime = timeFormat12Hour.test(meal.endTime) || timeFormat24Hour.test(meal.endTime);
      
      if (!isValidStartTime || !isValidEndTime) {
        return { isValid: false, error: `Invalid time format for ${meal.mealType}` };
      }
      
      if (!Array.isArray(meal.days) || !meal.days.every(day => validDays.includes(day))) {
        return { isValid: false, error: `Invalid days for ${meal.mealType}` };
      }
    }
    return { isValid: true };
  }
  
  // If it's in mealConfig object format
  for (const [type, config] of Object.entries(mealConfig)) {
    const normalizedType = type.toLowerCase();
    if (!validMealTypes.includes(normalizedType)) {
      return { isValid: false, error: `Invalid meal type: ${type}` };
    }
    
    if (!config || !config.startTime || !config.endTime || !Array.isArray(config.days)) {
      return { isValid: false, error: `Missing required fields for ${type}` };
    }
    
    // Check both 12-hour and 24-hour formats
    const isValidStartTime = timeFormat12Hour.test(config.startTime) || timeFormat24Hour.test(config.startTime);
    const isValidEndTime = timeFormat12Hour.test(config.endTime) || timeFormat24Hour.test(config.endTime);
    
    if (!isValidStartTime || !isValidEndTime) {
      return { isValid: false, error: `Invalid time format for ${type}` };
    }
    
    if (!config.days.every(day => validDays.includes(day))) {
      return { isValid: false, error: `Invalid days for ${type}` };
    }
  }
  
  return { isValid: true };
};

// Create Package
exports.createPackage = async (req, res) => {
  try {
    const packageData = req.body;

    // Handle field mapping from frontend
    if (packageData.packageName && !packageData.name) {
      packageData.name = packageData.packageName;
    }

    // Validate required fields
    if (!packageData.name || !packageData.company_id || !packageData.place_id || !packageData.location_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        requiredFields: ['name', 'company_id', 'place_id', 'location_id']
      });
    }

    // Validate validity fields based on is_fixed_validity
    if (packageData.is_fixed_validity) {
      if (!packageData.validity_days || packageData.validity_days <= 0) {
        return res.status(400).json({
          success: false,
          message: "Validity days is required and must be positive when using fixed validity"
        });
      }
    } else {
      if (!packageData.validity_date) {
        return res.status(400).json({
          success: false,
          message: "Validity date is required when not using fixed validity"
        });
      }
    }

    // Validate ObjectIds
    const objectIds = ['company_id', 'place_id', 'location_id'];
    for (const field of objectIds) {
      if (!mongoose.Types.ObjectId.isValid(packageData[field])) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field} format`,
          field
        });
      }
    }

    // Process meals configuration
    if (!packageData.meals || packageData.meals.length === 0) {
      if (!packageData.mealConfig) {
        return res.status(400).json({
          success: false,
          message: "Meal configuration is required"
        });
      }
      
      
      const validation = validateMealConfig(packageData.mealConfig);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.error || "Invalid meal configuration"
        });
      }

      // Convert mealConfig to meals array
      packageData.meals = Object.entries(packageData.mealConfig)
        .filter(([, config]) => config.isEnabled) // Only include enabled meals
        .map(([type, config]) => {
          const mealType = type.toLowerCase() === 'latesnack' ? 'latesnacks' : type.toLowerCase();
          return {
            mealType: mealType,
            isEnabled: config.isEnabled,
            startTime: config.startTime,
            endTime: config.endTime,
            days: config.days || []
          };
        });

      delete packageData.mealConfig;
    }

    // Validate final meals array
    if (!Array.isArray(packageData.meals) || packageData.meals.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Package must have at least one meal configuration"
      });
    }

    // Validate each meal in the array
    for (const meal of packageData.meals) {
      if (!meal.mealType || !meal.startTime || !meal.endTime || !Array.isArray(meal.days)) {
        return res.status(400).json({
          success: false,
          message: `Invalid meal configuration for ${meal.mealType || 'unknown meal'}`
        });
      }
    }

    // Set default values
    packageData.status = packageData.status || 'active';
    
    
    const newPackage = await Packages.create(packageData);
    
    // Map the response to match frontend expectations
    const mappedPackage = {
      ...newPackage.toObject(),
      packageName: newPackage.name, // Map 'name' to 'packageName' for frontend
      isActive: newPackage.status === 'active' // Map status to isActive
    };
    
    
    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: mappedPackage
    });

  } catch (error) {
    console.error("Error creating package:", error);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: validationErrors.join(', '),
        details: error.toString()
      });
    }
    
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create package",
      details: error.toString()
    });
  }
};


// Get All Packages
exports.getAllPackages = async (req, res) => {
  try {
    console.log("getAllPackages called");
    console.log("Request user:", req.user);
    console.log("Request userType:", req.userType);
    console.log("Request headers:", req.headers);
    
    const { companyId } = req.query;
    let query = {};
    
    // If companyId is provided, filter by company
    if (companyId) {
      query.company_id = companyId;
    }
    
    const packages = await Packages.find(query)
      .populate("company_id", "name")
      .populate("place_id", "name")
      .populate("location_id", "locationName")
      .select("+meals"); // Explicitly include meals field

    console.log("Raw packages data:", packages);
    console.log("Number of packages found:", packages.length);

    // Validate meals data for each package
    packages.forEach(pkg => {
      if (!pkg.meals || !Array.isArray(pkg.meals)) {
        console.warn(`Package ${pkg._id} has invalid meals configuration`);
      }
    });

    // Map the response to match frontend expectations
    const mappedPackages = packages.map(pkg => ({
      ...pkg.toObject(),
      packageName: pkg.name, // Map 'name' to 'packageName' for frontend
      isActive: pkg.status === 'active' // Map status to isActive
    }));

    console.log("Sending packages response");
    res.status(200).json({ success: true, data: mappedPackages });
  } catch (error) {
    console.error("Error in getAllPackages:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Package
exports.getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await Packages.findById(id)
      .populate("company_id", "name")
      .populate("place_id", "name")
      .populate("location_id", "locationName")
      .select("meals");

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    // Map the response to match frontend expectations
    const mappedPackage = {
      ...pkg.toObject(),
      packageName: pkg.name, // Map 'name' to 'packageName' for frontend
      isActive: pkg.status === 'active' // Map status to isActive
    };

    res.status(200).json({ success: true, data: mappedPackage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPackagesByLocation = async (req, res) => {
  try {
    const { locationId } = req.query;

    console.log("locationId---",locationId)

    // Make locationId optional
    const query = {};
    if (locationId) {
      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(400).json({ message: "Invalid locationId" });
      }
      query.location_id = locationId;
    }

    const packages = await Packages.find(query)
      .populate("company_id", "name")
      .populate("place_id", "name")
      .populate("location_id", "locationName");

    // Map the response to match frontend expectations
    const mappedPackages = packages.map(pkg => ({
      ...pkg.toObject(),
      packageName: pkg.name, // Map 'name' to 'packageName' for frontend
      isActive: pkg.status === 'active' // Map status to isActive
    }));

    res.status(200).json({ success: true, data: mappedPackages });
  } catch (err) {
    console.error("Error fetching packages:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



// Update Package
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const packageData = req.body;
    console.log("Updating package. Received data:", JSON.stringify(packageData, null, 2));

    // Handle field mapping from frontend
    if (packageData.packageName && !packageData.name) {
      packageData.name = packageData.packageName;
    }

    // Convert mealConfig to meals array if needed
    if (packageData.mealConfig) {
      packageData.meals = [];
      
      for (const [type, config] of Object.entries(packageData.mealConfig)) {
        if (config.isEnabled && config.startTime && config.endTime && Array.isArray(config.days)) {
          packageData.meals.push({
            mealType: type.toLowerCase() === 'latesnack' ? 'latesnacks' : type.toLowerCase(),
            isEnabled: config.isEnabled,
            startTime: config.startTime,
            endTime: config.endTime,
            days: config.days
          });
        }
      }

      // Remove the old mealConfig
      delete packageData.mealConfig;
    }

    // Validate meals configuration for updates
    if (!packageData.meals || !Array.isArray(packageData.meals) || packageData.meals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Package must have at least one meal configuration'
      });
    }

    // Validate validity fields based on is_fixed_validity
    if (packageData.is_fixed_validity) {
      if (!packageData.validity_days || packageData.validity_days <= 0) {
        return res.status(400).json({
          success: false,
          message: "Validity days is required and must be positive when using fixed validity"
        });
      }
    } else {
      if (!packageData.validity_date) {
        return res.status(400).json({
          success: false,
          message: "Validity date is required when not using fixed validity"
        });
      }
    }

    // Validate each meal configuration
    for (const meal of packageData.meals) {
      if (!meal.mealType || !meal.startTime || !meal.endTime || !Array.isArray(meal.days)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meal configuration. Each meal must have mealType, startTime, endTime, and days array'
        });
      }
    }

    console.log("Updating package with meals:", JSON.stringify(packageData.meals, null, 2));

    const updatedPackage = await Packages.findByIdAndUpdate(
      id,
      packageData,
      { new: true, runValidators: true }
    ).populate("company_id", "name")
      .populate("place_id", "name")
      .populate("location_id", "locationName");

    if (!updatedPackage) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    // Map the response to match frontend expectations
    const mappedPackage = {
      ...updatedPackage.toObject(),
      packageName: updatedPackage.name, // Map 'name' to 'packageName' for frontend
      isActive: updatedPackage.status === 'active' // Map status to isActive
    };

    console.log("Package updated successfully:", mappedPackage);

    res.status(200).json({ success: true, data: mappedPackage });
  } catch (error) {
    console.error("Error updating package:", error);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: validationErrors.join(', '),
        details: error.toString()
      });
    }
    
    res.status(400).json({ success: false, message: error.message });
  }
};


// Delete Package
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Packages.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    res.status(200).json({ success: true, message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
