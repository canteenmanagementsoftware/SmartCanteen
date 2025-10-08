const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");

// Load all models to ensure they are registered with Mongoose
// require('./models/index');

dotenv.config();
const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// CORS Configuration
 const allowedOrigins = ["http://localhost:5173", "http://localhost:5174","https://canteenmanagementsoftware.netlify.app"];
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ CORS blocked for origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Origin",
    "X-Requested-With",
    "Accept",
  ],
};

app.use(cors(corsOptions));


 const userPhotosDir = path.join(__dirname, "uploads", "user-photos");
fs.mkdirSync(userPhotosDir, { recursive: true });

// Serve static files from uploads directory
app.use(
  "/uploads/company-logos",
  express.static(path.join(__dirname, "uploads", "company-logos"))
);
app.use("/uploads/user-photos",  express.static(userPhotosDir));

// Import all route modules
const routes = {
  auth: require("./routes/authRoutes"),
  company: require("./routes/companyRoutes"),
  dashboard: require("./routes/dashboardRoutes"),
  usermaster: require("./routes/userRoutes"),
  devices: require("./routes/deviceRoutes"),
  locations: require("./routes/locationRoutes"),
  packages: require("./routes/packageRoutes"),
  batches: require("./routes/batchRoutes"),
  places: require("./routes/placeRoutes"),
  adminUsers: require("./routes/adminUserRoutes"),
  fees: require("./routes/feesRoutes"),
  taxprofile: require("./routes/taxProfileRoutes"),
  taxes: require("./routes/taxesRoutes"),
  applicable: require('./routes/applicableRoutes'),
  meal: require("./routes/mealRoutes"),
  reports: require("./routes/reportsRoutes"),
  // batchRoutes: require("./routes/batchRoutes")
};

// Register routes
try {
  app.use("/api/auth", routes.auth);
  app.use("/api/company", routes.company);
  app.use("/api/dashboard", routes.dashboard);
  app.use("/api/usermaster", routes.usermaster);
  app.use("/api/devices", routes.devices);
  app.use("/api/locations", routes.locations);
  app.use("/api/packages", routes.packages);
  app.use("/api/batches", routes.batches);
  app.use("/api/places", routes.places);
  app.use("/api/admin-users", routes.adminUsers);
  app.use("/api/fees", routes.fees);
  app.use("/api/taxprofile", routes.taxprofile);
  app.use("/api/taxes", routes.taxes);
  app.use('/api/applicables', routes.applicable);
  app.use("/api/meal", routes.meal);
  app.use("/api/reports", routes.reports);
  // app.use("/api/fees", routes.batchRoutes);

  console.log(" All routes registered successfully");
} catch (err) {
  console.error(" Error registering routes:", err.message);
}

// Basic route for testing
app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is running!",
    timestamp: new Date().toISOString(),
  });
});

// Test database connection
app.get("/api/test-db", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const status = mongoose.connection.readyState;
    const statusText = [
      "disconnected",
      "connected",
      "connecting",
      "disconnecting",
    ][status];
    res.json({
      message: "Database connection test",
      status: statusText,
      readyState: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test package route
app.get("/api/test-packages", (req, res) => {
  res.json({
    message: "Package routes are accessible",
    timestamp: new Date().toISOString(),
  });
});

// Test package creation endpoint
app.post("/api/test-package-create", (req, res) => {
  res.json({
    message: "Package creation endpoint is accessible",
    receivedData: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Add a friendly message for undefined routes
app.use("/dashboard", (req, res) => {
  res.status(404).json({ message: "Dashboard route is not defined." });
});

// Add a friendly root route for /api
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to the API root." });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`
                            Server is running on port ${PORT}
                            API Documentation:
                            - Test API: http://localhost:${PORT}
                            - API Endpoints: http://localhost:${PORT}/api/*
                        `);
    });
  } catch (err) {
    console.error(" Server startup error:", err);
    process.exit(1);
  }
};

startServer();
