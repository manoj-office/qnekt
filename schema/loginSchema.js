// Use Mongoose :
const mongoose = require("mongoose");

// 1-Buddies Registration Schema :
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    emailId: { type: String },
    countryCode: { type: String },
    mobNo: { type: String },
    image: { type: String, default: "" },
    dob: { type: Date },
    password: { type: String },
    isOtpVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    useAgree: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    userName: { type: String },
    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    lastActive: { type: Date },
    status: { type: String, default: "Active" },
    role: { type: String },
  },
  { timestamps: true },
  { versionKey: false },
  { collection: "Users" }
);

// 2-Buddies Login Schema :
const tokenSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    emailId: { type: String },
    countryCode: { type: String, set: value => value && value.charAt(0) === '+' ? value.slice(1) : value },
    mobNo: { type: Number },
    token: { type: String },
    refreshToken: { type: String },
    tokenStatus: { type: String, default: "Active" },
  },
  { timestamps: true },
  { versionKey: false },
  { collection: "Token" }
);



const BuddysModel = mongoose.model("Users", userSchema);
const tokenModel = mongoose.model("Token", tokenSchema);

module.exports = {
  tokenModel,
  BuddysModel,
};
