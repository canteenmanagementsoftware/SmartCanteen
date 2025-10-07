const jwt = require('jsonwebtoken');
const AdminUser = require('../models/adminUserModel');
const SuperAdmin = require('../models/superAdminModel');

// Universal authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user;

        // Find user based on userType
        switch (decoded.userType) {
            case 'superadmin':
                user = await SuperAdmin.findById(decoded.id).select('-password');
                break;
            case 'admin':
            case 'manager':
            case 'meal_collector':
            default:
                user = await AdminUser.findById(decoded.id).select('-password');
                break;
        }


        if (!user) {
            return res.status(401).json({ message: 'User not found.' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated.' });
        }

        req.user = user;
        req.userType = decoded.userType;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const userRole = req.user.role || req.userType;
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({ 
                message: 'Access denied. Insufficient permissions.' 
            });
        }

        next();
    };
};

// Super admin only middleware
const superAdminOnly = (req, res, next) => {
    if (!req.user || req.userType !== 'superadmin') {
        return res.status(403).json({ 
            message: 'Access denied. Super admin privileges required.' 
        });
    }
    next();
};

// Admin only middleware
const adminOnly = (req, res, next) => {
    if (!req.user || (req.userType !== 'admin' && req.userType !== 'superadmin')) {
        return res.status(403).json({ 
            message: 'Access denied. Admin privileges required.' 
        });
    }
    next();
};

// Admin and Manager middleware
const adminManagerOnly = (req, res, next) => {
    if (!req.user || (req.userType !== 'admin' && req.userType !== 'superadmin' && req.userType !== 'manager' && req.userType !== 'meal_collector')) {
        return res.status(403).json({ 
            message: 'Access denied. Admin, Manager, or Meal Collector privileges required.' 
        });
    }               
    next();
};

// Permission-based middleware for super admin
const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user || req.userType !== 'superadmin') {
            return res.status(403).json({ 
                message: 'Access denied. Super admin privileges required.' 
            });
        }

        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({ 
                message: `Access denied. ${permission} permission required.` 
            });
        }

        next();
    };
};

module.exports = { auth, authorize, superAdminOnly, adminOnly, adminManagerOnly, hasPermission };
