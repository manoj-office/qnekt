// Use Mongoose :
const mongoose = require("mongoose");

// 1-Buddies Registration Schema :
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    emailId: { type: String, default: "" },
    countryCode: { type: String },
    mobNo: { type: String, default: "" },
    image: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    dob: { type: Date },
    password: { type: String, default: "" },
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
    role: { type: String, default: "" },
  },
  { timestamps: true },
  { versionKey: false },
  { collection: "Users" }
);

// 2- FCM token Schema :
const userNotificationDevicesSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    devices: [{
      device_type: { type: String, }, //enum: ['android', 'ios', 'web'],   
      fcm_token: { type: String },
      last_login: { type: Date },
    }],
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "User Notification Devices",
  }
);



const BuddysModel = mongoose.model("Users", userSchema);
const userNotificationDevicesModel = mongoose.model("User Notification Devices", userNotificationDevicesSchema);

module.exports = {
  userNotificationDevicesModel,
  BuddysModel,
};
