const Places = require('../models/placeModel');
const Location = require('../models/locationModel'); 
const mongoose = require('mongoose');

// Get All place by company id
exports.placeByCompnyId = async (req,res)=>{
  try{
const {id} = req.params
  const places = await Places.find({ company: new mongoose.Types.ObjectId(id), isActive: true });
  res.status(200).json(places);
  }catch(err){
res.status(500).json({ success: false, message: "Error loading places" });
  }
  
}

// Get places by company ID
exports.getPlacesByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const places = await Places.find({ company: companyId }, "name").lean();
    console.log("places---------",places)
    res.status(200).json({ success: true, data: places });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error loading places" });
  }
};

//  Get all places  
exports.getAllPlaces = async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = {};
    
    // If companyId is provided, filter by company
    if (companyId) {
      query.company = companyId;
    }
    
    const places = await Places.find(query)
      .populate('company', 'name') 
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: places });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

//  Get place by ID
exports.getPlaceById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid place ID' });
  }

  try {
    const place = await Places.findById(id)
      .populate('company', 'name')
      .lean();

    if (!place) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }

    res.status(200).json({ success: true, data: place });
  } catch (error) {
    console.error('Error fetching place by ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getLocationsByPlace = async (req, res) => {
  try {
    const { placeId } = req.params;
    const locations = await Location.find({ placeId }).lean();

    if (!locations || locations.length === 0) {
      return res.status(404).json({ message: 'No locations found for this placeId' });
    }

    res.json(locations);
  } catch (err) {
    console.error('Error in getLocationsByPlace:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

//  Create a new place
exports.createPlace = async (req, res) => {
  const { name, description, gst_no, fssai_no, pan_no, company, isActive } = req.body;

  if (!name || !company) {
    return res.status(400).json({ success: false, message: 'Place name and company are required' });
  }

  try {
    console.log("------------->",req.user)
    const newPlace = await Places.create({
      name,
      description,
      gst_no,
      fssai_no,
      pan_no,
      company,
      isActive: isActive === "false" ? false : true,
      createdBy: req.user?.name,
      updatedBy: req.user?.name
    });

    res.status(201).json({ success: true, data: newPlace });
  } catch (error) {
    console.error('Error creating place:', error);

    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Place name must be unique' });
    }

    res.status(500).json({ success: false, message: 'Server error' });
  }
};

//  Update a place
exports.updatePlace = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid place ID' });
  }

  try {
    const updateData = {
      ...req.body,
      updatedBy: req.user?.name
    };

    const updatedPlace = await Places.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedPlace) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }

    res.status(200).json({ success: true, data: updatedPlace });
  } catch (error) {
    console.error('Error updating place:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


//  Delete a place
exports.deletePlace = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid place ID' });
  }

  try {
    const deletedPlace = await Places.findByIdAndDelete(id);

    if (!deletedPlace) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }

    res.status(200).json({ success: true, message: 'Place deleted successfully' });
  } catch (error) {
    console.error('Error deleting place:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
