const AdminUser = require("../models/adminUserModel");
const SuperAdmin = require("../models/superAdminModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register User (Admin/Superadmin only)
exports.register = async (req, res) => {
  const { name, email, phone, password, role = 'admin', userType = 'admin' } = req.body;

  try {
    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: "Name, email and password are required",
        fields: {
          name: !name ? "Name is required" : null,
          email: !email ? "Email is required" : null,
          password: !password ? "Password is required" : null
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    let user;
    let userExists;

    // Check if user exists based on userType
    if (userType === 'superadmin') {
      userExists = await SuperAdmin.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: "Superadmin with this email already exists" });
      }
      user = new SuperAdmin({ name, email, password, role: 'superadmin' });
    } else {
      // Default to admin
      userExists = await AdminUser.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: "Admin with this email already exists" });
      }
      user = new AdminUser({ name, email, phone, password, role: 'admin' });
    }

    await user.save();

    res.status(201).json({
      message: "Registration successful",
      userId: user._id,
      userType: userType
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: "Registration failed", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
};

// Register Admin
exports.registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const adminExists = await AdminUser.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: "Admin with this email already exists" });
    }

    // Create admin without company initially
    const admin = await AdminUser.create({
      name,
      email,
      password,
      type: 'admin',
      role: 'admin',
      isActive: true
    });

    res.status(201).json({
      message: "Admin registration successful. Please create your company.",
      adminId: admin._id,
      requiresCompanySetup: true
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ 
      message: "Admin registration failed", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
};

// Link admin to company
exports.linkAdminToCompany = async (req, res) => {
  const { adminId, companyId } = req.body;

  try {
    if (!adminId || !companyId) {
      return res.status(400).json({ message: "Admin ID and Company ID are required" });
    }

    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const company = await require('../models/companyModel').findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Update admin with company ID
    admin.companyId = companyId;
    await admin.save();

    res.status(200).json({
      message: "Admin successfully linked to company",
      adminId: admin._id,
      companyId: companyId
    });
  } catch (error) {
    console.error('Link admin to company error:', error);
    res.status(500).json({ 
      message: "Failed to link admin to company", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
};

// Register Super Admin
exports.registerSuperAdmin = async (req, res) => {
  const { name, email, password, permissions } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const superAdminExists = await SuperAdmin.findOne({ email });
    if (superAdminExists) {
      return res.status(400).json({ message: "Super admin with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = await SuperAdmin.create({
      name,
      email,
      password: hashedPassword,
      permissions: permissions || ['manage_companies', 'manage_admins', 'manage_users', 'view_reports', 'system_settings']
    });

    res.status(200).json({
      message: "Super admin registration successful",
      superAdminId: superAdmin._id,
    });
  } catch (error) {
    console.error('Super admin registration error:', error);
    res.status(500).json({ 
      message: "Super admin registration failed", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
};

// Universal Login - handles all user types
exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    let user;
    let userModel;
    let userType;

    // First try to find in SuperAdmin
    user = await SuperAdmin.findOne({ email: identifier }).lean();
    if (user) {
      userModel = SuperAdmin;
      userType = 'superadmin';
    } else {
      // If not found in SuperAdmin, try AdminUser with company population
      user = await AdminUser.findOne({ email: identifier })
        .populate('companyId', 'name')
        .populate('placeIds', 'name')
        .lean();
      if (user) {
        userModel = AdminUser;
        userType = user.type || 'admin'; // Use the actual type from database
      }
    }

    console.log("adfaddf",user)

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: "Account is deactivated" });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        role: userType,
        userType: userType
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || userType,
        userType: userType,
        type: user.type, // Include the actual type
        company: user.company,
        ...((userType === 'admin' || userType === 'manager' || userType === 'meal_collector') && { 
          companyId: user.companyId?._id || user.companyId, 
          companyName: user.companyId?.name || 'Unknown Company',
          placeId: user.placeIds,
          placeName: user.placeId?.name || 'Unknown Place',
          locationId: user.locationId 
        }),
        ...(userType === 'superadmin' && { permissions: user.permissions })
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: "Login failed", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
};
