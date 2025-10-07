const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { auth, adminOnly, adminManagerOnly } = require("../middleware/auth");

// All report routes require admin privileges
router.use(auth);

router.get("/visitor-report", adminOnly, reportController.getVisitorReport);

router.get("/fees-report", adminOnly, reportController.getFeesReport);

router.get(
  "/panding-fees-report",
  adminManagerOnly,
  reportController.getPendingFeesReport
);

router.get("/utilized-report", adminManagerOnly, reportController.getUtilizedReport);

router.get(
  "/daily-utilized-report",
  adminManagerOnly,
  reportController.getDailyUtilizedReport
);

router.get("/user-report", adminManagerOnly, reportController.getUsersReport);

router.get("/unremoved-users", reportController.getUnremovedUsers);
router.post("/remove-unremoved-users", reportController.removeUnremovedUsers);

module.exports = router;
