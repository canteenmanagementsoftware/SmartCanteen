const Location = require("../models/locationModel");
const Place = require("../models/placeModel");
const mongoose = require("mongoose");

//get all location by place id
exports.locationByCompnyId = async (req, res)=>{
  try {
      const { id } = req.params;
      const location = await Location.find({ placeId: new mongoose.Types.ObjectId(id), isActive: true });
      res.status(200).json(location);
    } catch (err) {
      res.status(500).json({ success: false, message: "Error loading location" });
    }
}

//  Get all locations 
exports.getAllLocations = async (req, res) => {
  try {
    const { placeId, companyId } = req.query;
    let filter = {};
    
    // If placeId is provided, filter by place
    if (placeId) {
      filter.placeId = placeId;
    }
    
    // If companyId is provided, filter by company
    if (companyId) {
      filter.companyId = companyId;
    }
    
    const locations = await Location.find(filter)
    .populate("placeId", "name")
    .populate("companyId", "name")
    .lean();
    
    res.status(200).json({ success: true, data: locations });
  } catch (err) {
    console.error("Error fetching all locations:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get location by ID 
exports.getLocationByIdWithMeals = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    res.status(200).json({ success: true, meals: location.meals || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get all locations by placeId 
exports.getLocationsByPlace = async (req, res) => {
  try {
    const locations = await Location.find({ placeId: req.params.placeId });
    res.json({ data: locations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};  

// Get location by ID
exports.getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid location ID" });
    }

    const location = await Location.findById(id)
      .populate("placeId", "name")
      .lean();

    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

     const enabledMeals = {};
    if (location.meals && typeof location.meals === 'object') {
      for (const [mealType, config] of Object.entries(location.meals)) {
        if (config?.isEnabled) {
          enabledMeals[mealType] = config;
        }
      }
    }

    res.status(200).json({
      success: true,
      _id: location._id,
      locationName: location.locationName,
      startDate: location.startDate,
      endDate: location.endDate,
      meals: enabledMeals
    });
  } catch (error) {
    console.error("Error fetching location by ID:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create location
exports.createLocation = async (req, res) => {
  try {
    const location = await Location.create(req.body);
    await Place.findByIdAndUpdate(req.body.placeId, {
      $push: { locations: location._id },
    });

    const populated = await Location.findById(location._id)
      .populate("placeId", "name")
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error creating location:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Update location
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    const newPlaceId = req.body.placeId;
    const oldPlaceId = location.placeId.toString();

    // If placeId changed, update both place records
    if (newPlaceId && newPlaceId !== oldPlaceId) {
      await Place.findByIdAndUpdate(oldPlaceId, {
        $pull: { locations: location._id },
      });

      await Place.findByIdAndUpdate(newPlaceId, {
        $push: { locations: location._id },
      });
    }
req.body.updatedBy = req.user.name
    const updatedLocation = await Location.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("placeId", "name");

    res.status(200).json({ success: true, data: updatedLocation });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete location
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    await Place.findByIdAndUpdate(location.placeId, {
      $pull: { locations: location._id },
    });

    await Location.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
