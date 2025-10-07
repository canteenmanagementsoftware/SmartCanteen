const express = require('express');
const router = express.Router();
const taxesController = require('../controllers/taxesController');

// create tax
router.post('/', taxesController.createTax);

// (optional) list taxes
router.get('/', taxesController.listTaxes);
router.delete('/:id', taxesController.deleteTax);

module.exports = router;
