const express = require('express');
const router = express.Router();
const placeController = require('../controllers/placeController');
const { getLocationsByPlace } = require('../controllers/placeController');
const { auth, adminManagerOnly } = require('../middleware/auth');

// All place routes require admin/manager privileges
router.use(auth, adminManagerOnly);

router.get('/company/:companyId', placeController.getPlacesByCompany);

router.get('/:placeId/location', getLocationsByPlace);

// Get all places
router.get('/', placeController.getAllPlaces);

// Get place by ID
router.get('/:id', placeController.getPlaceById);

router.post('/', placeController.createPlace);

router.put('/:id', placeController.updatePlace);

router.delete('/:id', placeController.deletePlace);

// Get all place by Company Id
router.get('/allplace/:id', placeController.placeByCompnyId)

module.exports = router;
