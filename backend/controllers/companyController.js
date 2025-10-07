const Company = require("../models/companyModel");
const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");

const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, "..", "uploads", "company-logos");
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};


// Get all companies
exports.getCompanies = async (req, res) => {
  try {
    let query = {};
    
    // If user is admin (not superadmin), only show their company
    if (req.userType === 'admin') {
      if (req.user.companyId) {
        query._id = req.user.companyId;
      } else {
        // If admin has no companyId, try to assign them to a default company
        const AdminUser = require("../models/adminUserModel");
        
        // Find the first available company or create a default one
        let defaultCompany = await Company.findOne({});
        
        if (!defaultCompany) {
          // Create a default company if none exists
          defaultCompany = await Company.create({
            name: `${req.user.name}'s Company`,
            email: req.user.email,
            contactNumber: '0000000000',
            address: 'Default Address',
            isActive: true,
            collectionType: 'face'
          });
        }
        
        // Assign the company to the admin user
        await AdminUser.findByIdAndUpdate(req.user._id, { companyId: defaultCompany._id });
        
        // Return only this company
        query._id = defaultCompany._id;
      }
    }
    
    const companies = await Company.find(query).lean();
    res.json(companies);
  } catch (error) {
    console.error('Error in getCompanies:', error);
    res.status(500).json({ message: "Error fetching companies", error: error.message });
  }
};

// Get company by ID
exports.getCompanyById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid company ID" });
  }

  const company = await Company.findById(id).lean();
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  res.json(company);
};

// Add a new company
exports.addCompany = async (req, res) => {
  try {
    // Only superadmin can create companies
    if (req.userType !== 'superadmin') {
      if (req.file) await fs.unlink(req.file.path);
      return res.status(403).json({ message: "Only superadmin can create companies" });
    }

    await ensureUploadDir();

    const { name, email, contactNumber, address, isActive, collectionType } = req.body;

    if (!name || !email || !contactNumber || !address) {
      if (req.file) await fs.unlink(req.file.path);
      return res.status(400).json({
        message: "Name, email, contact number, and address are required.",
      });
    }

    if (!/^[0-9]{10}$/.test(contactNumber)) {
      if (req.file) await fs.unlink(req.file.path);
      return res.status(400).json({ message: "Contact number must be 10 digits." });
    }

    const existingCompany = await Company.findOne({ email }).lean();
    if (existingCompany) {
      if (req.file) await fs.unlink(req.file.path);
      return res.status(400).json({ message: "Company with this email already exists" });
    }

    const validTypes = ["face", "card", "both"];
    if (collectionType && !validTypes.includes(collectionType)) {
      if (req.file) await fs.unlink(req.file.path); 
      return res.status(400).json({ message: "Invalid collectionType value" });
    }

    const companyData = {
      name,
      email,
      contactNumber,
      address,
      isActive: isActive === "true" ? true : false,
      logo: req.file ? `/uploads/company-logos/${req.file.filename}` : null,
      collectionType: collectionType || "face",
    };

    const company = await Company.create(companyData);

    res.status(201).json({  
      message: "Company created successfully",
      company,
    });
  } catch (error) {
    console.error("Add Company Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


// Update a company
exports.updateCompany = async (req, res) => {
  try {
    // Only superadmin can update companies, or admin can update their own company
    if (req.userType !== 'superadmin' && req.userType !== 'admin') {
      if (req.file) await fs.unlink(req.file.path);
      return res.status(403).json({ message: "Only superadmin and admin can update companies" });
    }

    // If admin, check if they're updating their own company
    if (req.userType === 'admin' && req.user.companyId?.toString() !== req.params.id) {
      if (req.file) await fs.unlink(req.file.path);
      return res.status(403).json({ message: "You can only update your own company" });
    }

    await ensureUploadDir();

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const { contactNumber, address, isActive, name, email, collectionType } = req.body;

    // Basic validation
    if (contactNumber && !/^\d{10}$/.test(contactNumber)) {
      return res.status(400).json({ message: "Contact number must be 10 digits." });
    }

    const validTypes = ["face", "card", "both"];
    if (collectionType && !validTypes.includes(collectionType)) {
      return res.status(400).json({ message: "Invalid collectionType value" });
    }

    const updatedData = {
      contactNumber,
      address,
      name,
      email,
      isActive: isActive === "true" || isActive === true,
      collectionType: collectionType || "face",
    };

    // handle file upload and delete old image
    if (req.file) {
      if (company.logo && typeof company.logo === "string") {
        const oldPath = path.join(__dirname, "..", company.logo);
        try {
          await fs.unlink(oldPath);
        } catch (err) {
          console.warn("Old logo deletion failed:", err.message);
        }
      }
      updatedData.logo = `/uploads/company-logos/${req.file.filename}`;
    }

    const updatedCompany = await Company.findByIdAndUpdate(id, updatedData, {
      new: true,
    }).lean();

    res.json({
      message: "Company updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Update Company Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};



// Delete a company
exports.deleteCompany = async (req, res) => {
  // Only superadmin can delete companies, or admin can delete their own company
  if (req.userType !== 'superadmin' && req.userType !== 'admin') {
    return res.status(403).json({ message: "Only superadmin and admin can delete companies" });
  }

  // If admin, check if they're deleting their own company
  if (req.userType === 'admin' && req.user.companyId?.toString() !== req.params.id) {
    return res.status(403).json({ message: "You can only delete your own company" });
  }

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid company ID" });
  }

  const company = await Company.findById(id);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  if (company.logo) {
    const logoPath = path.join(__dirname, "..", company.logo);
    try {
      await fs.unlink(logoPath);
    } catch (err) {
      // Ignore
    }
  }

  await Company.findByIdAndDelete(id);
  res.json({ message: "Company deleted successfully" });
};


