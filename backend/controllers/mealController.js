"use strict";

const MealEntry = require("../models/mealEntryModel");
const User = require("../models/userMasterModel");
const Package = require("../models/packageModel");
const Fees = require("../models/feesModel");


// Utility: Convert time string to total minutes
function convertTimeToMinutes(timeStr) {
  let [hours, minutes] = [0, 0];
  let period = "";

  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    [timeStr, period] = timeStr.split(" ");
    [hours, minutes] = timeStr.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  } else {
    [hours, minutes] = timeStr.split(":").map(Number);
  }

  return hours * 60 + minutes;
}

// Utility: Get current time in 'HH:MM AM/PM' format (IST)
function getCurrentTime() {
  const options = {
    timeZone: "Asia/Kolkata",
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
  };
  const timeStr = new Date().toLocaleString("en-US", options);
  const [time, period] = timeStr.split(" ");
  const [hours, minutes] = time.split(":");
  const formattedHours = parseInt(hours);
  return `${formattedHours}:${minutes} ${period}`;
}

// Utility: Get current IST timestamp
function getCurrentIndianTime() {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + offset);
}

// Determine Meal Type From Package Meal Schedule
async function determineMealTypeFromPackage(currentTime, packageId) {
  try {
    // Fetch the package by its ID
    const pkg = await Package.findById(packageId).lean();

    if (!pkg || !pkg.meals) {
      return {
        success: false,
        message: "No meals are available for this package.",
      };
    }

    // Get the current day of the week (e.g., "Monday", "Tuesday", etc.)
    const dayName = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
    });

    // Convert the current time string to total minutes since midnight
    const nowMinutes = convertTimeToMinutes(currentTime);

    // Flag to check if a meal is available today
    let isMealAvailableToday = false;

    // Loop through the meals to check if any are scheduled for today
    for (const meal of pkg.meals) {
      if (!meal.isEnabled || !meal.days?.includes(dayName)) continue;

      // Convert meal start and end times to minutes since midnight
      const start = convertTimeToMinutes(meal.startTime);
      const end = convertTimeToMinutes(meal.endTime);
      console.log("start", meal.startTime);
      console.log("end", meal.endTime);

      console.log("nowMinutes", nowMinutes);
      // If the current time falls within the meal's start and end time, return the meal type
      if (nowMinutes >= start && nowMinutes <= end) {
        return { success: true, mealType: meal.mealType }; // return the meal type (breakfast, lunch, etc.)
      }

      // If we find a meal scheduled for today but not for the current time, set the flag
      isMealAvailableToday = true;
    }

    // If no meal matched the time, return a message about today's availability
    if (!isMealAvailableToday) {
      return { success: false, message: `No meals are scheduled for today.` };
    }

    // If no meal is available at this time
    return { success: false, message: "No meal available at this time." };
  } catch (error) {
    console.error("Error determining meal type from package:", error);
    return {
      success: false,
      message: "Error determining meal type from package.",
    };
  }
}

const controller = {
  async recordMeal(req, res) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 25000)
      );

      const mealPromise = (async () => {
        const { userId, method } = req.body;

        // 1) Validate input
        if (!userId || !method) {
          return res.status(400).json({
            success: false,
            message: "userId and method (face/card) are required",
          });
        }
        if (!["face", "card"].includes(method)) {
          return res.status(400).json({
            success: false,
            message: "Invalid method. Allowed values are 'face' or 'card'.",
          });
        }

        // 2) Fetch user WITH nested assignments populated
        const user = await User.findById(userId)
          .select("_id firstName lastName role isFeePaid packages")
          .populate([
            {
              path: "packages.packageId",
              model: "Packages",
              select:
                "name price validity_date is_fixed_validity status description meals",
            },
            { path: "packages.companyId", select: "name collectionType" },
            { path: "packages.placeId", select: "name" },
            { path: "packages.locationId", select: "locationName name" },
          ])
          .lean();

          console.log("user--", user)

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // 3) Choose the *effective* active assignment from user.packages
        const now = new Date();
        const isActiveAssignment = (p) => {
          console.log("p",p)
          if (!p || p.status === "cancelled") return false;
          const s = p.startDate ? new Date(p.startDate) : null;
          const e = p.endDate ? new Date(p.endDate) : null;

          // Window validity
          if (s && e && s <= now && now <= e) return true;

          // Fixed validity fallback (from package)
          if (
            p.packageId &&
            typeof p.packageId === "object" &&
            p.packageId.is_fixed_validity
          ) {
            const vd = p.packageId.validity_date
              ? new Date(p.packageId.validity_date)
              : null;
            if (vd && now <= vd) return true;
          }
          return false;
        };

        console.log("active,activeAssignments,user.packages",user.packages)
        const activeAssignments = (user.packages || []).filter(
          isActiveAssignment
        );

        // If multiple overlap, pick the most recent by startDate
        const active = activeAssignments.sort(
          (a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0)
        )[0];

        if (!active || !active.packageId) {
          return res.status(403).json({
            success: false,
            message: "Your package is expired or not active.",
          });
        }

        // 4) Company / method permission from active assignment
        const company = active.companyId; // populated doc
        if (!company) {
          return res.status(403).json({
            success: false,
            message: "Company not linked with your active package.",
          });
        }

        const collectionType = company.collectionType || "face";
        const isAllowed =
          collectionType === "both" || collectionType === method;
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: `This company only allows '${collectionType}' method. You tried '${method}'.`,
          });
        }

        // 5) Fees checks
        if (!user.isFeePaid) {
          return res.status(403).json({
            success: false,
            message:
              "Fees not paid. Please pay your fees before collecting meals.",
          });
        }

        const pendingFees = await Fees.findOne({
          userId: user._id,
          status: "pending",
        });
        if (pendingFees) {
          return res.status(403).json({
            success: false,
            message:
              "You have pending fees. Please clear all pending fees before collecting meals.",
          });
        }

        // 6) Determine mealType from the **active package**
        const currentTime = getCurrentTime();
        const currentTimestamp = getCurrentIndianTime();
        const pkgId =
          typeof active.packageId === "object" && active.packageId._id
            ? active.packageId._id
            : active.packageId;

        console.log("pkg Id", pkgId, currentTime);

        const mealResult = await determineMealTypeFromPackage(currentTime, pkgId);

        if (!mealResult.success) {
          return res.status(400).json({
            success: false,
            message: mealResult.message,
          });
        }

        const mealType = mealResult.mealType;

        // 7) Enforce 1/mealType per day
        const startOfDay = new Date(currentTimestamp);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentTimestamp);
        endOfDay.setHours(23, 59, 59, 999);

        const alreadyTaken = await MealEntry.findOne({
          userId: user._id,
          mealType, // now string
          timestamp: { $gte: startOfDay, $lte: endOfDay },
        });

        if (alreadyTaken) {
          return res.status(400).json({
            success: false,
            message: `You have already taken ${mealType} today.`,
          });
        }

        const mealEntry = await MealEntry.create({
          userId: user._id,
          companyId: company._id || company,
          packageId: pkgId,
          locationId: active.locationId?._id || active.locationId,
          placeId: active.placeId?._id || active.placeId,
          mealType, // ✅ string only
          method,
          timestamp: currentTimestamp,
          status: "success",
        });

        return res.status(200).json({
          success: true,
          message: "Meal recorded successfully",
          data: {
            mealId: mealEntry._id,
            mealType: mealEntry.mealType,
            method: mealEntry.method,
            timestamp: mealEntry.timestamp,
          },
        });
      })();

      await Promise.race([mealPromise, timeoutPromise]);
    } catch (error) {
      console.error("Meal recording error:", error);
      if (error.message === "Request timeout") {
        return res.status(504).json({
          success: false,
          message: "Request timed out. Please try again.",
        });
      }
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Invalid meal data: " + error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to record meal. Please try again.",
      });
    }
  },

  async getMealHistory(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const mealHistory = await MealEntry.find({ userId })
        .sort({ timestamp: -1 })
        .populate([
          { path: "packageId", select: "name" },
          { path: "locationId", select: "locationName" },
        ]);

      const formattedHistory = mealHistory.map((entry) => ({
        id: entry._id,
        mealType: entry.mealType,
        timestamp: entry.timestamp,
        packageName: entry.packageId?.name || "N/A",
        location: entry.locationId?.locationName || "N/A",
        date: entry.timestamp.toLocaleDateString("en-US", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: entry.timestamp.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      }));

      return res.status(200).json({
        success: true,
        data: formattedHistory,
      });
    } catch (error) {
      console.error("Error fetching meal history:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch meal history",
      });
    }
  },

  async getAllMeals(req, res) {
    try {
      const mealHistory = await MealEntry.find()
        .sort({ timestamp: -1 })
        .populate([
          { path: "userId", select: "firstName lastName uniqueId role" },
          { path: "packageId", select: "name" },
          { path: "locationId", select: "locationName" },
          { path: "companyId", select: "name" },
          { path: "placeId", select: "name" },
        ]);

      const formattedHistory = mealHistory.map((entry) => ({
        id: entry._id,
        // USER
        userId: entry.userId?._id,
        userFirstName: entry.userId?.firstName || "Unknown",
        userLastName: entry.userId?.lastName || "",
        userUniqueId: entry.userId?.uniqueId || "N/A",
        userRole: entry.userId?.role || "N/A",

        // MEAL
        mealType: entry.mealType, // 'breakfast' | 'lunch' | 'supper' | 'dinner' | 'latesnacks'
        status: entry.status || "success",
        timestamp: entry.timestamp, // raw date (frontend will format IST)

        // PACKAGE
        packageId: entry.packageId?._id,
        packageName: entry.packageId?.name || "N/A",

        // COMPANY / PLACE / LOCATION
        companyId: entry.companyId?._id || entry.companyId,
        companyName: entry.companyId?.name || "N/A",
        placeId: entry.placeId?._id || entry.placeId,
        placeName: entry.placeId?.name || "N/A",
        locationId: entry.locationId?._id || entry.locationId,
        locationName: entry.locationId?.locationName || "N/A",
      }));
      console.log("formattedHistory", formattedHistory);

      return res.status(200).json({
        success: true,
        data: formattedHistory,
      });
    } catch (error) {
      console.error("Error fetching all meals:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch meal history",
      });
    }
  },
};

module.exports = controller;
