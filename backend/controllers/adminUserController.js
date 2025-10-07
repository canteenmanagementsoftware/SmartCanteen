const AdminUser = require("../models/adminUserModel");
const Company = require("../models/companyModel");
const Places = require("../models/placeModel"); // make sure this is the correct model
const Location = require("../models/locationModel"); // and has field: placeId
const bcrypt = require("bcryptjs");
const { Types } = require("mongoose");

// --- helpers ---
const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const toObjIds = (arr) =>
  toArray(arr).map((x) => new Types.ObjectId(String(x)));
const VALID_TYPES = ["manager", "admin", "meal_collector"];

// Get all admin users
exports.getAllAdminUsers = async (req, res) => {
  try {
    const query = {};
    // If user is admin (not superadmin), only show users from their company
    if (req.userType === "admin" && req.user?.companyId) {
      query.companyId = req.user.companyId;
    }

    const users = await AdminUser.find(query)
      .populate("companyId", "name")
      .populate("placeIds", "name") // ✅ multi place
      .populate("locationId", "locationName name placeId") // array
      .lean();

    res.json(users);
  } catch (err) {
    console.error("Error fetching admin users:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single admin user
exports.getAdminUser = async (req, res) => {
  try {
    const user = await AdminUser.findById(req.params.id)
      .populate("companyId", "name")
      .populate("placeIds", "name") // ✅ multi place
      .populate("locationId", "locationName name placeId")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching admin user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create admin user (supports multi place)
exports.createAdminUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      type,
      companyId,
      placeIds, // ✅ read from body
      placeId, // ✅ legacy single
      locationIds, // ✅ optional plural
      locationId, // ✅ legacy single
    } = req.body;

    if (!name || !email || !password || !type) {
      return res.status(400).json({
        message:
          "Missing required fields: name, email, password, and type are required",
      });
    }
    const VALID_TYPES = ["manager", "admin", "meal_collector"];
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        message: `Invalid user type. Valid types are: ${VALID_TYPES.join(
          ", "
        )}`,
      });
    }

    const exists = await AdminUser.findOne({
      email: String(email).toLowerCase(),
    }).lean();
    if (exists)
      return res
        .status(400)
        .json({ message: "User with this email already exists" });

    // normalize arrays
    const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
    const toObjIds = (arr) =>
      toArray(arr).map((x) => new Types.ObjectId(String(x)));

    const places = toObjIds(placeIds ?? placeId); // ✅ accepts both
    const locations = toObjIds(locationIds ?? locationId); // ✅ accepts both

    // company pick (admin user forced to their own company; superadmin must provide)
    let finalCompanyId = null;
    if (req.userType === "admin") {
      if (!req.user?.companyId)
        return res.status(400).json({ message: "Your company is not set" });
      finalCompanyId = req.user.companyId;
    } else {
      if (!companyId)
        return res.status(400).json({ message: "companyId is required" });
      finalCompanyId = companyId;
    }

    if (!places.length)
      return res.status(400).json({ message: "Select at least one place" });
    if (!locations.length)
      return res.status(400).json({ message: "Select at least one location" });

    // validate company
    const cmp = await Company.findById(finalCompanyId).select("_id").lean();
    if (!cmp) return res.status(400).json({ message: "Invalid companyId" });

    // validate places belong to company (support companyId or company_id in Places schema)
    const placeCount = await Places.countDocuments({
      _id: { $in: places },
      company: finalCompanyId,
    });
    if (placeCount !== places.length) {
      return res
        .status(400)
        .json({ message: "Some places do not belong to the selected company" });
    }

    // validate locations belong to the selected places
    const locCount = await Location.countDocuments({
      _id: { $in: locations },
      placeId: { $in: places },
    });
    if (locCount !== locations.length) {
      return res.status(400).json({
        message: "Some locations do not belong to the selected places",
      });
    }

    const user = await AdminUser.create({
      name,
      email: String(email).toLowerCase(),
      password, // pre-save hook will hash
      type,
      companyId: finalCompanyId,
      placeIds: places, // ✅ multi place
      locationId: locations, // ✅ multi location
      isActive: true,
    });

    const populated = await AdminUser.findById(user._id)
      .populate("companyId", "name")
      .populate("placeIds", "name")
      .populate("locationId", "locationName name placeId")
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating admin user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update admin user (supports multi place)
exports.updateAdminUser = async (req, res) => {
  try {
    const {
      name,
      email,
      type,
      role,
      companyId,
      placeIds,
      placeId,
      locationIds,
      locationId,
      password,
    } = req.body;
    const userId = req.params.id;

    if (!name || !email || !type) {
      return res.status(400).json({
        message: "Missing required fields: name, email, and type are required",
      });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        message: `Invalid user type. Valid types are: ${VALID_TYPES.join(
          ", "
        )}`,
      });
    }

    // If current user is admin, ensure same-company restriction
    if (req.userType === "admin") {
      const target = await AdminUser.findById(userId)
        .select("companyId")
        .lean();
      if (!target || String(target.companyId) !== String(req.user?.companyId)) {
        return res
          .status(403)
          .json({ message: "You can only update users from your own company" });
      }
    }

    const dupe = await AdminUser.findOne({
      email: String(email).toLowerCase(),
      _id: { $ne: userId },
    }).lean();
    if (dupe)
      return res.status(400).json({ message: "Email is already in use" });

    const updateData = { name, email: String(email).toLowerCase(), type, role };
    if (typeof password === "string" && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    // normalize arrays
    const places = toObjIds(placeIds || placeId);
    const locations = toObjIds(locationIds || locationId);

    // compute final company/places/locations to validate
    const current = await AdminUser.findById(userId).lean();
    if (!current)
      return res.status(404).json({ message: "Admin user not found" });

    let finalCompanyId = current.companyId;
    if (req.userType === "admin") {
      finalCompanyId = req.user.companyId;
      updateData.companyId = finalCompanyId;
    } else if (companyId) {
      finalCompanyId = companyId;
      updateData.companyId = finalCompanyId;
    }

    const finalPlaces = places.length ? places : current.placeIds || [];
    const finalLocations = locations.length
      ? locations
      : current.locationId || [];

    // validate relations only if any of these changed
    if (
      companyId ||
      places.length ||
      locations.length ||
      req.userType === "admin"
    ) {
      const cmp = await Company.findById(finalCompanyId).select("_id").lean();
      if (!cmp) return res.status(400).json({ message: "Invalid companyId" });

      // ✅ use finalPlaces here, not 'places'
      const placeCount = await Places.countDocuments({
        _id: { $in: finalPlaces },
        company: finalCompanyId, // your Places schema uses 'company'
      });
      if (placeCount !== finalPlaces.length) {
        return res.status(400).json({
          message: "Some places do not belong to the selected company",
        });
      }

      const locCount = await Location.countDocuments({
        _id: { $in: finalLocations },
        placeId: { $in: finalPlaces },
      });
      if (locCount !== finalLocations.length) {
        return res.status(400).json({
          message: "Some locations do not belong to the selected places",
        });
      }

      updateData.placeIds = finalPlaces;
      updateData.locationId = finalLocations;
    }

    const user = await AdminUser.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("companyId", "name")
      .populate("placeIds", "name")
      .populate("locationId", "locationName name placeId")
      .lean();

    if (!user) return res.status(404).json({ message: "Admin user not found" });
    res.json(user);
  } catch (err) {
    console.error("Error updating admin user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete admin user
exports.deleteAdminUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.userType === "admin") {
      const target = await AdminUser.findById(userId)
        .select("companyId")
        .lean();
      if (!target || String(target.companyId) !== String(req.user?.companyId)) {
        return res
          .status(403)
          .json({ message: "You can only delete users from your own company" });
      }
    }

    const user = await AdminUser.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: "Admin user not found" });

    res.json({ message: "Admin user deleted successfully" });
  } catch (err) {
    console.error("Error deleting admin user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get valid user types
exports.getUserTypes = async (req, res) => {
  try {
    res.json([
      { id: "manager", label: "Manager" },
      { id: "admin", label: "Admin" },
      { id: "meal_collector", label: "Meal Collector" },
    ]);
  } catch (err) {
    console.error("Error fetching user types:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// sample controller
exports.getLocationsByPlaces = async (req, res) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) return res.json({ data: [] });

  const placeIds = ids.map((id) => new Types.ObjectId(id));
  const locs = await Location.find({ placeId: { $in: placeIds } })
    .select("_id locationName name placeId")
    .lean();

  res.json({ data: locs });
};
