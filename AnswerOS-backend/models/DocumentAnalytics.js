const mongoose = require("mongoose");

const documentAnalyticsSchema = new mongoose.Schema(
  {
    docId: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      default: "",
    },
    totalQueries: {
      type: Number,
      default: 0,
    },
    negativeRatingsCount: {
      type: Number,
      default: 0,
    },
    hallucinationReportsCount: {
      type: Number,
      default: 0,
    },
    failureScore: {
      type: Number,
      default: 0, // Composite metric: negative ratings + hallucination reports
      index: true,
    },
    lastReportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const DocumentAnalytics = mongoose.model("DocumentAnalytics", documentAnalyticsSchema);

module.exports = DocumentAnalytics;
