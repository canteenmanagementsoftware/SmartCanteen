const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { auth, adminOnly } = require('../middleware/auth');

// All admin user routes require admin or superadmin privileges
router.use(auth, adminOnly);

// Get all admin users
router.get('/', adminUserController.getAllAdminUsers);

// Get valid user types
router.get('/types/user-types', adminUserController.getUserTypes);

// Get single admin user by ID
router.get('/:id', adminUserController.getAdminUser);

// Create new admin user
router.post('/', adminUserController.createAdminUser);

// Update admin user
router.put('/:id', adminUserController.updateAdminUser);

// Delete admin user
router.delete('/:id', adminUserController.deleteAdminUser);

router.get('/locations/by-places', adminUserController.getLocationsByPlaces);

module.exports = router;
