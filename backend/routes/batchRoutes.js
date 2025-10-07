const express = require("express");
const router = express.Router();
const {
    getAllBatches,
    createBatch,
    updateBatch,
    deleteBatch,
    getBatchesByLocation,
    getBatchesByPlace 
} = require("../controllers/batchController");
const { auth, adminManagerOnly } = require("../middleware/auth");

// All batch routes require admin/manager privileges
router.use(auth, adminManagerOnly);

// Get batches by location 
router.get("/location/:locationId/batch", getBatchesByLocation);

// Get all batches
router.get("/", getAllBatches);

// Create new batch
router.post("/", createBatch);

// Update batch
router.put("/:id", updateBatch);

// Delete batch
router.delete("/:id", deleteBatch);

// GET /fees/place/:placeId/batch
router.get("/place/:placeId/batch", getBatchesByPlace);

module.exports = router;
