const Applicable = require('../models/applicableModel');

// One-time seed
exports.seedOnce = async (_req, res) => {
  try {
    const names = [
      'Intrastate',      // (aapne "Intetrastate" likha tha; yaha correct kiya)
      'Interstate',
      'Union Territory'  // (aapne "Union tererarity" likha tha; yaha correct kiya)
    ];

    const ops = names.map(n => ({
      updateOne: {
        filter: { name: n },
        update: { $setOnInsert: { name: n } },
        upsert: true
      }
    }));

    const result = await Applicable.bulkWrite(ops);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// List all
exports.list = async (_req, res) => {
  try {
    const rows = await Applicable.find().sort({ name: 1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
