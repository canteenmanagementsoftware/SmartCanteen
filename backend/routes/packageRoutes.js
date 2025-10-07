const express = require("express");
const router = express.Router();
const packageController = require("../controllers/packageController");
const { auth, adminManagerOnly } = require("../middleware/auth");

// All package routes require admin or manager privileges
router.use(auth, adminManagerOnly);

// Get packages by location
router.get("/by-location", packageController.getPackagesByLocation);

// Get package by ID
router.get("/:id", packageController.getPackageById);


// Get all packages
router.get("/", packageController.getAllPackages);


// Create a new package
router.post("/", packageController.createPackage);

// Update a package
router.put("/:id", packageController.updatePackage);

// Delete a package
router.delete("/:id", packageController.deletePackage);

module.exports = router;
