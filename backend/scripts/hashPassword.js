const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/canteen_db');

const SuperAdmin = require('../models/superAdminModel');

async function hashSuperAdminPassword() {
    try {
        // Find the superadmin with plain text password
        const superadmin = await SuperAdmin.findOne({ email: 'nntsoftware@gmail.com' });
        
        if (!superadmin) {
            console.log('Superadmin not found');
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash('nnt123456', 10);
        
        // Update the password
        superadmin.password = hashedPassword;
        await superadmin.save();
        
        console.log('Password hashed successfully');
        console.log('You can now login with:');
        console.log('Email: nntsoftware@gmail.com');
        console.log('Password: nnt123456');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

hashSuperAdminPassword(); 