const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const superAdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    role: {
        type: String,
        default: 'superadmin',
        enum: ['superadmin']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    permissions: [{
        type: String,
        enum: ['manage_companies', 'manage_admins', 'manage_users', 'view_reports', 'system_settings']
    }]
}, {
    timestamps: true
});

// Password hash middleware
superAdminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema); 