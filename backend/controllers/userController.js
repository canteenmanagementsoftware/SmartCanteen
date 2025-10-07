const mongoose = require("mongoose");
const User = require("../models/userMasterModel");
require("../models/packageModel");
const Fees = require("../models/feesModel");
const PDFDocument = require("pdfkit"); // npm install pdfkit
const Batch = require("../models/batchModel");
const Packages = require("../models/packageModel");
const MealEntry = require("../models/mealEntryModel");
const path = require("path");
const fs = require("fs");

// Helper to build absolute URL
const buildPhotoUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/user-photos/${filename}`;

//add feeId
exports.addFeeId = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: feeId } = req.body;
    if (!feeId) return res.status(400).json({ message: "feeId is required" });
    const updated = await User.findByIdAndUpdate(
      id,
      { feeId, isFeePaid: false },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Linked", user: updated });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

// controllers/userController.js

exports.removeUserPackage = async (req, res) => {
  try {
    const { id, assignmentId } = req.params;
    const forceHard =
      req.query.hard === "true" || req.body?.hard === true ? true : false;

    // 1) Pehle matched subdoc nikaalo to check current status
    const holder = await User.findOne(
      { _id: id, "packages._id": assignmentId },
      { "packages.$": 1 }
    ).lean();

    if (!holder || !holder.packages || holder.packages.length === 0) {
      return res.status(404).json({ message: "User/package not found" });
    }

    const pkg = holder.packages[0];
    const isAlreadyCancelled = (pkg.status || "").toLowerCase() === "cancelled";
    const doHardDelete = forceHard || isAlreadyCancelled;

    let updated;
    if (doHardDelete) {
      // 2A) HARD DELETE: packages se subdoc hatao
      updated = await User.findByIdAndUpdate(
        id,
        { $pull: { packages: { _id: assignmentId } } },
        { new: true }
      )
        .select(
          "firstName lastName email mobileNo isActive city state address photo role uniqueId packages"
        )
        .populate([
          {
            path: "packages.packageId",
            model: "Packages",
            select: "name price validity_date is_fixed_validity status",
          },
          { path: "packages.companyId", model: "Company", select: "name" },
          { path: "packages.placeId", model: "Places", select: "name" },
          {
            path: "packages.locationId",
            model: "Location",
            select: "locationName name",
          },
        ])
        .lean();

      // (Optional) Cascade: orphan fees ko hata do (agar aapka Fees alag collection me hai)
      // await Fee.deleteMany({ userId: id, assignmentId });
    } else {
      // 2B) SOFT DELETE: status ko 'cancelled' set karo
      updated = await User.findOneAndUpdate(
        { _id: id, "packages._id": assignmentId },
        { $set: { "packages.$.status": "cancelled" } },
        { new: true }
      )
        .select(
          "firstName lastName email mobileNo isActive city state address photo role uniqueId packages"
        )
        .populate([
          {
            path: "packages.packageId",
            model: "Packages",
            select: "name price validity_date is_fixed_validity status",
          },
          { path: "packages.companyId", model: "Company", select: "name" },
          { path: "packages.placeId", model: "Places", select: "name" },
          {
            path: "packages.locationId",
            model: "Location",
            select: "locationName name",
          },
        ])
        .lean();
    }

    if (!updated) {
      return res.status(404).json({ message: "User not found after update" });
    }

    // 3) Shape response EXACTLY as before (so front-end ko same structure mile)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const arr = Array.isArray(updated.packages) ? updated.packages : [];
    const current =
      arr.find((p) => {
        if (!p?.startDate || !p?.endDate) return false;
        const s = new Date(p.startDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(p.endDate);
        e.setHours(0, 0, 0, 0);
        return s <= today && today <= e && p.status !== "cancelled";
      }) ||
      arr.reduce((best, p) => {
        if (!p?.endDate) return best;
        if (!best) return p;
        return new Date(p.endDate) > new Date(best.endDate) ? p : best;
      }, null);

    const shaped = {
      ...updated,
      companyId: current?.companyId || null,
      placeId: current?.placeId || null,
      locationId: current?.locationId || null,
      packageId: current?.packageId || null,
      startDate: current?.startDate || null,
      endDate: current?.endDate || null,
    };

    return res.json({
      message: doHardDelete ? "Package removed" : "Package cancelled",
      user: shaped,
    });
  } catch (err) {
    console.error("removeUserPackage error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select(
        "firstName lastName email mobileNo isActive city state address role uniqueId photo packages feeId isFeePaid"
      )
      .populate([
        // ⬇️ NESTED populates (NOT root packageId)
        {
          path: "packages.packageId",
          model: "Packages",
          select: "name price validity_date is_fixed_validity status",
        },
        { path: "packages.companyId", model: "Company", select: "name" },
        { path: "packages.placeId", model: "Places", select: "name" },
        {
          path: "packages.locationId",
          model: "Location",
          select: "locationName name",
        },
      ])
      .lean();

    // Pick a "current" assignment for compatibility fields
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shaped = users.map((u) => {
      const arr = Array.isArray(u.packages) ? u.packages : [];

      // Prefer active (today within range & not cancelled), else the one with latest endDate
      let cur =
        arr.find((p) => {
          if (!p?.startDate || !p?.endDate) return false;
          const s = new Date(p.startDate);
          s.setHours(0, 0, 0, 0);
          const e = new Date(p.endDate);
          e.setHours(0, 0, 0, 0);
          return s <= today && today <= e && p.status !== "cancelled";
        }) ||
        arr.reduce((best, p) => {
          if (!p?.endDate) return best;
          if (!best) return p;
          return new Date(p.endDate) > new Date(best.endDate) ? p : best;
        }, null);

      return {
        ...u,

        // 👇 legacy-style compatibility fields (frontend filters expect these)
        companyId: cur?.companyId || null,
        placeId: cur?.placeId || null,
        locationId: cur?.locationId || null,
        packageId: cur?.packageId || null,
        startDate: cur?.startDate || null,
        endDate: cur?.endDate || null,
      };
    });

    // frontend expects an ARRAY directly
    res.status(200).json(shaped);
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

// controllers/userController.js
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const u = await User.findById(userId)
      .select(
        "firstName lastName email mobileNo isActive city state address photo role uniqueId packages"
      )
      .populate([
        {
          path: "packages.packageId",
          model: "Packages",
          select: "name price validity_date is_fixed_validity status",
        },
        { path: "packages.companyId", model: "Company", select: "name" },
        { path: "packages.placeId", model: "Places", select: "name" },
        {
          path: "packages.locationId",
          model: "Location",
          select: "locationName name",
        },
      ])
      .lean();

    if (!u) return res.status(404).json({ message: "User not found" });

    // ---- pick current assignment for compatibility (frontend expects e.companyId.name etc.)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arr = Array.isArray(u.packages) ? u.packages : [];

    const current =
      arr.find((p) => {
        if (!p?.startDate || !p?.endDate) return false;
        const s = new Date(p.startDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(p.endDate);
        e.setHours(0, 0, 0, 0);
        return s <= today && today <= e && p.status !== "cancelled";
      }) ||
      arr.reduce((best, p) => {
        if (!p?.endDate) return best;
        if (!best) return p;
        return new Date(p.endDate) > new Date(best.endDate) ? p : best;
      }, null);

    const shaped = {
      ...u,
      companyId: current?.companyId || null,
      placeId: current?.placeId || null,
      locationId: current?.locationId || null,
      packageId: current?.packageId || null,
      startDate: current?.startDate || null,
      endDate: current?.endDate || null,
    };

    // aapka frontend setUserDoc(res.data?.user || res.data) karta hai — yeh compatible hai
    res.status(200).json({ user: shaped });
  } catch (err) {
    console.error("getUserById error:", err);
    res
      .status(500)
      .json({ message: "Error fetching user", error: err.message });
  }
};

// Get user by ID
// exports.getUserById = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ message: "Invalid user ID" });
//     }

//     const user = await User.findById(userId)
//       .populate({
//         path: "packageId",
//         model: "Packages",
//         select: "name price validity_date is_fixed_validity status description",
//       })
//       .populate("placeId", "name")
//       .populate("locationId", "name")
//       .lean();
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.status(200).json(user);

//   } catch (err) {
//     console.error("Error fetching user by ID:", err);
//     res
//       .status(500)
//       .json({ message: "Error fetching user", error: err.message });
//   }
// };

// Get user by card number (for tap-to-card meal collection)
exports.getUserByCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    if (!cardId)
      return res.status(400).json({ message: "Card ID is required" });

    const user = await User.findOne({
      cardNumber: cardId,
      isActive: true,
    })
      .populate([
        {
          path: "packages.packageId",
          model: "Packages",
          select:
            "name price validity_date is_fixed_validity status description",
        },
        { path: "packages.placeId", select: "name" },
        { path: "packages.locationId", select: "name" },
        { path: "packages.companyId", select: "name" },
      ])
      .lean();

    if (!user)
      return res.status(404).json({ message: "User not found for this card" });

    const now = new Date();

    // Helper: decide if a package assignment is effectively active right now
    const isActiveAssignment = (p) => {
      if (!p || p.status === "cancelled") return false;

      // safety: parse dates
      const s = p.startDate ? new Date(p.startDate) : null;
      const e = p.endDate ? new Date(p.endDate) : null;

      // Case 1: window-based validity
      if (s && e && s <= now && now <= e) return true;

      // Case 2: fixed-validity package (falls back to package.validity_date)
      if (
        p.packageId &&
        typeof p.packageId === "object" &&
        p.packageId.is_fixed_validity
      ) {
        const vd = p.packageId.validity_date
          ? new Date(p.packageId.validity_date)
          : null;
        if (vd && now <= vd) return true;
      }

      return false;
    };

    // pick the first assignment that is effective now
    const active = (user.packages || []).find(isActiveAssignment);

    if (!active || !active.packageId) {
      return res
        .status(403)
        .json({ message: "User does not have an active package" });
    }

    // (Optional) persist status flip scheduled -> active when inside window
    // if (active.status !== "active") {
    //   await User.updateOne(
    //     { _id: user._id, "packages._id": active._id },
    //     { $set: { "packages.$.status": "active" } }
    //   );
    // }

    return res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      cardNumber: user.cardNumber,

      company: active.companyId, // {_id, name}
      place: active.placeId, // {_id, name}
      location: active.locationId, // {_id, name}
      package: active.packageId, // populated package doc

      packageStartDate: active.startDate,
      packageEndDate: active.endDate,
      status: active.status, // may still be "scheduled" unless you persist the flip
    });
  } catch (err) {
    console.error("Error fetching user by card:", err);
    res
      .status(500)
      .json({ message: "Error fetching user by card", error: err.message });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, imageBase64 } = req.body;
    const user = new User({ firstName, lastName, email, photo: imageBase64 });
    await user.save();
    res.json({ message: "User Registered", user });
  } catch (err) {
    console.error("Register error", err);
    res.status(500).json({ message: "Registration Failed" });
  }
};

// Mark user fee as paid
exports.markFeePaid = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Update user and get complete data
    const user = await User.findByIdAndUpdate(
      userId,
      { isFeePaid: true },
      { new: true }
    )
      .populate("packageId")
      .populate("locationId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Create or update fee record (only if all required fields are present)
    const feeData = {
      userId: user._id,
      companyId: user.companyId,
      placeId: user.placeId,
      locationId: user.locationId,
      batchId: user.batchId,
      semester: "Sem-1",
      amount: user?.packageId?.price || 0,
      paymentMode: "Cash",
      paymentDate: new Date(),
      includingGST: false,
      status: "paid",
    };

    // Check if required fields are present
    const hasRequiredFields =
      feeData.companyId &&
      feeData.placeId &&
      feeData.locationId &&
      feeData.batchId;

    if (!hasRequiredFields) {
      console.log(
        "Missing required fields for fee creation, skipping fee record creation"
      );
      console.log("Missing fields:", {
        companyId: !!feeData.companyId,
        placeId: !!feeData.placeId,
        locationId: !!feeData.locationId,
        batchId: !!feeData.batchId,
      });
    } else {
      // Try to find existing fee record
      let feeRecord = await Fees.findOne({ userId: user._id });

      if (feeRecord) {
        // Update existing record
        feeRecord = await Fees.findOneAndUpdate({ userId: user._id }, feeData, {
          new: true,
        });
      } else {
        // Create new record
        feeRecord = await Fees.create(feeData);
      }
    }

    return res.status(200).json({
      message: "Fee marked as paid successfully",
      user,
      feeStatus: "paid",
      feeRecordCreated: hasRequiredFields,
    });
  } catch (error) {
    console.error("Payment processing error:", error);

    return res.status(500).json({
      message: "Payment processing failed",
      error: error.message,
      details: error.errors,
    });
  }
};

// Generate receipt for a user
exports.generateReceipt = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate("packageId locationId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt_${userId}.pdf`
    );
    doc.pipe(res);

    doc.fontSize(20).text("Payment Receipt", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Name: ${user.firstName} ${user.lastName}`);
    doc.text(`Package: ${user.packageId.name}`);
    doc.text(`Amount: ₹${user.packageId.price}`);
    doc.text(`Validity: ${user.packageId.validity_date || "N/A"}`);
    doc.text(`Location: ${user.locationId?.locationName || "N/A"}`);
    doc.text(`Status: ${user.isFeePaid ? "Paid" : "Unpaid"}`);
    doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`);

    doc.end();
  } catch (error) {
    console.error("Receipt generation failed:", error);
    res.status(500).json({ message: "Server error while generating receipt." });
  }
};

const os = require("os");
const crypto = require("crypto");

// Create a user
exports.createUser = async (req, res) => {
  try {
    const b = { ...req.body };

    // --- PHOTO SANITIZE (very important) ---
    // If body accidentally contains object for photo, remove it.
    if (b.photo && typeof b.photo !== "string") {
      delete b.photo;
    }

    // role/userType compatibility (as discussed)
    if (b.role && !b.userType) b.userType = b.role;
    if (b.userType && !b.role) b.role = b.userType;

    if (b.dateOfBirth) b.dateOfBirth = new Date(b.dateOfBirth);
    if (b.mobileNo != null) b.mobileNo = String(b.mobileNo).trim();

    // ---- PHOTO: priority 1 = uploaded file; priority 2 = base64 data URL (optional) ----
    if (req.file) {
  b.photo = `${req.protocol}://${req.get('host')}/uploads/user-photos/${req.file.filename}`;
} else if (
      typeof b.photoDataUrl === "string" &&
      b.photoDataUrl.startsWith("data:image")
    ) {
      // OPTIONAL path: if ever FE sends base64 instead of FormData file
      const match = b.photoDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const ext = mime.split("/")[1] || "jpg";
        const buf = Buffer.from(match[2], "base64");
        const fname = `webcam_${Date.now()}_${crypto
          .randomBytes(4)
          .toString("hex")}.${ext}`;
        const destDir = path.join(__dirname, "..", "uploads", "user-photos");
        await fs.promises.mkdir(destDir, { recursive: true });
        await fs.promises.writeFile(path.join(destDir, fname), buf);
        b.photo = `${req.protocol}://${req.get(
          "host"
        )}/uploads/user-photos/${fname}`;
      }
      delete b.photoDataUrl; // don't store raw base64
    }

    // ---- batches normalize (as before) ----
    if (b.batchesId && !Array.isArray(b.batchesId)) {
      if (typeof b.batchesId === "string") {
        b.batchesId = b.batchesId.includes(",")
          ? b.batchesId
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [b.batchesId];
      } else {
        b.batchesId = [];
      }
    }

    // If not provided, preload from company
    if ((!b.batchesId || b.batchesId.length === 0) && b.companyId) {
      const companyBatches = await Batch.find({
        company_id: new mongoose.Types.ObjectId(b.companyId),
      }).select("_id");
      b.batchesId = companyBatches.map((x) => x._id);
    }

    // Optional initial package assignment (unchanged)
    const hasInitial =
      b.companyId &&
      b.placeId &&
      b.locationId &&
      b.packageId &&
      b.startDate &&
      b.endDate;
    if (hasInitial) {
      const s = new Date(b.startDate);
      const e = new Date(b.endDate);
      if (isNaN(s) || isNaN(e) || s > e) {
        return res
          .status(400)
          .json({
            message: "Invalid package dates: startDate must be <= endDate",
          });
      }
      let snap = {};
      try {
        const pkg = await Packages.findById(b.packageId)
          .select("name price")
          .lean();
        if (pkg) snap = { packageName: pkg.name, packagePrice: pkg.price };
      } catch {}
      b.packages = [
        {
          companyId: b.companyId,
          placeId: b.placeId,
          locationId: b.locationId,
          packageId: b.packageId,
          startDate: s,
          endDate: e,
          status: "scheduled",
          assignedAt: new Date(),
          ...snap,
        },
      ];
      // NOTE: root IDs ko abhi delete mat kro (strict schema unko ignore karega)
    }

    // FINAL GUARD: ensure b.photo is String or undefined
    if (b.photo != null && typeof b.photo !== "string") {
      delete b.photo;
    }

    const user = await User.create(b);
    return res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("createUser error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        message: `Duplicate value for ${field}: ${req.body[field]}`,
        field,
      });
    }
    if (error.name === "ValidationError") {
      const errors = {};
      for (const [k, v] of Object.entries(error.errors || {})) {
        errors[k] = v.message;
      }
      return res.status(400).json({ message: "Validation failed", errors });
    }
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// controllers/userController.js
exports.updateUser = async (req, res) => {
  try {
    const allow = new Set([
      "firstName",
      "lastName",
      "uniqueId",
      "address",
      "state",
      "city",
      "mobileNo",
      "email",
      "role",
      "isFeePaid",
      "isActive",
      "batchesId",
      "dateOfBirth",
      "bloodGroup",
      "cardNumber",
      // photo handled separately
    ]);

    const update = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (!allow.has(k)) continue;
      if (v === "" || v === null || v === undefined) continue;
      update[k] = v;
    }

    // normalize booleans
    if ("isFeePaid" in update)
      update.isFeePaid =
        update.isFeePaid === true || update.isFeePaid === "true";
    if ("isActive" in update)
      update.isActive = update.isActive === true || update.isActive === "true";

    // normalize date
    if (update.dateOfBirth) update.dateOfBirth = new Date(update.dateOfBirth);

    // batchesId -> array normalize
    if (update.batchesId && !Array.isArray(update.batchesId)) {
      update.batchesId = String(update.batchesId)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // NEVER from this endpoint
    delete update.packages;
    delete update.companyId;
    delete update.placeId;
    delete update.locationId;
    delete update.packageId;
    delete update.startDate;
    delete update.endDate;
    delete update.createdAt;
    delete update.updatedAt;

    // ---- PHOTO HANDLING ----
    // If new file uploaded, set URL and (optional) delete old
    let oldToDelete = null;
    const existing = await User.findById(req.params.id).lean();

    if (req.file) {
      update.photo = `${req.protocol}://${req.get(
        "host"
      )}/uploads/user-photos/${req.file.filename}`;

      // mark old disk photo to delete
      if (existing?.photo && existing.photo.includes("/uploads/user-photos/")) {
        const filename = existing.photo.split("/uploads/user-photos/")[1];
        if (filename) {
          oldToDelete = path.join(
            __dirname,
            "..",
            "uploads",
            "user-photos",
            filename
          );
        }
      }
    } else if (
      typeof req.body.photoDataUrl === "string" &&
      req.body.photoDataUrl.startsWith("data:image")
    ) {
      const match = req.body.photoDataUrl.match(
        /^data:(image\/\w+);base64,(.+)$/
      );
      if (match) {
        const mime = match[1];
        const ext = mime.split("/")[1] || "jpg";
        const buf = Buffer.from(match[2], "base64");
        const fname = `webcam_${Date.now()}_${Math.random()
          .toString(16)
          .slice(2)}.${ext}`;
        const destDir = path.join(__dirname, "..", "uploads", "user-photos");
        await fs.promises.mkdir(destDir, { recursive: true });
        await fs.promises.writeFile(path.join(destDir, fname), buf);
        update.photo = `${req.protocol}://${req.get(
          "host"
        )}/uploads/user-photos/${fname}`;
      }
      delete req.body.photoDataUrl;
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    // delete old file (best-effort)
    if (oldToDelete) {
      fs.promises.unlink(oldToDelete).catch(() => {});
    }

    // Keep the same shape you expect on FE:
    return res.json({ user });
  } catch (err) {
    console.error("updateUser error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// POST /users/:id/packages
exports.addUserPackage = async (req, res) => {
  try {
    const userId = req.params.id;
    const body = req.body;

    const s = new Date(body.startDate);
    const e = new Date(body.endDate);
    if (isNaN(s) || isNaN(e) || s > e) {
      return res.status(400).json({ message: "Invalid package dates" });
    }

    // (optional) overlap guard
    const overlap = await User.findOne(
      {
        _id: userId,
        packages: {
          $elemMatch: {
            locationId: body.locationId,
            startDate: { $lte: e },
            endDate: { $gte: s },
            status: { $ne: "cancelled" },
          },
        },
      },
      { _id: 1 }
    );
    if (overlap) {
      return res
        .status(400)
        .json({ message: "Overlapping assignment exists for this location" });
    }

    // snapshot
    let snap = {};
    try {
      const pkg = await Packages.findById(body.packageId)
        .select("name price")
        .lean();
      if (pkg) snap = { packageName: pkg.name, packagePrice: pkg.price };
    } catch {}

    const subdoc = {
      companyId: body.companyId,
      placeId: body.placeId,
      locationId: body.locationId,
      packageId: body.packageId,
      startDate: s,
      endDate: e,
      status: "scheduled",
      assignedAt: new Date(),
      ...snap,
    };

    await User.findByIdAndUpdate(userId, { $push: { packages: subdoc } });

    // 🔁 Ab WAHI user dobara lao, **nested populate** ke saath:
    const u = await User.findById(userId)
      .select(
        "firstName lastName email mobileNo isActive city state address photo role uniqueId packages"
      )
      .populate([
        {
          path: "packages.packageId",
          model: "Packages",
          select: "name price validity_date is_fixed_validity status",
        },
        { path: "packages.companyId", model: "Company", select: "name" },
        { path: "packages.placeId", model: "Places", select: "name" },
        {
          path: "packages.locationId",
          model: "Location",
          select: "locationName name",
        },
      ])
      .lean();

    // 🪄 Compatibility shaping (current assignment ko root pe expose)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arr = Array.isArray(u.packages) ? u.packages : [];
    const current =
      arr.find((p) => {
        if (!p?.startDate || !p?.endDate) return false;
        const ss = new Date(p.startDate);
        ss.setHours(0, 0, 0, 0);
        const ee = new Date(p.endDate);
        ee.setHours(0, 0, 0, 0);
        return ss <= today && today <= ee && p.status !== "cancelled";
      }) ||
      arr.reduce(
        (best, p) =>
          !best || new Date(p.endDate) > new Date(best.endDate) ? p : best,
        null
      );

    const shaped = {
      ...u,
      companyId: current?.companyId || null,
      placeId: current?.placeId || null,
      locationId: current?.locationId || null,
      packageId: current?.packageId || null,
      startDate: current?.startDate || null,
      endDate: current?.endDate || null,
    };

    return res.status(200).json({ message: "Package added", user: shaped });
  } catch (err) {
    console.error("addUserPackage error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update a user
// exports.updateUser = async (req, res) => {
//   try {
//     await User.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     });

//     const updated = await User.findById(req.params.id);

//     if (!updated) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json({ user: updated });
//   } catch (error) {
//     console.error("Update error:", error);
//     if (error.name === "ValidationError") {
//       return res.status(400).json({
//         message: "Validation failed",
//         errors: error.errors,
//       });
//     }
//     res.status(400).json({
//       message: "Update failed",
//       error: error.message,
//     });
//   }
// };

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(400).json({ error: "Delete failed", message: err.message });
  }
};
