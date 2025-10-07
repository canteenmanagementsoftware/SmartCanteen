const express = require('express');
const router = express.Router();
const controller = require('../controllers/applicableController');

router.post('/seed', controller.seedOnce); // one-time seed
router.get('/', controller.list);         // list all

module.exports = router;
