const mongoose = require("mongoose");
const Fees = require("../models/feesModel");
const Places = require("../models/placeModel");
const Location = require("../models/locationModel");
const Batch = require("../models/batchModel");
const User = require("../models/userMasterModel");
const TaxProfile = require("../models/taxProfileModel");

// helper: read breakup from TaxProfile doc
function extractSgstCgst(tp) {
  let sgstPct = 0, cgstPct = 0;

  const arr = Array.isArray(tp?.percentages) ? tp.percentages : [];
  for (const row of arr) {
    const tName =
      (row?.tax?.name || row?.tax?.taxName || row?.tax?.code || "")
        .toString()
        .toUpperCase();

    if (tName.includes("SGST")) sgstPct = Number(row.percentage) || sgstPct;
    if (tName.includes("CGST")) cgstPct = Number(row.percentage) || cgstPct;
  }

  // fallback: if names not present, use first two rows as SGST/CGST
  if (!sgstPct && !cgstPct && arr.length >= 2) {
    sgstPct = Number(arr[0]?.percentage) || 0;
    cgstPct = Number(arr[1]?.percentage) || 0;
  }

  const totalPct =
    typeof tp?.taxPercentage === "number"
      ? tp.taxPercentage
      : (sgstPct + cgstPct);

  return { sgstPct, cgstPct, totalPct };
}

exports.getFeeById = async (req, res) => {
  try {
    const fee = await Fees.findById(req.params.id)
      .populate("userId", "firstName lastName")
      .populate("companyId", "name")
      .populate("placeId", "name")
      .populate("locationId", "locationName")
      .populate("batchId", "batch_name")
      .populate("taxProfileId", "taxProfile taxPercentage");
    if (!fee) return res.status(404).json({ message: "Fee not found" });
    res.json(fee);
  } catch (err) {
    res.status(500).json({ message: "Error fetching fee", error: err.message });
  }
};

// controllers/feesController.js
exports.createFees = async (req, res) => {
  try {
    if (!req.body.userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // normalize status
    const status = String(req.body.status || "pending").toLowerCase();

    // includingGST normalize
    const rawGST = req.body.includingGST;
    const includingGST = Array.isArray(rawGST)
      ? rawGST.some((v) => String(v).toLowerCase() === "true")
      : String(rawGST ?? "false").toLowerCase() === "true";

    // GST %: Prefer server-side from taxProfileId
    let gstPercent, sgstPct = 0, cgstPct = 0;
let taxProfileId = req.body.taxProfileId;

if (taxProfileId && mongoose.Types.ObjectId.isValid(taxProfileId)) {
  const tp = await TaxProfile.findOne({
    _id: taxProfileId,
    isDeleted: { $ne: true },
  })
    .select("taxPercentage percentages")
    .populate("percentages.tax", "name taxName code shortName type");

  if (!tp) return res.status(400).json({ message: "Invalid taxProfileId" });

  const br = extractSgstCgst(tp);
  gstPercent = Number(br.totalPct) || 0;     // total %
  sgstPct    = Number(br.sgstPct) || 0;      // e.g. 9
  cgstPct    = Number(br.cgstPct) || 0;      // e.g. 9
} else {
  // legacy fallback (agar profile nahi bheja)
  gstPercent = Number(req.body.gstPercent ?? 0);
  sgstPct = gstPercent / 2;
  cgstPct = gstPercent / 2;
  taxProfileId = null;
}

const SGST_RATE = sgstPct / 100;
const CGST_RATE = cgstPct / 100;
const GST_RATE  = (sgstPct + cgstPct) / 100;   // == gstPercent/100

// Amount from form
const amount = Number(req.body.amount) || 0;

// Derive net/gross with exact breakup
let netAmount, totalAmount, sgstAmount, cgstAmount;
if (includingGST) {
  totalAmount = amount;
  netAmount   = amount / (1 + GST_RATE);
} else {
  netAmount   = amount;
  totalAmount = netAmount * (1 + GST_RATE);
}
sgstAmount = netAmount * SGST_RATE;
cgstAmount = netAmount * CGST_RATE;

    // 💡 Provide backend defaults ONLY if your schema still requires them
    // If status is pending, you may keep them undefined (if schema changed as above)
    let paymentMode = req.body.paymentMode;
    let paymentDate = req.body.paymentDate;
    if (!paymentMode && status === "paid") paymentMode = "Cash";
    if (!paymentDate && status === "paid") paymentDate = new Date();

    // assignmentIds[] may come as string or array
    let assignmentIdsRaw =
      req.body["assignmentIds[]"] ??
      req.body.assignmentIds ??
      req.body.assignmentId; // fallback
    if (assignmentIdsRaw && !Array.isArray(assignmentIdsRaw)) {
      assignmentIdsRaw = [assignmentIdsRaw];
    }
    const assignmentIds = (assignmentIdsRaw || [])
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));

    // items snapshot (optional but recommended)
    let items = [];
    if (req.body.items) {
      try {
        items = JSON.parse(req.body.items);
      } catch {}
      items = Array.isArray(items) ? items : [];
      // sanitize
      items = items.map((i) => ({
        assignmentId: i.assignmentId
          ? new mongoose.Types.ObjectId(i.assignmentId)
          : undefined,
        packageName: String(i.packageName || ""),
        price: Number(i.price) || 0,
      }));
    }

    const feeData = {
      taxProfileId,
      userId: req.body.userId,
      companyId: req.body.companyId,
      placeId: req.body.placeId,
      locationId: req.body.locationId,
      batchId: req.body.batchId,
      semester: req.body.semester,
      amount, // original amount from form (for reference)
      paymentMode,
      paymentDate,
      includingGST,
      status,
      // include only if present (so pending can skip them if schema allows)
      ...(paymentMode ? { paymentMode } : {}),
      ...(paymentDate ? { paymentDate } : {}),
      receipt: req.file ? req.file.filename : null,

      // NEW snapshots
      gstPercent,
      netAmount: Number(netAmount.toFixed(2)),
      sgstAmount: Number(sgstAmount.toFixed(2)),
      cgstAmount: Number(cgstAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),

      // Multi-package
      assignmentIds,
      items,
    };

    const newFees = await Fees.create(feeData);

    // Keep user flag in sync (as you already do)
    if (newFees.status === "paid") {
      await User.findByIdAndUpdate(req.body.userId, { isFeePaid: true });
    }

    res.status(201).json(newFees);
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ message: "Error creating fees entry", error: err.message });
  }
};

exports.getAllFees = async (req, res) => {
  try {
    const {
      companyId: qCompanyId,
      place: qPlaceId,
      locationId: qLocationId,
      fromDate,
      toDate,
      userName, // partial name
    } = req.query;

    const query = {};

    // Hard scope non-superadmin to their company
    if (req.userType !== "superadmin") {
      const myCompanyId =
        req.user?.companyId?._id ||
        req.user?.companyId ||
        req.user?.company?._id;

      if (!myCompanyId) {
        return res.status(400).json({ message: "Your company is not set." });
      }
      query.companyId = myCompanyId;
    } else {
      // Superadmin can optionally filter by company
      if (qCompanyId) query.companyId = qCompanyId;
    }

    // Optional independent filters
    if (qPlaceId) query.placeId = qPlaceId;
    if (qLocationId) query.locationId = qLocationId;

    // Optional date range on paymentDate (inclusive)
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(new Date(toDate).setHours(23, 59, 59, 999));
      query.paymentDate = { $gte: start, $lte: end };
    }

    // Base query
    let fees = await Fees.find(query)
      .populate({
        path: "userId",
        select: "firstName lastName uniqueId employeeId",
        match: userName
          ? {
              $or: [
                { firstName: { $regex: userName, $options: "i" } },
                { lastName: { $regex: userName, $options: "i" } },
              ],
            }
          : {},
      })
      .populate("companyId", "name")
      .populate("placeId", "name")
      .populate("locationId", "locationName")
      .populate("batchId", "batch_name");

    // If userName filter was applied via populate.match,
    // remove documents where the user didn't match (userId got filtered out).
    if (userName) {
      fees = fees.filter((f) => !!f.userId);
    }

    // Optional computed fields (kept from your version)
    const transformedFees = fees.map((fee) => ({
      ...fee.toObject(),
      studentName: fee.userId
        ? `${fee.userId.firstName} ${fee.userId.lastName}`
        : "Unknown",
      studentId: fee.userId?.employeeId || "N/A",
      batchName: fee.batchId?.batchName || "N/A",
    }));

    res.json(transformedFees);
  } catch (err) {
    console.error("Error in getAllFees:", err);
    res
      .status(500)
      .json({ message: "Error fetching fees", error: err.message });
  }
};

exports.getFeesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const fees = await Fees.find({ userId }).populate(
      "companyId placeId locationId batchId"
    );

    res.status(200).json(fees);
  } catch (err) {
    console.error("Error fetching fees by user:", err);
    res
      .status(500)
      .json({ message: "Error fetching fees", error: err.message });
  }
};

exports.getPlacesByCompany = async (req, res) => {
  try {
    const places = await Places.find({ company: req.params.companyId }); // correct field: 'company'
    res.json(places);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching places", error: err.message });
  }
};

exports.getLocationsByPlace = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ message: "Invalid place ID" });
    }

    const locations = await Location.find({
      placeId: new mongoose.Types.ObjectId(placeId),
    });
    res.status(200).json(locations);
  } catch (err) {
    console.error("Error fetching locations:", err);
    res
      .status(500)
      .json({ message: "Error fetching locations", error: err.message });
  }
};

exports.getBatchesByLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ message: "Invalid location ID" });
    }

    const batches = await Batch.find({
      location_id: new mongoose.Types.ObjectId(locationId),
    });

    res.status(200).json(batches);
  } catch (err) {
    console.error("Error fetching batches by location:", err);
    res.status(500).json({
      message: "Error fetching batches",
      error: err.message,
    });
  }
};

exports.downloadReceipts = async (req, res) => {
  try {
    const fee = await Fees.findById(req.params.id);
    if (!fee || !fee.receipt) return res.status(404).send("Receipt not found");

    // Path where receipts are stored
    const filePath = `./uploads/company-logos/${fee.receipt}`;

    res.download(filePath, fee.receipt); // sends file to browser
  } catch (err) {
    res.status(500).send("Failed to download receipt");
  }
};

exports.updateFees = async (req, res) => {
  try {
    const { id } = req.params;

    // agar body me galti se _id aa bhi gaya ho to hata do
    if (req.body._id) delete req.body._id;

    // If tax profile or GST-related fields are changing, recompute snapshots
    const willRecalc =
      "taxProfileId" in req.body ||
      "gstPercent" in req.body ||
      "includingGST" in req.body ||
      "amount" in req.body;

    if (willRecalc) {
      // Resolve tax profile → gstPercent
      let gstPercent, sgstPct = 0, cgstPct = 0;

if (req.body.taxProfileId && mongoose.Types.ObjectId.isValid(req.body.taxProfileId)) {
  const tp = await TaxProfile.findOne({
    _id: req.body.taxProfileId,
    isDeleted: { $ne: true },
  })
    .select("taxPercentage percentages")
    .populate("percentages.tax", "name taxName code shortName type");

  if (!tp) return res.status(400).json({ message: "Invalid taxProfileId" });

  const br   = extractSgstCgst(tp);
  gstPercent = Number(br.totalPct) || 0;
  sgstPct    = Number(br.sgstPct) || 0;
  cgstPct    = Number(br.cgstPct) || 0;

} else if ("gstPercent" in req.body) {
  // legacy: agar direct % bheja gaya
  gstPercent = Number(req.body.gstPercent) || 0;
  sgstPct = gstPercent / 2;
  cgstPct = gstPercent / 2;

} else {
  // fallback: existing doc se total % uthao (breakup unknown ⇒ 50–50)
  const existing = await Fees.findById(id).select("gstPercent");
  gstPercent = existing?.gstPercent ?? 0;
  sgstPct = gstPercent / 2;
  cgstPct = gstPercent / 2;
}

const SGST_RATE = sgstPct / 100;
const CGST_RATE = cgstPct / 100;
const GST_RATE  = (sgstPct + cgstPct) / 100;

const amount = Number(req.body.amount);
const includingGST =
  String(req.body.includingGST ?? "false").toLowerCase() === "true";

let netAmount, totalAmount, sgstAmount, cgstAmount;
if (includingGST) {
  totalAmount = amount;
  netAmount   = amount / (1 + GST_RATE);
} else {
  netAmount   = amount;
  totalAmount = amount * (1 + GST_RATE);
}
sgstAmount = netAmount * SGST_RATE;
cgstAmount = netAmount * CGST_RATE;

req.body.gstPercent  = Number(gstPercent);
req.body.netAmount   = Number(netAmount.toFixed(2));
req.body.sgstAmount  = Number(sgstAmount.toFixed(2));
req.body.cgstAmount  = Number(cgstAmount.toFixed(2));
req.body.totalAmount = Number(totalAmount.toFixed(2));
    }

    const updatedFee = await Fees.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedFee) {
      return res.status(404).json({ message: "Fee not found" });
    }

    // ✅ sync with User
    if (updatedFee.status === "paid") {
      await User.findByIdAndUpdate(updatedFee.userId, { isFeePaid: true });
    } else if (updatedFee.status === "pending") {
      const paidFees = await Fees.findOne({
        userId: updatedFee.userId,
        status: "paid",
      });
      if (!paidFees) {
        await User.findByIdAndUpdate(updatedFee.userId, { isFeePaid: false });
      }
    }
    res.status(200).json(updatedFee);
  } catch (err) {
    console.error("Error updating fee:", err);
    res.status(500).json({ message: "Error updating fee", error: err.message });
  }
};

exports.deleteFees = async (req, res) => {
  try {
    // Find and delete fee
    const deleted = await Fees.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Fee not found" });
    }

    // Reset user.feeId and isFeePaid
    await User.findByIdAndUpdate(deleted.userId, {
      $set: { feeId: null, isFeePaid: false },
    });

    res.status(200).json({ message: "Fee deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting fee", error: err.message });
  }
};


exports.listTaxProfiles = async (req, res) => {
  console.log("enter in server--")
  try {
    const docs = await TaxProfile.find({ isDeleted: { $ne: true } })
      .select("_id taxProfile taxPercentage")
      .sort({ taxPercentage: 1 });
      console.log(docs)
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching tax profiles", error: err.message });
  }
};


exports.getTaxProfileById = async (req, res) => {
  try {
    const { profileId } = req.params;
    const tp = await TaxProfile.findOne({
      _id: profileId,
      isDeleted: { $ne: true },
    })
      .select("_id taxProfile taxPercentage percentages")
      .populate("percentages.tax", "name taxName code shortName type");

    if (!tp) return res.status(404).json({ message: "Tax profile not found" });

    const breakup = extractSgstCgst(tp);
    res.json({ ...tp.toObject(), breakup });
  } catch (err) {
    res.status(500).json({ message: "Error fetching tax profile", error: err.message });
  }
};
