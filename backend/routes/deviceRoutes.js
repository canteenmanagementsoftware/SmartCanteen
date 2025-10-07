const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");
const { auth, adminOnly } = require("../middleware/auth");

// All device routes require admin privileges
router.use(auth, adminOnly);

router.get("/", deviceController.getAllDevices);
router.post("/", deviceController.createDevice);
router.put("/:id", deviceController.updateDevice);
router.delete("/:id", deviceController.deleteDevice);

module.exports = router;
