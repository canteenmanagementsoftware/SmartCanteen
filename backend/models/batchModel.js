const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company', 
        required: [true, 'Company is required']
    },
    semester: {
        type: String,
        required: [true, 'Semester is required'],
        enum: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
    },
    batch_name: {
        type: String,
        required: [true, 'Batch name is required'],
        trim: true,
        unique: true
    },
    year: {
        type: Number,
        required: [true, 'Year is required'],
        min: [2000, 'Year cannot be less than 2000'],
        max: [2100, 'Year cannot be greater than 2100']
    },
    place_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Places',
        required: [true, 'Place is required']
    },
    location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: [true, 'Location is required']
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'modified_at'
    }
});

module.exports = mongoose.model('Batch', batchSchema);
