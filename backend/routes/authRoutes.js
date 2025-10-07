const express = require("express");
const router = express.Router();
const { register, registerAdmin, registerSuperAdmin, login, linkAdminToCompany } = require("../controllers/authController");
const { auth, authorize, superAdminOnly } = require("../middleware/auth");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Admin registration (protected - only super admin can create admins)
router.post("/register-admin", auth, superAdminOnly, registerAdmin);

// Super admin registration (protected - only existing super admins can create new ones)
router.post("/register-superadmin", auth, superAdminOnly, registerSuperAdmin);

// Link admin to company (protected - only admins can link themselves to their company)
router.post("/link-admin-to-company", auth, linkAdminToCompany);

module.exports = router;
