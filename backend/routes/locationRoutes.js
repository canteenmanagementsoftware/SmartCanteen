const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");
const { auth, adminManagerOnly } = require("../middleware/auth");

// All location routes require admin/manager privileges
router.use(auth, adminManagerOnly);

// Get all locations or by placeId      
router.get("/", locationController.getAllLocations);
router.get("/places/:placeId", locationController.getLocationsByPlace);
router.get("/id/:id", locationController.getLocationByIdWithMeals);

// Get a location by ID
router.get("/:id", locationController.getLocationById);

// Create a new location
router.post("/", locationController.createLocation);

// Update location
router.put("/:id", locationController.updateLocation);

// Delete location
router.delete("/:id", locationController.deleteLocation);

//get location by place id
router.get("/getlocation/:id", locationController.locationByCompnyId)

module.exports = router;
