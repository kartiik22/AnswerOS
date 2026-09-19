const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const commonUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      default: "common",
      immutable: true,
    },
    tenantId: {
      type: String,
      default: "default",
    },
  },
  {
    timestamps: true,
  }
);

commonUserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

commonUserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const CommonUser = mongoose.model("CommonUser", commonUserSchema);

module.exports = CommonUser;
