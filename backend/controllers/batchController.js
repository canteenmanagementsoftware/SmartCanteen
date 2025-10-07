const mongoose = require('mongoose');
const Batch = require('../models/batchModel');
require('../models/placeModel');      
require('../models/locationModel');
require('../models/companyModel'); 
require('../models/batchModel')

// Get all batches
exports.getAllBatches = async (req, res) => {
    try {
        const { companyId } = req.query;
        let query = {};
        
        // If companyId is provided, filter by company
        if (companyId) {
            query.company_id = companyId;
        }
        
        const batches = await Batch.find(query)
            .populate('company_id', 'name')
            .populate('semester', 'semesterName')
            .populate('place_id', 'name')
            .populate('location_id', 'locationName')
            .sort({ created_at: -1 })
            .lean();

        batches.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return 0;
        });

        res.json(batches);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Server error while fetching batches' });
    }
};

// Get batch by ID
exports.getBatchById = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid batch ID' });
    }

    try {
        const batch = await Batch.findById(id)
            .populate('company_id', 'name')
            .populate('semester', 'semesterName')
            .populate('place_id', 'name')
            .populate('location_id', 'locationName')
            .lean();

        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        res.json(batch);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Server error while fetching batch' });
    }
};

exports.getBatchesByLocation = async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const batches = await Batch.find({ locationId });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: "Failed to get batches", error });
  }
};

// Create batch (Only admin should access this route)
exports.createBatch = async (req, res) => {
    const {
        batch_name,
        year,
        place_id,
        location_id,
        company_id,
        semester,
        description,
        status
    } = req.body;

    if (!batch_name || !year || !place_id || !location_id || !company_id || !semester) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const existing = await Batch.findOne({ batch_name });
        if (existing) {
            return res.status(409).json({ message: 'Batch name already exists' });
        }

        const batch = await Batch.create({
            batch_name,
            year,
            place_id,
            location_id,
            company_id,
            semester,
            description,
            status
        });

        const populatedBatch = await Batch.findById(batch._id)
            .populate('company_id', 'name')
            .populate('semester', 'semesterName')
            .populate('place_id', 'name')
            .populate('location_id', 'locationName')
            .lean();

        res.status(201).json(populatedBatch);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Server error while creating batch' });
    }
};

// Update batch
exports.updateBatch = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid batch ID' });
    }

    try {
        const batch = await Batch.findById(id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const updatedBatch = await Batch.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true }
        )
            .populate('place_id', 'name')
            .populate('location_id', 'locationName')
            .lean();

        res.json(updatedBatch);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Server error while updating batch' });
    }
};

// Delete batch
exports.deleteBatch = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid batch ID' });
    }

    try {
        const batch = await Batch.findById(id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        await Batch.findByIdAndDelete(id);
        res.json({ message: 'Batch deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || 'Server error while deleting batch' });
    }
};

// 🔹 Get all batches by placeId
exports.getBatchesByPlace = async (req, res) => {
    console.log("---- enter in server -----")
  try {
    const { placeId } = req.params;
    if (!placeId) {
        return res.status(400).json({ message: "placeId is required" });
    }
    
    const batches = await Batch.find({ place_id: placeId }).populate("place_id", "name");

    if (!batches.length) {
      return res.status(404).json({ message: "No batches found for this place" });
    }

    res.status(200).json(batches);
  } catch (err) {
    console.error("Error fetching batches by place:", err);
    res.status(500).json({ message: "Server Error" });
  }
};