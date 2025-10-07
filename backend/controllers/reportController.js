const UserMaster = require("../models/userMasterModel");
const Fees = require("../models/feesModel");
const { Parser } = require("json2csv");
const MealEntry = require("../models/mealEntryModel");
const mongoose = require("mongoose");

// safe regex
const escapeRegExp = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// EOD helper
const endOfDay = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const parsePlaceIds = (q) => {
  let placeIds = q.placeIds ?? q['placeIds[]'] ?? [];
  if (typeof placeIds === 'string') {
    placeIds = placeIds.includes(',') ? placeIds.split(',') : [placeIds];
  }
  return Array.isArray(placeIds) ? placeIds.map(String).filter(Boolean) : [];
};

const intersect = (a = [], b = []) => {
  if (!a.length || !b.length) return [];
  const B = new Set(b.map(String));
  return a.map(String).filter((x) => B.has(x));
};

exports.getVisitorReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      companyId,
      locationId,
      packageId,
      userName,
      exportType,
    } = req.query;

    const filter = { role: "visitor" };

    if (fromDate && toDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
      };
    }

    if (companyId) filter.companyId = companyId;
    if (locationId) filter.locationId = locationId;
    if (packageId) filter.packageId = packageId;

    if (userName) {
      filter.$or = [
        { firstName: { $regex: userName, $options: "i" } },
        { lastName: { $regex: userName, $options: "i" } },
      ];
    }

    const visitors = await UserMaster.find(filter)
      .populate("companyId", "name")
      .populate("placeId", "name")
      .populate("locationId", "locationName")
      .populate("packageId", "name")
      .lean();

    if (exportType === "csv") {
      const fields = [
        { label: "First Name", value: "firstName" },
        { label: "Last Name", value: "lastName" },
        { label: "Unique ID", value: "uniqueId" },
        { label: "Email", value: "email" },
        { label: "Mobile", value: "mobileNo" },
        { label: "Card Number", value: "cardNumber" },
        { label: "Company", value: (row) => row.companyId?.name || "" },
        {
          label: "Location",
          value: (row) => row.locationId?.locationName || "",
        },
        { label: "Package", value: (row) => row.packageId?.name || "" },
        {
          label: "Created At",
          value: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(visitors);

      res.header("Content-Type", "text/csv");
      res.attachment("visitor_report.csv");
      return res.send(csv);
    }

    res.json({ success: true, data: visitors });
  } catch (error) {
    console.error("Error fetching visitor report:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getFeesReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      companyId,
      locationId,
      userName,
      status,
      place,
      semester,
      paymentMode,
      exportType,
    } = req.query;

    // Validate required filters
    if (!companyId?.trim() || !locationId?.trim() || !place?.trim()) {
      return res.json({ success: true, data: [] });
    }

    // Construct Mongo filter
    const filter = {
      companyId,
      locationId,
      placeId: place,
    };

    // Apply date filter conditionally
    if (fromDate && toDate) {
      filter.paymentDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    // Apply additional filters with safe checks
    if (semester?.trim()) filter.semester = semester.trim();
    if (paymentMode?.trim()) filter.paymentMode = paymentMode.trim();
    if (status) filter.status = status;

    // Query with population
    let fees = await Fees.find(filter)
      .populate({
        path: "userId",
        match: userName
          ? { firstName: { $regex: userName, $options: "i" } }
          : {},
        select: "firstName lastName uniqueId",
      })
      .populate("companyId", "name")
      .populate("locationId", "locationName")
      .populate("placeId", "name");

    // Remove records where user didn't match
    if (userName) {
      fees = fees.filter((f) => f.userId);
    }

    // CSV Export
    if (exportType === "csv") {
      const { Parser } = require("json2csv");
      const flatData = fees.map((f) => ({
        uniqueNumber: f.userId?.uniqueId || "-",
        user: `${f.userId?.firstName || ""} ${f.userId?.lastName || ""}`,
        semester: f.semester || "-",
        paymentMode: f.paymentMode || "-",
        netAmount: f.netAmount || 0,
        amount: f.amount || 0,
        place: f.placeId?.name || "-",
        packageCount: f.packageCount || "-",
        paymentDate: f.paymentDate?.toISOString().split("T")[0] || "-",
        startDate: f.startDate?.toISOString().split("T")[0] || "-",
        expireDate: f.expireDate?.toISOString().split("T")[0] || "-",
        createdAt: f.createdAt?.toISOString().split("T")[0] || "-",
        createdBy: f.createdBy || "-",
      }));

      const json2csv = new Parser();
      const csv = json2csv.parse(flatData);

      res.header("Content-Type", "text/csv");
      res.attachment("fees_report.csv");
      return res.send(csv);
    }

    return res.json({ success: true, data: fees });
  } catch (error) {
    console.error("Error fetching fees report:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getUtilizedReport = async (req, res) => {
  try {
    const { date, fromDate, toDate, companyId, placeId, locationId } =
      req.query;

    // ---- Build date window (optional) ----
    let timeMatch = null;
    if (date) {
      const s = new Date(date),
        e = new Date(date);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      timeMatch = { $gte: s, $lte: e };
    } else if (fromDate && toDate) {
      const s = new Date(fromDate),
        e = new Date(toDate);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      timeMatch = { $gte: s, $lte: e };
    }
    // NOTE: agar date bhi nahi hai to poori history consider hogi (caution: large datasets)

    // ---- Initial $match ----
    const baseMatch = {};
    if (timeMatch) baseMatch.timestamp = timeMatch;
    if (locationId && mongoose.isValidObjectId(locationId)) {
      baseMatch.locationId = new mongoose.Types.ObjectId(locationId);
    }

    const pipeline = [{ $match: baseMatch }];

    // ---- Company/Place via locations join (optional) ----
    const needLocJoin =
      (companyId && mongoose.isValidObjectId(companyId)) ||
      (placeId && mongoose.isValidObjectId(placeId));

    if (needLocJoin) {
      pipeline.push(
        {
          $lookup: {
            from: "locations",
            localField: "locationId",
            foreignField: "_id",
            as: "loc",
          },
        },
        { $unwind: "$loc" }
      );

      const locMatch = {};
      if (companyId && mongoose.isValidObjectId(companyId)) {
        locMatch["loc.companyId"] = new mongoose.Types.ObjectId(companyId);
      }
      if (placeId && mongoose.isValidObjectId(placeId)) {
        locMatch["loc.placeId"] = new mongoose.Types.ObjectId(placeId);
      }
      if (Object.keys(locMatch).length) pipeline.push({ $match: locMatch });
    }

    // ---- Add Place Lookup (Join Place Details) ----
    pipeline.push(
      {
        $lookup: {
          from: "places", // Assuming 'places' is the correct collection name
          localField: "placeId", // Field from the current document (your report data)
          foreignField: "_id", // Field in the 'places' collection
          as: "placeDetails", // The new field in the document that will contain place details
        },
      },
      { $unwind: "$placeDetails" } // Unwind if you expect only one place per entry
    );

    // ---- Users join ----
    pipeline.push(
      {
        $lookup: {
          from: "usermasters",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" }
    );

    // ---- Group (user-level totals across selected window) ----
    pipeline.push(
      {
        $group: {
          _id: {
            userId: "$userId",
            userName: {
              $concat: [
                { $ifNull: ["$userInfo.firstName", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
          },
          breakfast: {
            $sum: { $cond: [{ $eq: ["$mealType", "breakfast"] }, 1, 0] },
          },
          lunch: { $sum: { $cond: [{ $eq: ["$mealType", "lunch"] }, 1, 0] } },
          dinner: { $sum: { $cond: [{ $eq: ["$mealType", "dinner"] }, 1, 0] } },
          supper: { $sum: { $cond: [{ $eq: ["$mealType", "supper"] }, 1, 0] } },
          lateSnack: {
            $sum: { $cond: [{ $eq: ["$mealType", "lateSnack"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id.userId",
          userName: "$_id.userName",
          breakfast: { actual: "$breakfast", utilized: "$breakfast" },
          lunch: { actual: "$lunch", utilized: "$lunch" },
          dinner: { actual: "$dinner", utilized: "$dinner" },
          supper: { actual: "$supper", utilized: "$supper" },
          lateSnack: { actual: "$lateSnack", utilized: "$lateSnack" },
        },
      },
      { $sort: { userName: 1 } }
    );

    const report = await MealEntry.aggregate(pipeline).allowDiskUse(true);

    // Totals
    const totals = {
      breakfast: { actual: 0, utilized: 0 },
      lunch: { actual: 0, utilized: 0 },
      dinner: { actual: 0, utilized: 0 },
      supper: { actual: 0, utilized: 0 },
      lateSnack: { actual: 0, utilized: 0 },
    };
    for (const r of report) {
      for (const m of ["breakfast", "lunch", "dinner", "supper", "lateSnack"]) {
        totals[m].actual += r[m]?.actual || 0;
        totals[m].utilized += r[m]?.utilized || 0;
      }
    }

    console.log("reqst entered---------", report);

    // Shape: aapke front-end ne array expect kiya hai, to seedha array bhej do
    return res.json({
      success: true,
      data: report, // <- sirf array
      // NOTE: agar aap totals/summary bhi chahte ho to 'data: { users: report, totals, summary }' bhejein
    });
  } catch (err) {
    console.error("❌ getUtilizedReport:", err);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: err.message });
  }
};

exports.getDailyUtilizedReport = async (req, res) => {
  try {
    const {
      date,
      from,
      to,
      locationId,
      placeId,
      companyId,
      searchText,
      page = 1,
      limit = 500, // optional pagination (badhe datasets ke liye helpful)
    } = req.query;

    // 1) Base match: sab optional
    const match = {};

    // locationId optional
    if (locationId && mongoose.isValidObjectId(locationId)) {
      match.locationId = new mongoose.Types.ObjectId(locationId);
    }

    // date / range optional
    if (from || to) {
      // Front-end ne full ISO with timezone bheja hai -> as-is use karo
      const startDate = from ? new Date(from) : new Date(0);
      const endDate = to ? new Date(to) : new Date(8640000000000000); // max date
      match.timestamp = { $gte: startDate, $lte: endDate };
    } else if (date) {
      // Single date diya ho to us din ke IST bounds lo
      const startDate = new Date(`${date}T00:00:00.000+05:30`);
      const endDate = new Date(`${date}T23:59:59.999+05:30`);
      match.timestamp = { $gte: startDate, $lte: endDate };
    }

    // 2) Pipeline
    const pipeline = [{ $match: match }];

    // (Optional) place/company filter — agar MealEntry me placeId/companyId direct nahi hai,
    // to locations se join karke filter lagao
    if (
      (placeId && mongoose.isValidObjectId(placeId)) ||
      (companyId && mongoose.isValidObjectId(companyId))
    ) {
      pipeline.push(
        {
          $lookup: {
            from: "locations",
            localField: "locationId",
            foreignField: "_id",
            as: "loc",
          },
        },
        { $unwind: "$loc" }
      );

      const locMatch = {};
      if (placeId && mongoose.isValidObjectId(placeId)) {
        locMatch["loc.placeId"] = new mongoose.Types.ObjectId(placeId);
      }
      if (companyId && mongoose.isValidObjectId(companyId)) {
        locMatch["loc.companyId"] = new mongoose.Types.ObjectId(companyId);
      }
      if (Object.keys(locMatch).length) pipeline.push({ $match: locMatch });
    }

    // Users join (name/search ke liye)
    pipeline.push(
      {
        $lookup: {
          from: "usermasters",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $addFields: {
          fullName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$userInfo.firstName", ""] },
                  " ",
                  { $ifNull: ["$userInfo.lastName", ""] },
                ],
              },
            },
          },
        },
      }
    );

    // (Optional) searchText: name/empId/package pe search (jo fields aap chahein)
    if (searchText && String(searchText).trim()) {
      const rx = new RegExp(String(searchText).trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { fullName: rx },
            { "userInfo.firstName": rx },
            { "userInfo.lastName": rx },
            { "userInfo.employeeId": rx }, // agar field hai
            { packageName: rx }, // agar MealEntry me string field hai
            { "package.name": rx }, // agar lookup se aati hai (neeche)
          ],
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "packages",
          localField: "packageId",
          foreignField: "_id",
          as: "package",
        },
      },
      { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } }
    );

    // Group by user + date
    pipeline.push(
      {
        $group: {
          _id: {
            userId: "$userId",
            userName: {
              $concat: [
                { $ifNull: ["$userInfo.firstName", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          },
          breakfast: {
            $sum: { $cond: [{ $eq: ["$mealType", "breakfast"] }, 1, 0] },
          },
          lunch: {
            $sum: { $cond: [{ $eq: ["$mealType", "lunch"] }, 1, 0] },
          },
          dinner: {
            $sum: { $cond: [{ $eq: ["$mealType", "dinner"] }, 1, 0] },
          },
          supper: {
            $sum: { $cond: [{ $eq: ["$mealType", "supper"] }, 1, 0] },
          },
          lateSnack: {
            $sum: { $cond: [{ $eq: ["$mealType", "lateSnack"] }, 1, 0] },
          },
          // helpful for robust sorting later:
          maxTs: { $max: "$timestamp" },
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id.userId",
          userName: "$_id.userName",
          date: "$_id.date",
          breakfast: { actual: "$breakfast", utilized: "$breakfast" },
          lunch: { actual: "$lunch", utilized: "$lunch" },
          dinner: { actual: "$dinner", utilized: "$dinner" },
          supper: { actual: "$supper", utilized: "$supper" },
          lateSnack: { actual: "$lateSnack", utilized: "$lateSnack" },
          maxTs: 1,
        },
      },
      // sort by real timestamp desc (zyada reliable than string)
      { $sort: { maxTs: -1 } }
    );

    // (Optional) pagination – bada data ho to UI fast rahega
    const skip = (Number(page) - 1) * Number(limit);
    pipeline.push({ $skip: skip }, { $limit: Number(limit) });

    const report = await MealEntry.aggregate(pipeline);

    // 3) Totals
    const totals = {
      breakfast: { actual: 0, utilized: 0 },
      lunch: { actual: 0, utilized: 0 },
      dinner: { actual: 0, utilized: 0 },
      supper: { actual: 0, utilized: 0 },
      lateSnack: { actual: 0, utilized: 0 },
    };
    report.forEach((row) => {
      ["breakfast", "lunch", "dinner", "supper", "lateSnack"].forEach((m) => {
        totals[m].actual += row[m]?.actual || 0;
        totals[m].utilized += row[m]?.utilized || 0;
      });
    });

    const finalReport = {
      users: report,
      totals,
      summary: {
        totalRecords: report.length,
        // agar date ya range diya tha to echo back for UI
        date: date ? new Date(date) : null,
        from: from ? new Date(from) : null,
        to: to ? new Date(to) : null,
        isFiltered: Boolean(
          date || from || to || locationId || placeId || companyId || searchText
        ),
        page: Number(page),
        limit: Number(limit),
      },
    };

    res.json({ success: true, data: finalReport });
  } catch (err) {
    console.error("❌ Error in getDailyUtilizedReport:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

exports.getUsersReport = async (req, res) => {
  try {
    const { company, place, location, batch, search } = req.query;
    const queryPlaceIds = parsePlaceIds(req.query);

    // ---- Build one $elemMatch for packages[] so conditions ek hi assignment pe apply ho ----
    const elem = {};
    if (company) elem.companyId = company;
    if (location) elem.locationId = location;

    // place filter (prefer multi)
    if (queryPlaceIds.length) {
      elem.placeId = { $in: queryPlaceIds };
    } else if (place) {
      elem.placeId = place;
    }

    // ---- Role-based scoping (non-superadmin) ----
    const role = String(req.user?.role || req.userType || '').toLowerCase();
    const isSuper = role === 'superadmin';

    if (!isSuper) {
      // lock to user's company if present
      if (req.user?.companyId) {
        // combine with incoming company (if any)
        if (elem.companyId && String(elem.companyId) !== String(req.user.companyId)) {
          // impossible combo -> no results
          return res.json({ data: [] });
        }
        elem.companyId = req.user.companyId;
      }

      // admin / meal_collector: restrict to assigned places if provided on user
      const userPlaceIds = Array.isArray(req.user?.placeIds) ? req.user.placeIds.map(String) : [];

      if ((role === 'admin' || role === 'meal_collector') && userPlaceIds.length) {
        if (elem.placeId && elem.placeId.$in) {
          const filtered = intersect(elem.placeId.$in, userPlaceIds);
          if (!filtered.length) return res.json({ data: [] });
          elem.placeId = { $in: filtered };
        } else if (elem.placeId) {
          if (!userPlaceIds.includes(String(elem.placeId))) return res.json({ data: [] });
        } else {
          elem.placeId = { $in: userPlaceIds };
        }
      }
    }

    // ---- Build main filter ----
    const andClauses = [];
    if (Object.keys(elem).length) andClauses.push({ packages: { $elemMatch: elem } });

    if (batch) andClauses.push({ batchesId: batch });

    if (search && search.trim()) {
      const rx = new RegExp(escapeRegExp(search.trim()), 'i');
      andClauses.push({
        $or: [
          { firstName: rx },
          { lastName: rx },
          { uniqueId: rx },
          { mobileNo: rx },
        ],
      });
    }

    const filter = andClauses.length ? { $and: andClauses } : {};

    // ---- Query + nested populate ----
    const users = await UserMaster.find(filter)
      .select('firstName lastName uniqueId mobileNo role batchesId packages')
      .populate({ path: 'batchesId', select: 'name' })
      .populate({ path: 'packages.placeId', select: 'name' })
      .populate({ path: 'packages.locationId', select: 'locationName' })
      .populate({
        path: 'packages.packageId',
        select: 'name is_fixed_validity validity_days validity_date', // status package doc me ho ya na ho, yeh fields kafi hain
      })
      .lean();

    const now = new Date();

    // ---- Map each user to FE row (aggregate across packages[]) ----
    const rows = users.map((u) => {
      const pkgArr = Array.isArray(u.packages) ? u.packages : [];

      // Aggregates
      let minStart = null;
      let maxEnd = null;
      let totalCount = 0;
      let activeCount = 0;
      const placeNames = new Set();
      const locationNames = new Set();
      const packageNames = new Set();

      for (const a of pkgArr) {
        totalCount += 1;

        // names
        if (a.placeId && typeof a.placeId === 'object') {
          if (a.placeId.name) placeNames.add(a.placeId.name);
        }
        if (a.locationId && typeof a.locationId === 'object') {
          if (a.locationId.locationName) locationNames.add(a.locationId.locationName);
        }
        if (a.packageId && typeof a.packageId === 'object') {
          if (a.packageId.name) packageNames.add(a.packageId.name);
        }

        // date range aggregations
        if (a.startDate instanceof Date) {
          if (!minStart || a.startDate < minStart) minStart = a.startDate;
        }
        if (a.endDate instanceof Date) {
          if (!maxEnd || a.endDate > maxEnd) maxEnd = a.endDate;
        }

        // active calc (assignment.status + package validity rules)
        let isActive = false;
        const pkgDoc = a.packageId && typeof a.packageId === 'object' ? a.packageId : null;

        // NOTE: assignment-level status optional: 'scheduled' | 'active' | 'expired' | 'cancelled'
        const assignStatus = String(a.status || '').toLowerCase();

        if (assignStatus === 'active' && pkgDoc) {
          if (pkgDoc.is_fixed_validity === false) {
            const expiry = endOfDay(pkgDoc.validity_date);
            isActive = Boolean(expiry && now <= expiry);
          } else if (a.startDate instanceof Date && Number(pkgDoc.validity_days) > 0) {
            const end = new Date(a.startDate);
            end.setDate(end.getDate() + (Number(pkgDoc.validity_days) - 1));
            const last = endOfDay(end);
            isActive = Boolean(last && a.startDate <= now && now <= last);
          }
        }

        if (isActive) activeCount += 1;
      }

      const firstName = u.firstName || '';
      const lastName = u.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        _id: u._id,
        unique_number: u.uniqueId || '-',
        name: fullName || '-',
        mobile: u.mobileNo || '-',
        user_type: u.role || '-',
        start_date: minStart || null,         // earliest assignment start
        expiry_date: maxEnd || null,         // latest assignment end
        total_package: totalCount,
        active_package: activeCount,
        place: placeNames.size ? Array.from(placeNames).join(', ') : '-',
        location: locationNames.size ? Array.from(locationNames).join(', ') : '-',
        package_name: packageNames.size ? Array.from(packageNames).join(', ') : '-',
        batches: Array.isArray(u.batchesId) ? u.batchesId.map(b => b?.name).filter(Boolean) : [],
      };
    });

    res.json({ data: rows });
  } catch (err) {
    console.error('Error fetching user report:', err);
    res.status(500).json({
      message: 'Server Error',
      ...(process.env.NODE_ENV === 'development' ? { error: err.message } : {}),
    });
  }
};

// GET /report/unremoved-users
const fmt = (d) => new Date(d).toISOString().slice(0, 10);

exports.getUnremovedUsers = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      companyId,
      placeId,
      locationId,
      search,
      exportType,
    } = req.query;
    const now = new Date();

    const filter = {
      isActive: true,
      isRemoved: { $ne: true }, // include missing as not removed
    };

    if (companyId && mongoose.isValidObjectId(companyId))
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    if (placeId && mongoose.isValidObjectId(placeId))
      filter.placeId = new mongoose.Types.ObjectId(placeId);
    if (locationId && mongoose.isValidObjectId(locationId))
      filter.locationId = new mongoose.Types.ObjectId(locationId);

    if (fromDate && toDate) {
      // choose ONE style; here: UTC bounds
      const start = new Date(`${fromDate}T00:00:00.000Z`);
      const end = new Date(`${toDate}T23:59:59.999Z`);
      const effectiveEnd = end < now ? end : now;
      filter.endDate = { $gte: start, $lte: effectiveEnd };
    } else {
      filter.endDate = { $lt: now };
    }

    if (search && search.trim()) {
      const rx = new RegExp(escapeRegExp(search.trim()), "i");
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { uniqueId: rx },
        { mobileNo: rx },
        { email: rx },
      ];
    }

    console.log("UNREMOVED filter =>", filter);

    const users = await UserMaster.find(filter)
      .populate("companyId", "name")
      .populate("placeId", "name")
      .populate("locationId", "locationName")
      .sort({ endDate: -1 })
      .lean();

    // ... CSV branch / JSON response as before
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error fetching unremoved users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /report/remove-unremoved-users
exports.removeUnremovedUsers = async (req, res) => {
  try {
    const result = await UserMaster.updateMany(
      {
        isActive: true,
        isRemoved: false,
        endDate: { $lt: new Date() },
      },
      { $set: { isRemoved: true } }
    );

    res.json({
      message: `${result.modifiedCount} users marked as removed.`,
    });
  } catch (error) {
    console.error("Error removing users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// controllers/reportController.js
exports.getPendingFeesReport = async (req, res) => {
  try {
    const { companyId, locationId, place, semester, exportType } = req.query;

    const toObjectId = (id) => new mongoose.Types.ObjectId(id);
    const parsePrice = (v) => {
      if (v == null) return 0;
      if (typeof v === "number") return Number.isFinite(v) ? v : 0;
      if (typeof v === "string") {
        const n = Number(v.replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    // 1) Fees filters (all optional) — AND logic
    const feesMatch = {};
    if (companyId) feesMatch.companyId = toObjectId(companyId);
    if (place) feesMatch.placeId = toObjectId(place);
    if (locationId) feesMatch.locationId = toObjectId(locationId);
    if (semester) feesMatch.semester = semester;

    // 2) Aggregate Fees → users with pending/partial
    const feesAgg = await Fees.aggregate([
      { $match: feesMatch },
      {
        $group: {
          _id: "$userId",
          totalAmount: { $sum: "$amount" },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] },
          },
          lastStatus: { $last: "$status" },
          lastSemester: { $last: "$semester" },
          companyId: { $first: "$companyId" },
          placeId: { $first: "$placeId" },
          locationId: { $first: "$locationId" },
        },
      },
      {
        $match: {
          $or: [
            { lastStatus: "pending" },
            { $expr: { $lt: ["$paidAmount", "$totalAmount"] } },
          ],
        },
      },
    ]);

    const populatedAgg = await Fees.populate(feesAgg, [
      { path: "companyId", select: "name" },
      { path: "placeId", select: "name" },
      { path: "locationId", select: "locationName" },
      {
        path: "_id",
        model: "UserMaster",
        select: "firstName lastName email mobileNo",
      },
    ]);

    // 3) Users pending by flag (no fees rows). Only add if NO semester filter.
    const byUser = new Map();

    for (const r of populatedAgg) {
      const uDoc = r._id;
      const uid = String(uDoc?._id || r._id);
      const total = Number(r.totalAmount || 0);
      const paid = Number(r.paidAmount || 0);
      const pendingAmt = Math.max(0, total - paid);

      byUser.set(uid, {
        _id: uid,
        userId: {
          firstName: uDoc?.firstName || "",
          lastName: uDoc?.lastName || "",
          email: uDoc?.email || "",
          mobileNo: uDoc?.mobileNo || "",
        },
        totalFees: total,
        paidFees: paid,
        pendingAmount: pendingAmt,
        status: pendingAmt > 0 ? "pending" : r.lastStatus || "paid",
        semester: r.lastSemester || "-",
        companyId: r.companyId || null,
        placeId: r.placeId || null,
        locationId: r.locationId || null,
      });
    }

    if (!semester) {
      const userFilter = { isFeePaid: false };
      if (companyId) userFilter.companyId = toObjectId(companyId);
      if (place) userFilter.placeId = toObjectId(place);
      if (locationId) userFilter.locationId = toObjectId(locationId);

      const pendingUsers = await UserMaster.find(userFilter)
        .populate("companyId", "name")
        .populate("placeId", "name")
        .populate("locationId", "locationName")
        .populate({
          path: "packageId",
          select: "name price",
          model: "Packages",
        })
        .lean();

      for (const u of pendingUsers) {
        const uid = String(u._id);
        if (!byUser.has(uid)) {
          const pkgPrice = parsePrice(u.packageId?.price);
          byUser.set(uid, {
            _id: uid,
            userId: {
              firstName: u.firstName || "",
              lastName: u.lastName || "",
              email: u.email || "",
              mobileNo: u.mobileNo || "",
            },
            totalFees: pkgPrice,
            paidFees: 0,
            pendingAmount: pkgPrice,
            status: "pending",
            semester: "-", // unknown
            companyId: u.companyId || null,
            placeId: u.placeId || null,
            locationId: u.locationId || null,
          });
        } else {
          const ex = byUser.get(uid);
          if (ex.status !== "pending") ex.status = "pending";
          ex.companyId = ex.companyId || u.companyId || null;
          ex.placeId = ex.placeId || u.placeId || null;
          ex.locationId = ex.locationId || u.locationId || null;
          byUser.set(uid, ex);
        }
      }
    }

    const formatted = Array.from(byUser.values());

    if (exportType === "csv") {
      const { Parser } = require("json2csv");
      const flat = formatted.map((f) => ({
        fullName: `${f.userId?.firstName || ""} ${
          f.userId?.lastName || ""
        }`.trim(),
        contact: f.userId?.email || f.userId?.mobileNo || "-",
        totalFees: f.totalFees || 0,
        paidFees: f.paidFees || 0,
        pendingAmount: f.pendingAmount || 0,
        status: f.status || "pending",
        semester: f.semester || "-",
        place: f.placeId?.name || "-",
        location: f.locationId?.locationName || "-",
        company: f.companyId?.name || "-",
      }));
      const parser = new Parser();
      const csv = parser.parse(flat);
      res.header("Content-Type", "text/csv");
      res.attachment("pending_fees_report.csv");
      return res.send(csv);
    }

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching pending fees report:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
