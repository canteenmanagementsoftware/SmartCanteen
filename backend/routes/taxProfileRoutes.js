const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/taxProfileController');
const { auth, adminManagerOnly } = require('../middleware/auth');

router.get('/',       auth, adminManagerOnly, ctrl.getTaxProfiles);
router.post('/',      auth, adminManagerOnly, ctrl.createTaxProfile);
router.put('/:id',    auth, adminManagerOnly, ctrl.updateTaxProfile);
router.delete('/:id', auth, adminManagerOnly, ctrl.deleteTaxProfile);

module.exports = router;
