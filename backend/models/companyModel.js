const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },      
    logo: {
        type: String,  
        default: null
    },    
    contactNumber: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    collectionType: {
        type: String,
        enum: ["face", "card", "both"],
        default: "face",
    },

}, {
    timestamps: true
});



module.exports = mongoose.model("Company", companySchema);


