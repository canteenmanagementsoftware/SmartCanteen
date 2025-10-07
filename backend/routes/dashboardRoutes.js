const express = require("express");
const router = express.Router();
// const { auth, adminOnly } = require("../middleware/auth");
const { auth, adminManagerOnly } = require("../middleware/auth");
const {
  getMetrics,
  getSummary,
  getOverview,
  getRevenueByLocation,
  getPaymentAmountsByDate
} = require("../controllers/dashboardController");

// All dashboard routes require authentication and admin privileges
// router.use(auth, adminOnly);

router.use(auth,adminManagerOnly)

// Route to fetch today's metrics
router.get("/metrics", getMetrics);

// Route to fetch summary data for the graph
router.get("/summary", getSummary);

// Route to fetch overview data by date and location
router.get("/overview", getOverview);

// routes file me:
router.get("/revenue-by-location", getRevenueByLocation);

router.get("/payment-amounts-daily", getPaymentAmountsByDate);


module.exports = router;
