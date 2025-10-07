const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Place name is required'],
  },
  description: {
    type: String,
    trim: true
  },
  gst_no: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GST number format'
    }
  },
  fssai_no: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{14}$/.test(v);
      },
      message: 'Invalid FSSAI number format'
    }
  },
  pan_no: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
      },
      message: 'Invalid PAN number format'
    }
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    required: true
  },
}, {
  timestamps: true  
});

module.exports = mongoose.model('Places', placeSchema);
