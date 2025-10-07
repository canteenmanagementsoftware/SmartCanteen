const TaxProfile = require('../models/taxProfileModel');

// CREATE
exports.createTaxProfile = async (req, res) => {
  try {
    const { taxProfile, taxPercentage, totalTaxPercentage, percentages = [] } = req.body;
    const finalTaxPercentage = taxPercentage ?? totalTaxPercentage;

    if (!taxProfile?.trim() || finalTaxPercentage === undefined || finalTaxPercentage === null) {
      return res.status(400).json({ message: 'Tax Profile and Percentage are required' });
    }
    const num = Number(finalTaxPercentage);
    if (!Number.isFinite(num) || num < 0) {
      return res.status(400).json({ message: 'Percentage must be a non-negative number' });
    }

    // sanitize rows
    const clean = Array.isArray(percentages) ? percentages
      .map(p => ({
        tax: p.taxId,
        percentage: Number(p.percentage),
        applicability: p.applicabilityId
      }))
      .filter(p => p.tax && p.applicability && Number.isFinite(p.percentage) && p.percentage >= 0)
      : [];
    if (!clean.length) {
      return res.status(400).json({ message: 'At least one valid percentage row is required' });
    }

    const created = await TaxProfile.create({
      taxProfile: taxProfile.trim(),
      taxPercentage: num,
      percentages: clean,

      isDeleted: false,
      createdById:   req.user?._id || null,
      createdByType: req.userType || null,

      modifiedById:   null,
      modifiedByType: null,
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
exports.updateTaxProfile = async (req, res) => {
  try {
    const { taxProfile, taxPercentage, totalTaxPercentage, percentages } = req.body;

    const doc = await TaxProfile.findById(req.params.id);
    if (!doc || doc.isDeleted) return res.status(404).json({ message: 'Not found' });

    if (taxProfile !== undefined) doc.taxProfile = String(taxProfile).trim();
    if (taxPercentage !== undefined || totalTaxPercentage !== undefined) {
      const finalTax = Number(taxPercentage ?? totalTaxPercentage);
      if (!Number.isFinite(finalTax) || finalTax < 0) {
        return res.status(400).json({ message: 'Percentage must be a non-negative number' });
      }
      doc.taxPercentage = finalTax;
    }
    if (Array.isArray(percentages)) {
      const clean = percentages
        .map(p => ({ tax: p.taxId, percentage: Number(p.percentage), applicability: p.applicabilityId }))
        .filter(p => p.tax && p.applicability && Number.isFinite(p.percentage) && p.percentage >= 0);
      if (!clean.length) return res.status(400).json({ message: 'At least one valid percentage row is required' });
      doc.percentages = clean;
    }

    doc.modifiedById   = req.user?._id || null;
    doc.modifiedByType = req.userType || null;

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// SOFT DELETE
exports.deleteTaxProfile = async (req, res) => {
  try {
    const doc = await TaxProfile.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Tax profile not found' });

    if (!doc.isDeleted) {
      doc.isDeleted = true;
      doc.modifiedById   = req.user?._id || null;
      doc.modifiedByType = req.userType || null;
      await doc.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LIST (only non-deleted)
exports.getTaxProfiles = async (_req, res) => {
  try {
    const data = await TaxProfile.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .populate('percentages.tax', 'name')
      .populate('percentages.applicability', 'name');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
