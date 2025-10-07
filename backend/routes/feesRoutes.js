const express = require("express");
const router = express.Router();
const feesController = require("../controllers/feesController");
const { auth, adminManagerOnly } = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");

// All fees routes require admin or manager privileges
router.use(auth, adminManagerOnly);

// fixed first
router.get("/tax-profiles", feesController.listTaxProfiles);
router.get("/tax-profiles/:profileId", feesController.getTaxProfileById);

// then others
router.post("/", upload.single("receipt"), feesController.createFees);
router.get("/", feesController.getAllFees);
router.get("/user/:userId", feesController.getFeesByUser);
router.get("/company/:companyId/places", feesController.getPlacesByCompany);
router.get("/places/:placeId/location", feesController.getLocationsByPlace);
router.get("/location/:locationId/batch", feesController.getBatchesByLocation);
router.get("/:id/receipt", feesController.downloadReceipts);
router.put("/:id", feesController.updateFees);
router.delete("/:id", feesController.deleteFees);
router.get("/:id", feesController.getFeeById);

module.exports = router;
