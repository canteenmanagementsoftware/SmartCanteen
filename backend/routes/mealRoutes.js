'use strict';

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');

// Record meal endpoint - users can record their own meals
router.post('/record', auth, (req, res) => {
  require('../controllers/mealController').recordMeal(req, res);
});

// Get meal history - only admins and superadmins can view
router.get('/history', auth, authorize('admin', 'superadmin'), (req, res) => {
  require('../controllers/mealController').getAllMeals(req, res);
});

// Get meal history for specific user - only admins and superadmins can view
router.get('/history/:userId', auth, authorize('admin', 'superadmin'), (req, res) => {
  require('../controllers/mealController').getMealHistory(req, res);
});

module.exports = router;