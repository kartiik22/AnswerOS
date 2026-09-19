const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommonUser",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "resolved", "unresolved"],
      default: "active",
      index: true,
    },
    resolutionType: {
      type: String,
      enum: ["ai", null],
      default: null,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
