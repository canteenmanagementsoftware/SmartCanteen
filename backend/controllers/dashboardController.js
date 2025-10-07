// controllers/dashboardController.js
const Fee = require("../models/feesModel");
const User = require("../models/userMasterModel");
const Meal = require("../models/mealEntryModel");
const Location = require("../models/locationModel");
const mongoose = require("mongoose");

// ---------- helpers ----------
const toId = (v) =>
  mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null;


const asArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  const s = String(v);
  return s.includes(",") ? s.split(",") : [s];
};

const pickScope = (req) => {
  const q = req.query || {};
  const role = String(req.user?.role || "").toLowerCase();

  let companyId = q.companyId || q.company || null;
  let placeId = q.placeId || q.place || null;
  // accept: locationIds, locationIds[], locationId, comma string
  let locationIdsRaw =
    q.locationIds ?? q["locationIds[]"] ?? q.locationId ?? null;

  if (role === "admin") {
    companyId = companyId || req.user?.companyId;
    placeId = placeId || req.user?.placeId;
    locationIdsRaw = locationIdsRaw ?? req.user?.locationId;
  }

  const scope = {};
  if (companyId && toId(companyId)) scope.companyId = toId(companyId);
  if (placeId && toId(placeId)) scope.placeId = toId(placeId);

  const locs = asArray(locationIdsRaw).map(toId).filter(Boolean);
  if (locs.length) scope.locationId = { $in: locs };

  return scope;
};

// Build a $match for Meals that supports either "timestamp" or "collectionTime"
const mealDateMatch = (startUTC, nextUTC) => ({
  $or: [
    { timestamp: { $gte: startUTC, $lt: nextUTC } }, // CHANGED: support timestamp
    { collectionTime: { $gte: startUTC, $lt: nextUTC } }, // CHANGED: support collectionTime
  ],
});

// IST window for a specific date string (YYYY-MM-DD) or for "today" if not given
const getISTDayWindow = (yyyyMmDd) => {
  // CHANGED: robust IST window using +05:30
  if (yyyyMmDd) {
    const start = new Date(`${yyyyMmDd}T00:00:00.000+05:30`);
    const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { startUTC: start, nextUTC: next };
  }
  // today in IST
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const y = nowIST.getFullYear();
  const m = nowIST.getMonth();
  const d = nowIST.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0); // local (server TZ), but based on IST components
  const next = new Date(y, m, d + 1, 0, 0, 0, 0);
  // convert to real UTC Date objects:
  const startUTC = new Date(
    new Date(start).toLocaleString("en-US", { timeZone: "UTC" })
  );
  const nextUTC = new Date(
    new Date(next).toLocaleString("en-US", { timeZone: "UTC" })
  );
  return { startUTC, nextUTC };
};

const buildScopeMatch = (scope) => {
  const m = {};
  if (scope.locationId) m.locationId = scope.locationId;
  else if (scope.placeId) m.placeId = scope.placeId;
  else if (scope.companyId) m.companyId = scope.companyId;
  return m;
};

const calculateFeesInWindow = async (scope, startUTC, nextUTC) => {
  const match = {
    createdAt: { $gte: startUTC, $lt: nextUTC },
    status: "paid",
    ...buildScopeMatch(scope), // CHANGED: scoped total
  };

  const result = await Fee.aggregate([
    { $match: match },
    { $group: { _id: null, totalFees: { $sum: "$amount" } } },
  ]);
  return result[0]?.totalFees || 0;
};

// ---------- controllers ----------

// --- GET /dashboard/payment-amounts-daily
// Sums revenue by day & payment method (cash|card|upi|netbanking) for the selected scope/date window.
const getPaymentAmountsByDate = async (req, res) => {
  try {
    const scope = pickScope(req);

    // ---- date parsing (YYYY-MM-DD or ISO) ----
    const looksLikeYyyyMmDd = (s) =>
      typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const parseStartIST = (d) => new Date(`${d}T00:00:00.000+05:30`);
    const parseNextDayIST = (d) => new Date(parseStartIST(d).getTime() + 86400000);
    const parseAnyDate = (s, end = false) => {
      if (!s) return null;
      const d1 = new Date(s);
      if (!isNaN(d1)) return end ? new Date(d1.getTime() + 1) : d1; // end exclusive
      if (looksLikeYyyyMmDd(s)) return end ? parseNextDayIST(s) : parseStartIST(s);
      return null;
    };

    let { fromDate, toDate } = req.query || {};
    let startUTC = parseAnyDate(fromDate, false);
    let endUTC   = parseAnyDate(toDate, true);

    // default = today (UTC day) if nothing provided
    if (!startUTC && !endUTC) {
      const now = new Date();
      const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
      startUTC = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
      endUTC   = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
    } else {
      if (startUTC && !endUTC) endUTC = new Date(startUTC.getTime() + 86400000);
      if (!startUTC && endUTC) startUTC = new Date(endUTC.getTime() - 86400000);
    }

    const match = {
      status: "paid",
      ...buildScopeMatch(scope),
      $or: [
        { paymentDate: { $gte: startUTC, $lt: endUTC } },
        { $and: [{ paymentDate: { $exists: false } }, { createdAt: { $gte: startUTC, $lt: endUTC } }] },
      ],
    };

    const rows = await Fee.aggregate([
      { $match: match },

      // pick a date field and normalize paymentMode
      {
        $addFields: {
          _dateField: { $ifNull: ["$paymentDate", "$createdAt"] },
          _pmRaw:     { $ifNull: ["$paymentMode", "unknown"] },
        },
      },

      // normalize payment method -> cash/card/upi/netbanking/other
      {
        $addFields: {
          pm: {
            $replaceAll: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: { $toLower: "$_pmRaw" },
                      find: "-",
                      replacement: "",
                    },
                  },
                  find: "_",
                  replacement: "",
                },
              },
              find: " ",
              replacement: "",
            },
          },
        },
      },

      // IST day string for grouping
      {
        $addFields: {
          dateStr: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$_dateField",
              timezone: "Asia/Kolkata",
            },
          },
        },
      },

      // sum by day + method
      {
        $group: {
          _id: { dateStr: "$dateStr", pm: "$pm" },
          totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          dateStr: "$_id.dateStr",
          method: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.pm", "cash"] }, then: "cash" },
                { case: { $eq: ["$_id.pm", "card"] }, then: "card" },
                { case: { $eq: ["$_id.pm", "upi"] },  then: "upi" },
                {
                  case: { $in: ["$_id.pm", ["netbanking","netbank","internetbanking"]] },
                  then: "netbanking",
                },
              ],
              default: "other",
            },
          },
          totalAmount: 1,
        },
      },
      { $match: { method: { $in: ["cash", "card", "upi", "netbanking"] } } },
      { $sort: { dateStr: 1 } },
    ]);

    return res.json({ rows });
  } catch (err) {
    console.error("payment-amounts-daily ERROR:", err?.stack || err);
    return res.status(500).json({ message: "Error fetching revenue breakdown" });
  }
};


// --- NEW: GET /dashboard/revenue-by-location
// Returns total revenue per selected location in the date window (paymentDate preferred, fallback createdAt)
const getRevenueByLocation = async (req, res) => {
  try {
    const scope = pickScope(req);
    const haveScope = Object.keys(buildScopeMatch(scope)).length > 0;
    if (!haveScope) return res.json({ rows: [] });

    // --- date parsing (YYYY-MM-DD or ISO)
    const looksLikeYyyyMmDd = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const parseStartIST = (d) => new Date(`${d}T00:00:00.000+05:30`);
    const parseNextDayIST = (d) => new Date(parseStartIST(d).getTime() + 86400000);
    const parseAnyDate = (s, end = false) => {
      if (!s) return null;
      const d1 = new Date(s);
      if (!isNaN(d1)) return end ? new Date(d1.getTime() + 1) : d1;
      if (looksLikeYyyyMmDd(s)) return end ? parseNextDayIST(s) : parseStartIST(s);
      return null;
    };

    let { fromDate, toDate } = req.query || {};
    let startUTC = parseAnyDate(fromDate, false);
    let endUTC   = parseAnyDate(toDate, true);

    if (!startUTC && !endUTC) {
      const { startUTC: s, nextUTC: n } = getISTDayWindow(); // already defined above
      startUTC = s;
      endUTC   = n;
    } else {
      if (startUTC && !endUTC) endUTC = new Date(startUTC.getTime() + 86400000);
      if (!startUTC && endUTC) startUTC = new Date(endUTC.getTime() - 86400000);
    }

    const match = {
      status: "paid",
      ...buildScopeMatch(scope),
      $or: [
        { paymentDate: { $gte: startUTC, $lt: endUTC } },
        { $and: [{ paymentDate: { $exists: false } }, { createdAt: { $gte: startUTC, $lt: endUTC } }] },
      ],
    };

    const rows = await Fee.aggregate([
      { $match: match },
      { $group: { _id: "$locationId", total: { $sum: { $ifNull: ["$amount", 0] } } } },
      {
        $lookup: {
          from: "locations",           // collection name for Location model
          localField: "_id",
          foreignField: "_id",
          as: "loc",
        },
      },
      {
        $addFields: {
          locationName: { $ifNull: [{ $arrayElemAt: ["$loc.locationName", 0] }, "Unknown"] },
        },
      },
      { $project: { _id: 0, locationId: "$_id", locationName: 1, total: 1 } },
      { $sort: { total: -1 } }, // biggest slice first
    ]);

    return res.json({ rows });
  } catch (err) {
    console.error("getRevenueByLocation ERROR:", err);
    return res.status(500).json({ message: "Error fetching revenue by location" });
  }
};


// GET /dashboard/metrics
const getMetrics = async (req, res) => {
  try {
    const scope = pickScope(req);
    const date = req.query.date;
    const { startUTC, nextUTC } = getISTDayWindow(date);

    // Meals for today (scoped by selected locations)
    const match = {
      ...buildScopeMatch(scope),
      ...mealDateMatch(startUTC, nextUTC),
    };

    const todayMealUsers = await Meal.distinct("userId", match);
    const todayUsers = todayMealUsers.length;

    const totalUsers = await User.countDocuments(buildScopeMatch(scope));

    const todayFees = await calculateFeesInWindow(scope, startUTC, nextUTC);

    return res.json({ todayUsers, todayFees, totalUsers });
  } catch (err) {
    console.error("Error fetching metrics:", err);
    return res
      .status(500)
      .json({ message: "Error fetching dashboard metrics" });
  }
};

// GET /dashboard/summary
// getSummary: aligns time-buckets to IST (default 330 min), and assigns each row
// to the correct [bucketStart, bucketEnd) slot, then aggregates unique users per mealType.
const getSummary = async (req, res) => {
  try {
    const scope = pickScope(req);

    // if scope missing, return empty (UI shows blank until selection)
    if (!Object.keys(buildScopeMatch(scope)).length) {
      return res.json([]);
    }

    // --- Optional time bucket (in hours). If provided, switch to time-bucket mode.
    const intervalHours = Number(req.query.intervalHours || req.query.interval);
    const hasTimeBuckets = Number.isFinite(intervalHours) && intervalHours > 0;

    // Timezone alignment (default IST = +05:30 = 330 minutes)
    const tzOffsetMin = Number(
      req.query.tzOffsetMin !== undefined ? req.query.tzOffsetMin : 330
    );
    const TZ_OFFSET_MS = tzOffsetMin * 60 * 1000;

    // Helpers for parsing dates
    const looksLikeYyyyMmDd = (s) =>
      typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

    const parseStartWithOffset = (yyyyMmDd, offsetMin = 330) =>
      new Date(
        `${yyyyMmDd}T00:00:00.000${
          offsetMin >= 0
            ? `+${String(offsetMin / 60).padStart(2, "0")}:${String(
                offsetMin % 60
              ).padStart(2, "0")}`
            : `-${String(Math.floor(Math.abs(offsetMin) / 60)).padStart(
                2,
                "0"
              )}:${String(Math.abs(offsetMin) % 60).padStart(2, "0")}`
        }`
      );

    // IST-specific helpers retained for convenience/back-compat
    const parseStartIST = (yyyyMmDd) =>
      new Date(`${yyyyMmDd}T00:00:00.000+05:30`);
    const parseNextDayIST = (yyyyMmDd) =>
      new Date(
        new Date(`${yyyyMmDd}T00:00:00.000+05:30`).getTime() +
          24 * 60 * 60 * 1000
      );

    const parseAnyDate = (s, isEnd = false) => {
      if (!s) return null;
      // ISO/string with time -> native Date
      const d1 = new Date(s);
      if (!isNaN(d1)) return isEnd ? new Date(d1.getTime() + 1) : d1; // end is exclusive

      // YYYY-MM-DD -> start of day in *IST* for backward compatibility
      if (looksLikeYyyyMmDd(s)) {
        // Keep previous behavior: interpret date-only as IST boundary
        return isEnd ? parseNextDayIST(s) : parseStartIST(s);
      }
      return null;
    };

    // Align any Date to the start of its bucket, respecting the tz offset.
    const makeBucketAligner = (bucketMs, tzMs) => (dateObj) => {
      const ms = dateObj.getTime();
      const shifted = ms + tzMs;
      const floored = Math.floor(shifted / bucketMs) * bucketMs;
      return new Date(floored - tzMs); // back to UTC
    };

    // Meal-type key normalization for output keys
    const normalizeOutKey = (mt) => {
      if (!mt) return "unknown";
      const k = String(mt).toLowerCase();
      if (k === "latesnack" || k === "latesnacks" || k === "late_snack")
        return "lateSnack";
      return k; // breakfast/lunch/supper/dinner expected to be already normalized
    };

    // Default to "today" window in TZ when both dates absent
    const getTZDayWindow = (offsetMs) => {
      const now = new Date();
      const shifted = new Date(now.getTime() + offsetMs);
      const yyyy = shifted.getUTCFullYear();
      const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(shifted.getUTCDate()).padStart(2, "0");
      // Start of day in TZ -> convert to UTC by subtracting offset
      const startInTZ = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
      const startUTC = new Date(startInTZ.getTime() - offsetMs);
      const nextUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
      return { startUTC, nextUTC };
    };

    let { fromDate, toDate } = req.query || {};

    // ---------------- TIME-BUCKET MODE ----------------
    if (hasTimeBuckets) {
      const bucketMs = intervalHours * 60 * 60 * 1000; // bucket size in ms
      const alignToBucket = makeBucketAligner(bucketMs, TZ_OFFSET_MS);

      // Parse dates
      let startUTC = parseAnyDate(fromDate, false);
      let endUTC = parseAnyDate(toDate, true);

      // Default to today (in TZ) if no dates provided
      if (!startUTC && !endUTC) {
        const { startUTC: s, nextUTC: n } = getTZDayWindow(TZ_OFFSET_MS);
        startUTC = s;
        endUTC = n;
      } else {
        // If only one bound provided, span 24h from that bound
        if (startUTC && !endUTC)
          endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
        if (!startUTC && endUTC)
          startUTC = new Date(endUTC.getTime() - 24 * 60 * 60 * 1000);
      }

      // Align window to bucket boundaries so JS prebuilt buckets match agg keys exactly
      const startAlignedUTC = alignToBucket(startUTC);
      const endAlignedUTC = alignToBucket(new Date(endUTC.getTime() - 1)); // last bucket that has any overlap
      const endLoopUTC = new Date(endAlignedUTC.getTime() + bucketMs); // exclusive in loop

      // Scope match (do field/date filtering on computed ts later)
      const matchScope = { ...buildScopeMatch(scope) };

      // Pipeline:
      // 1) $match scope
      // 2) $set ts + tsLong from either "timestamp" or "collectionTime"
      // 3) $match ts in [startUTC, endUTC)
      // 4) Shift to TZ, floor to bucket, shift back -> bucketStart
      // 5) Group by bucketStart + mealType; uniq users
      const rows = await Meal.aggregate([
        { $match: matchScope },
        {
          $set: {
            ts: { $toDate: { $ifNull: ["$timestamp", "$collectionTime"] } },
          },
        },
        { $match: { ts: { $gte: startUTC, $lt: endUTC } } },
        {
          $set: {
            tsLong: { $toLong: "$ts" },
          },
        },
        {
          $set: {
            shiftedMs: { $add: ["$tsLong", TZ_OFFSET_MS] },
          },
        },
        {
          $set: {
            bucketStartMsShifted: {
              $subtract: ["$shiftedMs", { $mod: ["$shiftedMs", bucketMs] }],
            },
          },
        },
        {
          $set: {
            bucketStartMsUTC: {
              $subtract: ["$bucketStartMsShifted", TZ_OFFSET_MS],
            },
          },
        },
        {
          $set: {
            bucketStart: { $toDate: "$bucketStartMsUTC" },
          },
        },
        {
          $group: {
            _id: { bucketStart: "$bucketStart", mealType: "$mealType" },
            usersSet: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            _id: 0,
            bucketStart: "$_id.bucketStart",
            mealType: "$_id.mealType",
            users: { $size: "$usersSet" },
          },
        },
        { $sort: { bucketStart: 1 } },
      ]);

      // Pre-build empty buckets in JS so missing buckets show up as 0
      const buckets = new Map();
      const numberOfBuckets = Math.floor(24 / intervalHours); // total buckets in a day
      for (let i = 0; i < numberOfBuckets; i++) {
        const t = startAlignedUTC.getTime() + i * bucketMs;
        buckets.set(t, {
          date: new Date(t), // UTC bucket start
          breakfast: 0,
          lunch: 0,
          supper: 0,
          dinner: 0,
          lateSnack: 0,
        });
      }

      // Fill bucket counts from aggregation
      rows.forEach((r) => {
        const key = r.bucketStart.getTime(); // UTC ms
        const row = buckets.get(key);
        if (row) row[normalizeOutKey(r.mealType)] = r.users;
      });

      // Prepare final output (convert to local/TZ label for display)
      const out = Array.from(buckets.values()).map((row) => ({
        ...row,
        // human-friendly label like "01:00 PM" in the target TZ
        displayDate: new Date(
          row.date.getTime() + TZ_OFFSET_MS
        ).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      }));

      return res.json(out);
    }

    // ---------------- DAILY MODE (old behavior) ----------------
    const startBase = fromDate || new Date().toISOString().slice(0, 10);
    const endBase = toDate || startBase;

    const startDay = new Date(`${startBase}T00:00:00.000Z`);
    const endDay = new Date(`${endBase}T00:00:00.000Z`);
    const daysCount =
      Math.floor((endDay - startDay) / (24 * 60 * 60 * 1000)) + 1;

    const summary = [];
    const mealTypesOut = [
      "breakfast",
      "lunch",
      "supper",
      "dinner",
      "lateSnack",
    ];
    const dbKey = (t) => (t === "lateSnack" ? "latesnacks" : t);

    for (let i = 0; i < daysCount; i++) {
      const dayStartUTC = new Date(startDay.getTime() + i * 86400000);
      const dayNextUTC = new Date(dayStartUTC.getTime() + 86400000);

      const baseMatch = {
        ...buildScopeMatch(scope),
        ...mealDateMatch(dayStartUTC, dayNextUTC),
      };

      const userIds = await Meal.distinct("userId", baseMatch);
      const userCount = userIds.length;

      const mealCounts = {};
      for (const t of mealTypesOut) {
        mealCounts[t] = await Meal.countDocuments({
          ...baseMatch,
          mealType: dbKey(t),
        });
      }

      summary.push({
        date: dayStartUTC.toISOString(),
        userCount,
        ...mealCounts,
      });
    }

    return res.json(summary);
  } catch (err) {
    console.error("Error fetching summary:", err);
    return res
      .status(500)
      .json({ message: "Error fetching dashboard summary" });
  }
};


// GET /dashboard/overview
const getOverview = async (req, res) => {
  try {
    const scope = pickScope(req);
    const { fromDate, toDate } = req.query;

    const haveScope = Object.keys(buildScopeMatch(scope)).length > 0;
    if (!fromDate || !toDate || !haveScope) {
      return res.status(400).json({
        success: false,
        message: "Required parameters missing",
        required: ["fromDate", "toDate", "companyId/placeId/locationId"],
      });
    }

    const startUTC = new Date(`${fromDate}T00:00:00.000Z`);
    const endNextUTC = new Date(`${toDate}T00:00:00.000Z`);
    const endUTC = new Date(endNextUTC.getTime() + 24 * 60 * 60 * 1000);

    const match = {
      ...buildScopeMatch(scope),
      ...mealDateMatch(startUTC, endUTC),
    };

    const grouped = await Meal.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$mealType",
          actualCount: { $sum: 1 },
          utilizedCount: {
            $sum: { $cond: [{ $eq: ["$status", "utilized"] }, 1, 0] },
          },
        },
      },
    ]);

    const mealTypes = ["breakfast", "lunch", "supper", "dinner", "lateSnack"];
    const out = {};
    for (const t of mealTypes) {
      const dbK = t === "lateSnack" ? "latesnacks" : t;
      const row = grouped.find((g) => g._id === dbK) || {
        actualCount: 0,
        utilizedCount: 0,
      };
      out[`${t}Actual`] = row.actualCount;
      out[`${t}Utilized`] = row.utilizedCount;
    }

    const uniqueUsers = await Meal.distinct("userId", match);

    // location name (handle single or $in)
    let locationName = "Unknown Location";
    if (scope.locationId) {
      let id = null;
      if (scope.locationId.$in && scope.locationId.$in.length)
        id = scope.locationId.$in[0];
      else id = scope.locationId; // single value case
      try {
        const loc = await Location.findById(id).select("locationName").lean();
        if (loc?.locationName) locationName = loc.locationName;
      } catch (_) {}
    }

    return res.json({
      success: true,
      data: {
        ...out,
        totalUsers: uniqueUsers.length,
        locationName,
        date: startUTC,
      },
    });
  } catch (error) {
    console.error("Error in getOverview:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getMetrics,
  getSummary,
  getOverview,
  getRevenueByLocation,
  getPaymentAmountsByDate
};
