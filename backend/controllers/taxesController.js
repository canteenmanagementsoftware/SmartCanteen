const Taxes = require('../models/taxesModel');

// POST /taxes
exports.createTax = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const doc = await Taxes.create({
      name: name.trim(),
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      // duplicate name
      return res.status(409).json({ success: false, message: 'Tax name already exists' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// (optional) GET /taxes — list for loading into UI
exports.listTaxes = async (_req, res) => {
  try {
    const docs = await Taxes.find().sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.deleteTax = async (req, res) => {
  try {
    const del = await Taxes.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};