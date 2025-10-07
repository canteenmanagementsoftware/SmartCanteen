const express = require("express");
const router = express.Router();
const { auth, adminManagerOnly } = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");
const {
  getCompanies,
  getCompanyById,
  addCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companyController");

// Create uploads directory if it doesn't exist
const fs = require('fs');
const path = require('path');

// All company routes require authentication and admin/manager privileges
router.use(auth, adminManagerOnly);



// Get all companies
router.get("/", getCompanies);

// Get a single company by ID
router.get("/:id", getCompanyById);

// Add a new company
router.post("/", upload.single('logo'), addCompany);

// Update a company
router.put("/:id", upload.single('logo'), updateCompany);

// Delete a company
router.delete("/:id", deleteCompany);

// Export the router
module.exports = router;


