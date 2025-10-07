const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const upload = require("../middleware/uploadUserPhoto");
const { registerUser, getAllUsers, markFeePaid } = require("../controllers/userController");
const { auth, adminOnly, adminManagerOnly } = require("../middleware/auth");
const Batch = require("../models/batchModel");

// Public routes
router.post("/register", registerUser);

// Card-based user lookup (for meal collection)
router.get("/card/:cardId", userController.getUserByCard);

// Protected routes
router.use(auth, adminManagerOnly);

router.put("/markFeePaid/:userId", markFeePaid);
router.get("/receipt/:userId", userController.generateReceipt);

// IMPORTANT: static paths BEFORE param paths
router.get("/all", getAllUsers);
router.get("/batches", async (req, res) => {
  try {
    const ids = req.query.ids?.split(",") || [];
    const batches = await Batch.find({ _id: { $in: ids } });
    console.log("✅ Found batches:", batches);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

// Create user (only once; keep the upload middleware one)
router.post("/", upload.single("photo"), userController.createUser);

// Add package to existing user
// (controller expects req.params.id; isliye :id hi rakha)
router.post("/:id/packages", userController.addUserPackage);

// Get / Update / Delete single user
router.get("/:userId", userController.getUserById);
router.put("/:id",upload.single("photo") , userController.updateUser);
router.put("/addfee/:id", userController.addFeeId);
router.delete("/:id", userController.deleteUser);
router.delete("/:id/packages/:assignmentId", userController.removeUserPackage);

// (Optional) If you still want GET "/" for all users, you can keep it,
// but /all is already there. If you keep it, place it ABOVE "/:userId".
// router.get("/", getAllUsers);

module.exports = router;
