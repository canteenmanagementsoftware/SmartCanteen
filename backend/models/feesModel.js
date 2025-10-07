const mongoose = require("mongoose");

const feesSchema = new mongoose.Schema(
  {
    taxProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaxProfile",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserMaster",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Places",
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Net Banking"],
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    includingGST: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["paid", "pending"],
      default: "pending",
    },
    receipt: {
      type: String,
      default: null,
    },
    // ---- GST snapshot (computed & stored) ----
    gstPercent: { type: Number, default: 5 }, // e.g. 5 / 12 / 18
    netAmount: { type: Number, default: 0 }, // taxable value (without GST)
    sgstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }, // final payable (gross)

    // ---- Multi-package support ----
    // If a single fee covers multiple active packages:
    assignmentIds: [{ type: mongoose.Schema.Types.ObjectId }],

    // Optional: persistent snapshot for receipts (recommended)
    items: [
      {
        assignmentId: { type: mongoose.Schema.Types.ObjectId },
        packageName: String,
        price: Number,
      },
    ],
  },
  { timestamps: true }
);

feesSchema.index({
  status: 1,
  paymentDate: 1,
  createdAt: 1,
  companyId: 1,
  placeId: 1,
  locationId: 1,
  taxProfileId: 1,
});

module.exports = mongoose.model("Fees", feesSchema);
