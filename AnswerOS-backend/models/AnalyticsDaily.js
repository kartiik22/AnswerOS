const mongoose = require("mongoose");

const analyticsDailySchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    totalConversations: {
      type: Number,
      default: 0,
    },
    resolvedConversations: {
      type: Number,
      default: 0,
    },
    unresolvedConversations: {
      type: Number,
      default: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
    totalFeedbacks: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    hallucinationReports: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const AnalyticsDaily = mongoose.model("AnalyticsDaily", analyticsDailySchema);

module.exports = AnalyticsDaily;
