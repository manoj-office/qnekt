const express = require("express");
const router = express.Router();

const { createAdminToken, createRefreshAdminToken } = require("../auth/auth.js");
const { hashCompare, hashPassword, createToken, createRefreshToken } = require("../auth/auth.js");
// const { sendOtpToEmail, sendOtpToMobno, sendOtpToWhatsApp } = require("../config/msg91Config.js");
const { BuddysModel } = require("../schema/loginSchema.js");
const { generateUsername } = require("../services/loginFunctions.js");




// 1. Register
router.post("/signup", async (req, res) => {
    try {
        const { fullName, type, email, mobNo, password } = req.body;

        // Check if either email or mobile number is provided
        if (!email || !mobNo) {
            return res.status(400).json({ message: "Email or mobile number is required" });
        }

        let existingUser;

        // // Check if email is already registered
        // if (type === "email") {
        //     existingUser = await BuddysModel.findOne({
        //         $and: [{ emailId: email }, { mobNo: "" }],
        //         // countryCode,
        //     });
        //     if (existingUser) return res.status(400).json({ message: "Email is already registered" });
        // }

        // // Check if mobile number is already registered
        // if (type === "mobNo") {
        //     existingUser = await BuddysModel.findOne({
        //         $and: [{ emailId: "" }, { mobNo: mobNo }],
        //         // countryCode,
        //     });
        //     if (existingUser) return res.status(400).json({ message: "Mobile number is already registered" });
        // }

        // Generate User Name  :
        const genUserName = await generateUsername(fullName);

        // Create the buddy user
        const user = new BuddysModel({
            fullName: req.body.fullName,
            emailId: email,
            mobNo: mobNo,
            // emailId: type === "email" ? email : "",
            // mobNo: type === "mobNo" ? mobNo : "",
            // countryCode: type === "mobNo" ? countryCode : "",
            // dob: req.body.dob,
            password: await hashPassword(password),
            userName: genUserName,
        });
        await user.save();

        res.status(200).send({ message: "New user is registered.", result: user });

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error", error });
    }
});


// 2. sign in
router.post("/login", async (req, res) => {
  try {
    const { email, mobNo } = req.body;
    let user;
    let roleCheck;
    let loginType = "";  // Add this to track login type

    if (email !== "") {
      user = await BuddysModel.findOne({
        $and: [{ emailId: email },],
      })
        .sort({ createdAt: -1 })
        .limit(1);

      loginType = "email";

    } else if (mobNo !== "") {
      user = await BuddysModel.findOne({
        $and: [{ mobNo: mobNo }],
      })
        .sort({ createdAt: -1 })
        .limit(1);

      loginType = "mobile";

    }

    if (user) {
      if (await hashCompare(req.body.password, user.password)) {
        let token;
        let refreshToken;
        if (user.role) {
          if (role == user.role) {
            token = await createAdminToken({
              id: user._id,
              fullName: user.fullName,
              email: user.emailId,
              mobNo: user.mobNo,
              // dob: user.dob,
              role: "admin",
            });
            refreshToken = await createRefreshAdminToken({
              id: user._id,
              fullName: user.fullName,
              email: user.emailId,
              mobNo: user.mobNo,
              // dob: user.dob,
              role: "admin",
            });
          } else {
            return res
              .status(400)
              .send({ message: "Only Admins can access" });
          }
        } else {
          token = await createToken({
            id: user._id,
            fullName: user.fullName,
            email: user.emailId,
            mobNo: user.mobNo,
            // dob: user.dob,
          });
          refreshToken = await createRefreshToken({
            id: user._id,
            fullName: user.fullName,
            email: user.emailId,
            mobNo: user.mobNo,
            // dob: user.dob,
          });
        }
        req.body.token = token;
        req.body.refreshToken = refreshToken;

        // if (token) {
        //     req.body.userId = user._id;
        //     let tokenStore = new tokenModel(req.body);
        //     await tokenStore.save();
        // }

        res.status(201).send({ message: "Login Successfully", token, refreshToken, result: user });
      } else res.status(400).send({ message: "Invalid Credentials" });
    } else res.status(400).send({ message: "User Does Not Exist" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


// 3. forgot password
router.post("/forgotPassword", async (req, res) => {
  try {
    const { mobNo, email, password } = req.body;

    if (email !== "") {
      user = await BuddysModel.findOne({
        $and: [{ emailId: email },],
      })
        .sort({ createdAt: -1 })
        .limit(1);

      loginType = "email";

    } else if (mobNo !== "") {
      user = await BuddysModel.findOne({
        $and: [{ mobNo: mobNo }],
      })
        .sort({ createdAt: -1 })
        .limit(1);

      loginType = "mobile";

    }

    if (user) {
      const result = await BuddysModel.findOneAndUpdate(
        { _id: user._id },
        { password: await hashPassword(password), },
        { new: true }
      );

      if (!result) return res.status(400).send({ message: "User not found in table." });

      res.status(200).send({ message: "The password has been updated succesfully.", result });
    } else res.status(400).send({ message: "User Does Not Exist" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

module.exports = router;


// //-------------------------------------------------------------------------------------------------
// // 1. Buddy Registration :
// router.post("/signup", async (req, res) => {
//   try {
//     const {
//       fullName,
//       type,
//       email,
//       email_mobNo,
//       countryCode,
//       mobNo,
//       dob,
//       password,
//       referredByCode,
//       deviceName,
//       deviceType,
//       deviceVersion,
//       appVersion,
//       fcm
//     } = req.body;

//     // Check if either email or mobile number is provided
//     if (!email && !email_mobNo) {
//       return res
//         .status(400)
//         .json({ message: "Email or mobile number is required" });
//     }

//     let existingUser;

//     // Check if email is already registered
//     if (type === "email") {
//       existingUser = await BuddysModel.findOne({
//         $and: [{ emailId: email_mobNo }, { mobNo: "" }],
//         countryCode,
//       });
//       if (existingUser)
//         return res.status(400).json({ message: "Email is already registered" });
//     }

//     // Check if mobile number is already registered
//     if (type === "mobNo") {
//       existingUser = await BuddysModel.findOne({
//         $and: [{ emailId: "" }, { mobNo: email_mobNo }],
//         countryCode,
//       });
//       if (existingUser)
//         return res
//           .status(400)
//           .json({ message: "Mobile number is already registered" });
//     }

//     // Generate OTP and hash it
//     const otpLength = 6;
//     const Otp = await generateOTP(otpLength);
//     const hash = await hashOtp(Otp);

//     // Create the OTP record
//     let otpSave;
//     if (type === "email") {
//       // await sendOtpToEmail({mailTo : email_mobNo, otp : Otp})
//       await sendOtpToEmail({
//         userName: fullName,
//         userEmail: email_mobNo,
//         otp: Otp,
//       });
//       otpSave = new otpModel({
//         emailId: email_mobNo,
//         countryCode: "",
//         mobNo: "",
//         otp: hash,
//       });
//     } else if (type === "mobNo") {
//       await sendOtpToMobno({
//         otp: Otp,
//         countryCode: req.body.countryCode,
//         mobNo: email_mobNo,
//       });
//       otpSave = new otpModel({
//         emailId: "",
//         countryCode,
//         mobNo: email_mobNo,
//         otp: hash,
//       });
//     }
//     await otpSave.save();

//     // Generate User Name  :
//     const genUserName = await generateUsername(fullName, dob);

//     // If Buddy entered referredByCode :
//     if (referredByCode) {
//       let referralCode = await BuddysModel.findOne({
//         referralCode: referredByCode,
//       });
//       if (referralCode) {
//         let result = new referralModel({
//           referredBy: referralCode._id,
//           referredTo: email_mobNo,
//           referralCode: referredByCode,
//         });
//         await result.save();

//         // Create the buddy user
//         const buddy = new BuddysModel({
//           fullName: req.body.fullName,
//           emailId: type === "email" ? email_mobNo : "",
//           mobNo: type === "mobNo" ? email_mobNo : "",
//           countryCode: req.body.countryCode,
//           dob: req.body.dob,
//           password: await hashPassword(password),
//           referralCode: await generateReferralCode(6),
//           referredBy: req.body.referredBy,
//           // otp: Otp,
//           userName: genUserName,
//         });
//         await buddy.save();

//         // Generate OTP token
//         const otpToken = await createOtpToken({
//           otp: Otp,
//           email: email || email_mobNo,
//         });
//         if (fcm.length > 50 && fcm) {
//           const fcm_Token = await userNotificationDevicesModel.findOne({
//             'devices.device_type': deviceType,
//             userId: buddy._id,
//           });

//           if (fcm_Token) {
//             // Update the specific device's FCM token and last login
//             await userNotificationDevicesModel.updateOne(
//               { 'devices.device_type': deviceType, userId: buddy._id },
//               {
//                 $set: {
//                   "devices.$.last_login": new Date(),
//                   "devices.$.fcm_token": fcm,
//                 }
//               },
//               { upsert: true }
//             );
//           } else {
//             // Add a new device if it doesn't exist for this userId
//             await userNotificationDevicesModel.updateOne(
//               { userId: buddy._id },
//               {
//                 $push: {
//                   devices: {
//                     device_type: deviceType,
//                     fcm_token: fcm,
//                     last_login: new Date(),
//                     platform_info: {
//                       os_version: deviceVersion,
//                       app_version: appVersion
//                     }
//                   }
//                 }
//               },
//               { upsert: true }
//             );
//           }
//         } else {
//           var FCM = "Please enter Valid FCM Token.";
//         }


//         res.status(201).send({
//           message:
//             "Registration successful! We have sent you an OTP. Please check your email or mobile number.",
//           otpToken,
//           buddy,
//           FCM
//         });
//       } else {
//         res.status(400).send({ message: "Referral Code Does not Match" });
//       }
//     } else {
//       // Create the buddy user
//       const buddy = new BuddysModel({
//         fullName: req.body.fullName,
//         emailId: type === "email" ? email_mobNo : "",
//         mobNo: type === "mobNo" ? email_mobNo : "",
//         countryCode: req.body.countryCode,
//         dob: req.body.dob,
//         password: await hashPassword(password),
//         referralCode: await generateReferralCode(6),
//         referredBy: req.body.referredBy,
//         // otp: Otp,
//         userName: genUserName,
//       });
//       await buddy.save();

//       // Generate OTP token
//       const otpToken = await createOtpToken({
//         otp: Otp,
//         email: email || email_mobNo,
//       });
//       if (fcm.length > 50 && fcm) {
//         const fcm_Token = await userNotificationDevicesModel.findOne({
//           'devices.device_type': deviceType,
//           userId: buddy._id,
//         });

//         if (fcm_Token) {
//           // Update the specific device's FCM token and last login
//           await userNotificationDevicesModel.updateOne(
//             { 'devices.device_type': deviceType, userId: buddy._id },
//             {
//               $set: {
//                 "devices.$.last_login": new Date(),
//                 "devices.$.fcm_token": fcm,
//               }
//             },
//             { upsert: true }
//           );
//         } else {
//           // Add a new device if it doesn't exist for this userId
//           await userNotificationDevicesModel.updateOne(
//             { userId: buddy._id },
//             {
//               $push: {
//                 devices: {
//                   device_type: deviceType,
//                   fcm_token: fcm,
//                   last_login: new Date(),
//                   platform_info: {
//                     os_version: deviceVersion,
//                     app_version: appVersion
//                   }
//                 }
//               }
//             },
//             { upsert: true }
//           );
//         }
//       } else {
//         var FCM = "Please enter Valid FCM Token.";
//       }

//       let PIC = await profileImageModel.findOne({ userId: buddy._id });
//       let PERSONAL = await personalDetailsModel.findOne({ userId: buddy._id });

//       let updatedBuddy = buddy.toObject();

//       updatedBuddy.profilePic = PIC ? PIC.profilePic : null;
//       updatedBuddy.coverPic = PIC ? PIC.coverPic : null;
//       updatedBuddy.title = PERSONAL ? PERSONAL.title : null;

//       res.status(201).send({
//         message:
//           "Registration successful! We have sent you an OTP. Please check your email or mobile number.",
//         otpToken,
//         buddy: updatedBuddy, FCM
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({ message: "Internal Server Error", error });
//   }
// });


// // 4. User Login :
// router.post("/login", async (req, res) => {
//   try {
//     const { email, mobNo, role, countryCode, deviceName, deviceType, deviceVersion, appVersion, fcm } = req.body;
//     let buddy;
//     let roleCheck;
//     let loginType = "";  // Add this to track login type
//     if (email !== "") {
//       buddy = await BuddysModel.findOne({
//         $and: [{ emailId: email }, ],
//       })
//         .sort({ createdAt: -1 })
//         .limit(1);

//       loginType = "email";  // Set login type to email
//       // res.status(201).send({message:"Login Successfully",buddy})
//     } else if (mobNo !== "" && countryCode != "") {
//       buddy = await BuddysModel.findOne({
//         $and: [{ mobNo: mobNo }, { countryCode: countryCode }],
//       })
//         .sort({ createdAt: -1 })
//         .limit(1);

//       loginType = "mobile";  // Set login type to mobile
//       // res.status(201).send({message:"Login Successfully",buddy})
//     }

//     if (buddy) {
//       let isOtpVerified = buddy.isOtpVerified;
//       if (isOtpVerified) {
//         if (await hashCompare(req.body.password, buddy.password)) {
//           let token;
//           let refreshToken;
//           if (role) {
//             if (role == buddy.role) {
//               token = await createAdminToken({
//                 id: buddy._id,
//                 fullName: buddy.fullName,
//                 email: buddy.emailId,
//                 mobNo: buddy.mobNo,
//                 dob: buddy.dob,
//                 role: "admin",
//               });
//               refreshToken = await createRefreshAdminToken({
//                 id: buddy._id,
//                 fullName: buddy.fullName,
//                 email: buddy.emailId,
//                 mobNo: buddy.mobNo,
//                 dob: buddy.dob,
//                 role: "admin",
//               });
//             } else {
//               return res
//                 .status(400)
//                 .send({ message: "Only Admins can access" });
//             }
//           } else {
//             token = await createToken({
//               id: buddy._id,
//               fullName: buddy.fullName,
//               email: buddy.emailId,
//               mobNo: buddy.mobNo,
//               dob: buddy.dob,
//             });
//             refreshToken = await createRefreshToken({
//               id: buddy._id,
//               fullName: buddy.fullName,
//               email: buddy.emailId,
//               mobNo: buddy.mobNo,
//               dob: buddy.dob,
//             });
//           }
//           req.body.token = token;
//           req.body.refreshToken = refreshToken;
//           if (token) {
//             req.body.userId = buddy._id;
//             let tokenStore = new tokenModel(req.body);
//             await tokenStore.save();
//           }
//           if (fcm.length > 50 && fcm) {
//             const fcm_Token = await userNotificationDevicesModel.findOne({
//               'devices.device_type': deviceType,
//               userId: buddy._id,
//             });

//             if (fcm_Token) {
//               // Update the specific device's FCM token and last login
//               await userNotificationDevicesModel.updateOne(
//                 { 'devices.device_type': deviceType, userId: buddy._id },
//                 {
//                   $set: {
//                     "devices.$.last_login": new Date(),
//                     "devices.$.fcm_token": fcm,
//                   }
//                 },
//                 { upsert: true }
//               );
//             } else {
//               // Add a new device if it doesn't exist for this userId
//               await userNotificationDevicesModel.updateOne(
//                 { userId: buddy._id },
//                 {
//                   $push: {
//                     devices: {
//                       device_type: deviceType,
//                       fcm_token: fcm,
//                       last_login: new Date(),
//                       platform_info: {
//                         os_version: deviceVersion,
//                         app_version: appVersion
//                       }
//                     }
//                   }
//                 },
//                 { upsert: true }
//               );
//             }
//           } else {
//             var FCM = "Please enter Valid FCM Token.";
//           }

//           let PIC = await profileImageModel.findOne({ userId: buddy._id });
//           let PERSONAL = await personalDetailsModel.findOne({ userId: buddy._id });

//           let updatedBuddy = buddy.toObject();

//           updatedBuddy.profilePic = PIC ? PIC.profilePic : null;
//           updatedBuddy.coverPic = PIC ? PIC.coverPic : null;
//           updatedBuddy.title = PERSONAL ? PERSONAL.title : null;

//           buddy = updatedBuddy;

//           res.status(201).send({ message: "Login Successfully", token, refreshToken, buddy, FCM });
//         } else res.status(400).send({ message: "Invalid Credentials" });
//       } else {
//         // let result = isOtpVerified;
//         // Modify this block to show login details when OTP is not verified
//         const result = {
//           isOtpVerified: isOtpVerified,
//           loginType: loginType,
//           email: buddy.emailId,
//           mobNo: buddy.mobNo,
//           countryCode: buddy.countryCode,
//           // Include the login type (email or mobile)
//         };

//         res.status(200).send({ message: "Still OTP is not verified", result });
//       }
//     } else {
//       res.status(400).send({ message: "User Does Not Exist" });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({ message: "Internal Server Error", error });
//   }
// });

// // 7. Referral Codes List :
// router.post("/referralCodeDetails", tokenValidation, async (req, res) => {
//   const id = req.userId;
//   const action = req.body.action;
//   const referralCode = req.body.referralCode;
//   try {
//     let buddy = await BuddysModel.findOne({ _id: id });
//     if (buddy) {
//       if (action == "readByCode") {
//         let result = await referralModel.find({ referralCode: referralCode });
//         res.status(200).send({ message: "Referral Code List", result });
//       } else if (action == "readMine") {
//         let result = await referralModel.find({ referredBy: id });
//         res.status(200).send({ message: "Referral Code List", result });
//       } else res.status(400).send({ message: "Action Does Not Exist" });
//     } else res.status(400).send({ message: "UserId Does Not Exist" });
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({ message: "Internal Server Error" });
//   }
// });


// //Validate user against email or mobile number and send the OTP
// router.post("/validateUserForOTP", async (req, res) => {
//   try {
//     const { type, email_mobNo_userName, countryCode } = req.body;
//     let existingUser;
//     // Check if user exists
//     if (type === "userName") {
//       existingUser = await BuddysModel.findOne({ userName: email_mobNo_userName });
//     } else if (type === "email") {
//       existingUser = await BuddysModel.findOne({ emailId: email_mobNo_userName });
//     } else if (type === "mobNo") {
//       existingUser = await BuddysModel.findOne({ countryCode: countryCode, mobNo: email_mobNo_userName });
//     } else {
//       return res.status(400).send({ message: "Invalid type" });
//     }

//     if (!existingUser) {
//       return res.status(400).send({ message: "Invalid Email/Mobile number!" });
//     }

//     await sendOtp(existingUser);
//     return res.status(201).send({ message: "OTP has been sent successfully" });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).send({ message: "Internal Server Error" });
//   }
// });

// //Validate the OTP
// router.post("/validateOTP", async (req, res) => {
//   try {
//     const { action, type, email_mobNo_userName, countryCode, otp } = req.body;
//     if (!action || (action != 'verifyUser' || action != 'passwordReset')) {
//       return res.status(400).send({ message: "Invalid action" });
//     }
//     let existingUser;
//     // Check if user exists
//     if (type === "userName") {
//       existingUser = await BuddysModel.findOne({ userName: email_mobNo_userName });
//     } else if (type === "email") {
//       existingUser = await BuddysModel.findOne({ emailId: email_mobNo_userName });
//     } else if (type === "mobNo") {
//       existingUser = await BuddysModel.findOne({ countryCode: countryCode, mobNo: email_mobNo_userName });
//     } else {
//       return res.status(400).send({ message: "Invalid type" });
//     }

//     if (!existingUser) {
//       return res.status(400).send({ message: "Invalid Email/Mobile number!" });
//     }

//     if (action == 'passwordReset') {
//       if (existingUser.otpExpiry < (new Date())) {
//         await sendOtp(existingUser);
//         return res.status(400).send({ message: "OTP is expired. New OTP has been sent successfully" });
//       } else if (!await hashCompareOtp(otp, existingUser.otp)) {
//         return res.status(400).send({ message: "OTP is invalid. Kindly try again!" });
//       }
//     } else if (action == 'verifyUser') {
//       let otpCheck;
//       if (type === "email") {
//         otpCheck = await otpModel
//           .findOne({ $and: [{ emailId: email }, { mobNo: "" }] })
//           .sort({ createdAt: -1 })
//           .limit(1);
//       } else if (type === "mobNo") {
//         otpCheck = await otpModel
//           .findOne({ $and: [{ emailId: "" }, { mobNo: mobNo }, { countryCode: countryCode }] })
//           .sort({ createdAt: -1 })
//           .limit(1);
//       }
//       if (await hashCompareOtp(otp, otpCheck.otp)) {
//         await BuddysModel.updateOne(
//           { _id: existingUser?._id },
//           { $set: { isOtpVerified: true } },
//           { new: true }
//         );
//       } else {
//         return res.status(400).send({ message: "OTP is invalid. Kindly try again!" });
//       }
//     }
//     return res.status(201).send({ message: "OTP has been validated successfully" });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).send({ message: "Internal Server Error" });
//   }
// });

// const sendOtp = async (user) => {
//   // Generate OTP and hash it
//   const otpLength = 6;
//   const Otp = await generateOTP(otpLength);
//   const hash = await hashOtp(Otp);

//   // Create the OTP record
//   if (user.email) {
//     // await sendOtpToEmail({
//     //   userName: user.fullName,
//     //   userEmail: user.emailId,
//     //   otp: Otp,
//     // });
//   }
//   if (user.mobNo && user.countryCode) {
//     // await sendOtpToMobno({
//     //   otp: Otp,
//     //   countryCode: user.countryCode,
//     //   mobNo: user.mobNo,
//     // });
//   }

//   let otpExpiry = new Date();
//   otpExpiry.setMinutes(otpExpiry.getMinutes() + 30);
//   user = await BuddysModel.updateOne(
//     { _id: user._id },
//     {
//       $set: {
//         otp: hash,
//         otpExpiry
//       }
//     },
//     { new: true }
//   );
// }

// //Refresh Token
// router.post("/refreshToken", async (req, res) => {
//   try {
//     const { refreshToken } = req.body;
//     let { id, ...data } = decodeToken(refreshToken);
//     if (!(Math.floor(Date.now() / 1000) <= data.exp)) {
//       res.status(401).send({ message: "Token Expired" });
//     }
//     let tokenData = await tokenModel.findOne({ refreshToken });
//     if (tokenData) {
//       let buddy = await BuddysModel.findOne({ _id: tokenData.userId }, { password: 0, otp: 0, otpExpiry: 0});
//       let token = await createToken({
//         id: buddy._id,
//         fullName: buddy.fullName,
//         email: buddy.emailId,
//         mobNo: buddy.mobNo,
//         dob: buddy.dob,
//       });
//       let newRefreshToken = await createRefreshToken({
//         id: buddy._id,
//         fullName: buddy.fullName,
//         email: buddy.emailId,
//         mobNo: buddy.mobNo,
//         dob: buddy.dob,
//       });
//       let result = await tokenModel.findOneAndUpdate(
//         { _id: tokenData._id },
//         {
//           $set: {
//             token,
//             refreshToken: newRefreshToken,
//             updatedAt: new Date()
//           }
//         },
//         {
//           new: true
//         }
//       );
//       let PIC = await profileImageModel.findOne({ userId: buddy._id }).select("profilePic coverPic");
//       let PERSONAL = await personalDetailsModel.findOne({ userId: buddy._id });

//       let updatedBuddy = buddy.toObject();

//       updatedBuddy.profilePic = PIC ? PIC.profilePic : null;
//       updatedBuddy.coverPic = PIC ? PIC.coverPic : null;
//       updatedBuddy.title = PERSONAL ? PERSONAL.title : null;

//       buddy = updatedBuddy;

//       res.status(200).send({
//         message: "Refresh Token generated",
//         token: result.token,
//         refreshToken: result.refreshToken,
//         buddy
//       });
//     } else res.status(400).send({ message: "Invalid Token. Kindly relogin" });
//   } catch (error) {
//     console.log("error ---> ", error);
//     res.status(500).send({ message: "Internal Server Error", error });
//   }
// });

// // 1. Whatsapp Buddy Registration :
// router.post("/newsignup", async (req, res) => {
//   try {
//     const {
//       fullName,
//       type,
//       email_mobNo,
//       countryCode,
//       dob,
//       referredByCode,
//       deviceName,
//       deviceType,
//       deviceVersion,
//       appVersion,
//       fcm,
//       otpTo
//     } = req.body;

//     // Check if either email or mobile number is provided
//     if (!email_mobNo) {
//       return res
//         .status(400)
//         .json({ message: "Email or mobile number is required" });
//     }

//     let existingUser;

//     // Check if email is already registered
//     if (otpTo === "email") {
//       existingUser = await BuddysModel.findOne({
//         $and: [{ emailId: email_mobNo }],
//         countryCode,
//       });
//       if (existingUser)
//         return res.status(400).json({ message: "Email is already registered" });
//     }

//     // Check if mobile number is already registered
//     if (otpTo === "sms" || otpTo === "whatsapp") {
//       existingUser = await BuddysModel.findOne({
//         $and: [{ mobNo: email_mobNo }],
//         countryCode,
//       });
//       if (existingUser)
//         return res
//           .status(400)
//           .json({ message: "Mobile number is already registered" });
//     }

//     // Generate OTP and hash it
//     const otpLength = 6;
//     const Otp = await generateOTP(otpLength);
//     const hash = await hashOtp(Otp);

//     // Create the OTP record
//     let otpSave;
//     if (otpTo !== "") {
//       if (otpTo === "email") {
//         // await sendOtpToEmail({mailTo : email_mobNo, otp : Otp})
//         // await sendOtpToEmail({
//         //   userName: fullName,
//         //   userEmail: email_mobNo,
//         //   otp: Otp,
//         // });
//         otpSave = new otpModel({
//           emailId: email_mobNo,
//           countryCode: "",
//           mobNo: "",
//           otp: hash,
//         });
//       }else{
//         if (req.body.countryCode) {
//           if (otpTo === "whatsapp") {
//             // await sendOtpToWhatsApp({
//             //   otp: Otp,
//             //   countryCode: req.body.countryCode,
//             //   mobNo: email_mobNo,
//             // });
//           } else if (otpTo === "sms") {
//             // await sendOtpToMobno({
//             //   otp: Otp,
//             //   countryCode: req.body.countryCode,
//             //   mobNo: email_mobNo,
//             // });
//           }
//         } else {
//           return res.status(400).json({ message: "Country Code Does Not Exsist" });
//         }
//       }


//     } else {
//       return res.status(400).json({ message: "OTP Preference is missing" });
//     }

//     if (type == "email") {
//       otpSave = new otpModel({
//         emailId: email_mobNo,
//         countryCode,
//         mobNo: "",
//         otp: hash,
//       });
//       await otpSave.save();

//     } else if (type == "mobNo") {
//       otpSave = new otpModel({
//         emailId: "",
//         countryCode,
//         mobNo: email_mobNo,
//         otp: hash,
//       });
//       await otpSave.save();
//     }

//     // Generate User Name  :
//     const genUserName = await generateUsername(fullName, dob);

//     // If Buddy entered referredByCode :
//     if (referredByCode) {
//       let referralCode = await BuddysModel.findOne({
//         referralCode: referredByCode,
//       });
//       if (referralCode) {
//         let result = new referralModel({
//           referredBy: referralCode._id,
//           referredTo: email_mobNo,
//           referralCode: referredByCode,
//         });
//         await result.save();

//         // let hashPassword = "";
//         // if (otpTo != "whatsapp") {
//         //   hashPassword = await hashPassword(password);
//         // }

//         // Create the buddy user
//         const buddy = new BuddysModel({
//           fullName: req.body.fullName,
//           emailId: otpTo === "email" ? email_mobNo : "",
//           mobNo: (otpTo === "sms" || otpTo === "whatsapp") ? email_mobNo : "",
//           countryCode: req.body.countryCode,
//           dob: req.body.dob,
//           password: "",
//           referralCode: await generateReferralCode(6),
//           referredBy: req.body.referredBy,
//           // otp: Otp,
//           userName: genUserName,
//           registeredThought: (otpTo === "email") ? "email" : "sms",
//           smsPreferance: otpTo
//         });
//         await buddy.save();
      
//         // Generate OTP token
//         const otpToken = await createOtpToken({
//           otp: Otp,
//           email: email || email_mobNo,
//         });
//         if (fcm.length > 50 && fcm) {
//           const fcm_Token = await userNotificationDevicesModel.findOne({
//             'devices.device_type': deviceType,
//             userId: buddy._id,
//           });

//           if (fcm_Token) {
//             // Update the specific device's FCM token and last login
//             await userNotificationDevicesModel.updateOne(
//               { 'devices.device_type': deviceType, userId: buddy._id },
//               {
//                 $set: {
//                   "devices.$.last_login": new Date(),
//                   "devices.$.fcm_token": fcm,
//                 }
//               },
//               { upsert: true }
//             );
//           } else {
//             // Add a new device if it doesn't exist for this userId
//             await userNotificationDevicesModel.updateOne(
//               { userId: buddy._id },
//               {
//                 $push: {
//                   devices: {
//                     device_type: deviceType,
//                     fcm_token: fcm,
//                     last_login: new Date(),
//                     platform_info: {
//                       os_version: deviceVersion,
//                       app_version: appVersion
//                     }
//                   }
//                 }
//               },
//               { upsert: true }
//             );
//           }
//         } else {
//           var FCM = "Please enter Valid FCM Token.";
//         }
//         let checkid = await BuddysModel.findOne({
//           $or: [
//             { mobNo: (otpTo === "sms" || otpTo === "whatsapp") ? email_mobNo : "" },
//             { emailId: otpTo === "email" ? email_mobNo : "" }
//           ]
//         });

//         let personal;
//         if(checkid) {
//           personal = new personalDetailsModel({
//             fullName: buddy.fullName,
//             userName: buddy.userName,
//             userId: buddy._id,
//             title:"",
//             dob: req.body.dob,
//             state:"", 
//             district:"", 
//             country:"",
//             gender: "",
//             languages:[],
//             aboutMe:"",
//             referralCode: buddy.referralCode,
//           });
//           await personal.save();
//         }

//         let profileimage;
//         let checkimage = await profileImageModel.findOne({userId:buddy._id});
//         if(!checkimage) {
//           profileimage = new profileImageModel({
//               userId: buddy._id,
//               profilePic: "https://dev-mybuddys-assets.blr1.digitaloceanspaces.com/mb_img_813b8_1729656742582_0", 
//               coverPic: "https://dev-mybuddys-assets.blr1.digitaloceanspaces.com/mb_img_813b8_1729657614235_0",
//           });
//           await profileimage.save();
//         }

//         res.status(201).send({
//           message:
//             "Registration successful! We have sent you an OTP. Please check your email or mobile number.",
//           otpToken,
//           buddy,
//           FCM
//         });
//       } else {
//         res.status(400).send({ message: "Referral Code Does not Match" });
//       }
//     } else {

//       // let hashPassword = "";
//       // if (otpTo != "whatsapp") {
//       //   let hashPassword = await hashPassword(password);
//       // }

//       // Create the buddy user
//       const buddy = new BuddysModel({
//         fullName: req.body.fullName,
//         emailId: otpTo === "email" ? email_mobNo : "",
//         mobNo: (otpTo === "sms" || otpTo === "whatsapp") ? email_mobNo : "",
//         countryCode: req.body.countryCode,
//         dob: req.body.dob,
//         password: "",
//         referralCode: await generateReferralCode(6),
//         referredBy: req.body.referredBy,
//         // otp: Otp,
//         userName: genUserName,
//         registeredThought: (otpTo === "email") ? "email" : "sms",
//         smsPreferance: otpTo
//       });
//       await buddy.save();

//       // Generate OTP token
//       const otpToken = await createOtpToken({
//         otp: Otp,
//         email: email_mobNo,
//       });
//       let checkid = await BuddysModel.findOne({
//         $or: [
//           { mobNo: (otpTo === "sms" || otpTo === "whatsapp") ? email_mobNo : "" },
//           { emailId: otpTo === "email" ? email_mobNo : "" }
//         ]
//       });

//       let personal;
//       if(checkid) {
//         personal = new personalDetailsModel({
//           fullName: buddy.fullName,
//           userName: buddy.userName,
//           userId: buddy._id,
//           title:"",
//           dob: req.body.dob,
//           state:"", 
//           district:"", 
//           country:"",
//           gender: "",
//           languages:[],
//           aboutMe:"",
//           referralCode: buddy.referralCode,
//         });
//         await personal.save();
//       }

//       let profileimage;
//       let checkimage = await profileImageModel.findOne({userId:buddy._id});
//       if(!checkimage) {
//         profileimage = new profileImageModel({
//             userId: buddy._id,
//             profilePic: "https://dev-mybuddys-assets.blr1.digitaloceanspaces.com/mb_img_813b8_1729656742582_0", 
//             coverPic: "https://dev-mybuddys-assets.blr1.digitaloceanspaces.com/mb_img_813b8_1729657614235_0",
//         });
//         await profileimage.save();
//       }

//       res.status(201).send({
//         message:
//           "Registration successful! We have sent you an OTP. Please check your email or mobile number.",
//         otpToken,
//         buddy
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({ message: "Internal Server Error", error });
//   }
// });

// // 2. WhatsApp OTP Verification :
// router.post("/newotpVerification", otpValidation, async (req, res) => {
//   try {
//     const { otp, email, mobNo, fcm, deviceType, deviceName, deviceVersion, appVersion } = req.body;

//     if (otp) {
//       let buddy;
//       let otpCheck;
//       if (email !== "") {
//         otpCheck = await otpModel
//           .findOne({ $and: [{ emailId: email }, { mobNo: "" }] })
//           .sort({ createdAt: -1 })
//           .limit(1);
//       } else if (mobNo !== "") {
//         otpCheck = await otpModel
//           .findOne({ $and: [{ emailId: "" }, { mobNo: mobNo }] })
//           .sort({ createdAt: -1 })
//           .limit(1);
//       }

//       if (email !== "") {
//         buddy = await BuddysModel.findOne({
//           $and: [{ emailId: email }],
//         })
//           .sort({ createdAt: -1 })
//           .limit(1);
//       } else if (mobNo !== "") {
//         buddy = await BuddysModel.findOne({
//           $and: [{ mobNo: mobNo }],
//         })
//           .sort({ createdAt: -1 })
//           .limit(1);
//       }

//       if (buddy) {
//         if (await hashCompareOtp(otp, otpCheck.otp)) {
//           let token = await createToken({
//             id: buddy._id,
//             fullName: buddy.fullName,
//             email: buddy.emailId,
//             mobNo: buddy.mobNo,
//             dob: buddy.dob,
//           });
//           let refreshToken = await createRefreshToken({
//             id: buddy._id,
//             fullName: buddy.fullName,
//             email: buddy.emailId,
//             mobNo: buddy.mobNo,
//             dob: buddy.dob,
//           });
//           req.body.token = token;
//           req.body.refreshToken = refreshToken;
//           if (token) {
//             req.body.userId = buddy._id;
//             let tokenStore = new tokenModel(req.body);
//             await tokenStore.save();
//           }
//           await BuddysModel.findOneAndUpdate(
//             { _id: buddy._id },
//             { $set: { isOtpVerified: true } }
//           );
//           buddy.isOtpVerified = true;

//           if (email !== "") {
//             await BuddysModel.findOneAndUpdate(
//               { _id: buddy._id },
//               { $set: { isEmailVerified: true } }
//             );

//             buddy.isEmailVerified = true;
//           } else if (mobNo !== "") {
//             await BuddysModel.findOneAndUpdate(
//               { _id: buddy._id },
//               { $set: { isMobileVerified: true } }
//             );

//             buddy.isMobileVerified = true;
//           }

//           if (fcm.length > 50 && fcm) {
//             const fcm_Token = await userNotificationDevicesModel.findOne({
//               'devices.device_type': deviceType,
//               userId: buddy._id,
//             });
    
//             if (fcm_Token) {
//               // Update the specific device's FCM token and last login
//               await userNotificationDevicesModel.updateOne(
//                 { 'devices.device_type': deviceType, userId: buddy._id },
//                 {
//                   $set: {
//                     "devices.$.last_login": new Date(),
//                     "devices.$.fcm_token": fcm,
//                   }
//                 },
//                 { upsert: true }
//               );
//             } else {
//               // Add a new device if it doesn't exist for this userId
//               await userNotificationDevicesModel.updateOne(
//                 { userId: buddy._id },
//                 {
//                   $push: {
//                     devices: {
//                       device_type: deviceType,
//                       fcm_token: fcm,
//                       last_login: new Date(),
//                       platform_info: {
//                         os_version: deviceVersion,
//                         app_version: appVersion
//                       }
//                     }
//                   }
//                 },
//                 { upsert: true }
//               );
//             }
//           } else {
//             var FCM = "Please enter Valid FCM Token.";
//           }

//           let buddyProfile = await profileImageModel.findOne({ userId: buddy._id })
//           let profile = [{
//             profilePic: (buddyProfile) ? buddyProfile.profilePic : "",
//             coverPic: (buddyProfile) ? buddyProfile.coverPic : "",
//           }];
//           let buddyPersonalDetails = await personalDetailsModel.findOne({ userId: buddy._id })
//           let FCMToken = await userNotificationDevicesModel.findOne({
//             'devices.device_type': deviceType,
//             userId: buddy._id,
//           });
//           const result = [{
//             isOtpVerified: buddy.isOtpVerified,
//             email: buddy.emailId,
//             mobNo: buddy.mobNo,
//             countryCode: buddy.countryCode,
//             fullName: buddy.fullName,
//             username: buddy.userName,
//             profilePic: profile[0].profilePic, 
//             coverPic: profile[0].coverPic,
//             images: profile,
//             isVerified: buddy.isVerified,
//             referralCode: buddy.referralCode,
//             // dob: buddy.dob,
//             // isBlocked: buddy.isBlocked,
//             // adminComment: buddy.adminComment,
//             // createdAt: buddy.createdAt,
//             // updatedAt: buddy.updatedAt,
//             // lastActive: buddy.lastActive,
//             // isLocked: buddy.isLocked,
//             // isSuspended: buddy.isSuspended,
//             // isVerfiedDetails: buddy.isVerfiedDetails,
//             // registeredThought: buddy.registeredThought,
//             // smsPreferance: buddy.smsPreferance,
//             // emailId: buddy.emailId,
//             // mobileNumber: buddy.mobNo,
//             title: (buddyPersonalDetails) ? buddyPersonalDetails.title : "",
//             isEmailVerified: buddy.isEmailVerified,
//             isMobileVerified: buddy.isMobileVerified,
//             // district: (buddyPersonalDetails.districtId) ? await DistrictModel.findOne({ _id: buddyPersonalDetails.districtId }).select("districtName") : "",
//             // state: (buddyPersonalDetails.stateId) ? await StateSModel.findOne({ _id: buddyPersonalDetails.stateId }).select("stateName") : "",
//             // country: (buddyPersonalDetails.countryId) ? await CountryModel.findOne({ _id: buddyPersonalDetails.countryId }).select("countyName") : "",
//             // countryId: (buddyPersonalDetails) ? buddyPersonalDetails.countryId : "",
//             // districtId: (buddyPersonalDetails) ? buddyPersonalDetails.districtId : "",
//             // stateId: (buddyPersonalDetails) ? buddyPersonalDetails.stateId : "",
//             fcm: (FCMToken)?FCMToken.devices[0].fcm_token:"",
//             _id: buddy._id,
//             // Include the login type (email or mobile)
//           }];

//           res
//             .status(201)
//             .send({ message: "OTP Verified Successfully", token, refreshToken, result, FCM });
//         } else {
//           res.status(400).send({ message: "Invalid OTP" });
//         }
//       } else {
//         res.status(400).send({ message: "Invalid Email or Mobile Number" });
//       }
//     }
//   } catch (error) {
//     console.error("Error occurred:", error);
//     res.status(500).send({ message: "Internal Server Error", error });
//   }
// });

// // 3. whatsApp Resend OTP :
// router.post("/newresendOtp", async (req, res) => {
//   try {
//     let query = (req.body.otpTo == "email") ? { emailId: req.body.email } : { countryCode: req.body.countryCode, mobNo: req.body.mobNo };

//     let buddy = await BuddysModel.findOne(query);

//     if (buddy) {

//       let otpLength = 6;
//       let Otp = await generateOTP(otpLength);
//       let hash = await hashOtp(Otp);

//       if (req.body.otpTo == "email") {
//         // await sendOtpToEmail({
//         //   userName: buddy.fullName,
//         //   userEmail: buddy.emailId,
//         //   otp: Otp,
//         // });
//       }
//       if (req.body.countryCode) {

//         if (req.body.otpTo == "whatsapp") {
//         //   await sendOtpToWhatsApp({
//         //     otp: Otp,
//         //     countryCode: req.body.countryCode,
//         //     mobNo: req.body.mobNo,
//         //   });
//         } else if (req.body.otpTo == "sms") {
//         //   await sendOtpToMobno({
//         //     otp: Otp,
//         //     countryCode: req.body.countryCode,
//         //     mobNo: req.body.mobNo,
//         //   });
//         }
//       } else {
//         res.status(400).send({ message: "Country Code Does Not Exist" });
//       }

//       let otpSave = new otpModel({
//         emailId: req.body.email,
//         countryCode: req.body.countryCode,
//         mobNo: req.body.mobNo,
//         otp: hash,
//       });
//       await otpSave.save();
//       const otpToken = await createOtpToken({
//         otp: Otp,
//         email: req.body.email,
//       });
//       res.status(201).send({
//         message:
//           "We have sent you an OTP. Please check your email or mobile number",
//         otpToken,
//       });

//     } else {
//       res.status(400).send({ message: "User Does Not Exist" });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({ message: "Internal Server Error", error });
//   }
// });

// // 4. User Login :
// router.post("/newlogin", async (req, res) => {
//   try {
//     const {  mobNo, role, countryCode, deviceName, deviceType, deviceVersion, appVersion, fcm, otpTo } = req.body;
//     const email = req.body.email.toLowerCase()
//     let buddy;
//     let roleCheck;
//     let loginType = "";  // Add this to track login type
//     if (email !== "") {
//       buddy = await BuddysModel.findOne({
//         $and: [{ emailId: email }],
//       })
//         .sort({ createdAt: -1 })
//         .limit(1);

//       loginType = "email";  // Set login type to email
//       // res.status(201).send({message:"Login Successfully",buddy})
//     } else if (mobNo !== "" && countryCode != "") {
//       buddy = await BuddysModel.findOne({
//         $and: [{ mobNo: mobNo }, { countryCode: countryCode }],
//       })
//         .sort({ createdAt: -1 })
//         .limit(1);

//       loginType = "mobile";  // Set login type to mobile
//       // res.status(201).send({message:"Login Successfully",buddy})
//     }
//     if (buddy) {
//       let isOtpVerified = buddy.isOtpVerified;
//       let buddyProfile = await profileImageModel.findOne({ userId: buddy._id })
//       let profile = [{
//         profilePic: (buddyProfile) ? buddyProfile.profilePic : "",
//         coverPic: (buddyProfile) ? buddyProfile.coverPic : "",
//       }];
//       let buddyPersonalDetails = await personalDetailsModel.findOne({ userId: buddy._id })

//       let formatMobileNumber = (buddy.mobNo) ? await formatMobileNumberStar(buddy.mobNo) : buddy.mobNo;
//       let formatEmail = (buddy.emailId) ? await formatEmailStar(buddy.emailId) : buddy.emailId;

//       if (fcm.length > 50 && fcm) {
//         const fcm_Token = await userNotificationDevicesModel.findOne({
//           'devices.device_type': deviceType,
//           userId: buddy._id,
//         });

//         if (fcm_Token) {
//           // Update the specific device's FCM token and last login
//           await userNotificationDevicesModel.updateOne(
//             { 'devices.device_type': deviceType, userId: buddy._id },
//             {
//               $set: {
//                 "devices.$.last_login": new Date(),
//                 "devices.$.fcm_token": fcm,
//               }
//             },
//             { upsert: true }
//           );
//         } else {
//           // Add a new device if it doesn't exist for this userId
//           await userNotificationDevicesModel.updateOne(
//             { userId: buddy._id },
//             {
//               $push: {
//                 devices: {
//                   device_type: deviceType,
//                   fcm_token: fcm,
//                   last_login: new Date(),
//                   platform_info: {
//                     os_version: deviceVersion,
//                     app_version: appVersion
//                   }
//                 }
//               }
//             },
//             { upsert: true }
//           );
//         }
//       } else {
//         var FCM = "Please enter Valid FCM Token.";
//       }
      
//       let FCMToken = await userNotificationDevicesModel.findOne({
//         'devices.device_type': deviceType,
//         userId: buddy._id,
//       });
//       const result = [{
//         isOtpVerified: isOtpVerified,
//         loginType: loginType,
//         email: formatEmail,
//         mobNo: formatMobileNumber,
//         countryCode: buddy.countryCode,
//         fullName: buddy.fullName,
//         username: buddy.userName,
//         profilePic: profile[0].profilePic, 
//         coverPic: profile[0].coverPic,
//         images: profile,
//         isVerified: buddy.isVerified,
//         referralCode: buddy.referralCode,
//         // dob: buddy.dob,
//         isBlocked: buddy.isBlocked,
//         adminComment: buddy.adminComment,
//         createdAt: buddy.createdAt,
//         updatedAt: buddy.updatedAt,
//         // lastActive: buddy.lastActive,
//         // isLocked: buddy.isLocked,
//         // isSuspended: buddy.isSuspended,
//         // isVerfiedDetails: buddy.isVerfiedDetails,
//         // registeredThought: buddy.registeredThought,
//         // smsPreferance: buddy.smsPreferance,
//         // emailId: buddy.emailId,
//         // mobileNumber: formatMobileNumber,
//         // title: (buddyPersonalDetails) ? buddyPersonalDetails.title : "",
//         // district:(buddyPersonalDetails) ? buddyPersonalDetails.district : "",
//         // state:(buddyPersonalDetails) ? buddyPersonalDetails.state : "",
//         // country:(buddyPersonalDetails) ? buddyPersonalDetails.country : "",
//         _id: buddy._id,
//         fcm: (FCMToken)?FCMToken.devices[0].fcm_token:"",
//         // Include the login type (email or mobile)
//       }];
//       let otpToken = "";
//       if (otpTo !== "") {

//         let otpLength = 6;
//         let Otp = await generateOTP(otpLength);
//         let hash = await hashOtp(Otp);

//         if (otpTo === "email") {
//         //   await sendOtpToEmail({
//         //     userName: buddy.fullName,
//         //     userEmail: req.body.email || buddy.emailId,
//         //     otp: Otp,
//         //   });
//         }

//         if (req.body.countryCode) {

//           if (otpTo === "sms") {
//             // await sendOtpToMobno({
//             //   otp: Otp,
//             //   countryCode: req.body.countryCode || buddy.countryCode,
//             //   mobNo: req.body.mobNo || buddy.mobNo,
//             // });
//           } else if (otpTo === "whatsapp") {
//             // await sendOtpToWhatsApp({
//             //   otp: Otp,
//             //   countryCode: req.body.countryCode || buddy.countryCode,
//             //   mobNo: req.body.mobNo || buddy.mobNo,
//             // });
//           }
//         } else {
//           return res.status(400).send({ message: "Country Code Does Not Exist" });
//         }

//         let otpSave = new otpModel({
//           emailId: req.body.email,
//           countryCode: req.body.countryCode,
//           mobNo: req.body.mobNo,
//           otp: hash,
//         });

//         await otpSave.save();

//         otpToken = await createOtpToken({
//           otp: Otp,
//           email: req.body.email,
//         });

//       }

//       res.status(200).send({ message: "User Details Exist", existingUser: true, otpToken: otpToken, result: result });
//       // }
//     } else {
//       res.status(400).send({ message: "User Does Not Exist", existingUser: false, result: [] });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({ message: "Internal Server Error", error });
//   }
// });

// // update emailId and mobNo
// router.post("/updateEmailOrMobile", tokenValidation, async (req, res) => {
//   try {
//     const id = req.userId;
//     const { action, type, countryCode, mobno, email, otpTo } = req.body;
//     req.body.userId = id;

//     const mobileRegex = /^[0-9]{10,15}$/; // Adjust as needed for your use case
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//     if (type === "mobNo" && !mobileRegex.test(mobno)) {
//       return res.status(400).json({ message: "Invalid mobile number format" });
//     }
    
//     if (type === "email" && !emailRegex.test(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     let buddy = await BuddysModel.findOne({ _id: id });
//     if (buddy) {  
//       if (type === "email" && otpTo !== "email") {
//         return res.status(400).json({ message: "OTP Preference for Email must be 'email'" });
//       }

//       if (type === "mobNo" && otpTo !== "sms" && otpTo !== "whatsapp") {
//         return res.status(400).json({ message: "OTP Preference for mobile number must be 'sms' or 'whatsapp'" });
//       }

//       if (action === "update" || action === "change") {
//         if (action === "update") {
//           const emailOrMobile = type === "mobNo" ? mobno : email;

//           const existingUser = await BuddysModel.findOne({
//             $and: [
//               { [type === "mobNo" ? "mobNo" : "emailId"]: emailOrMobile },
//               { _id: { $ne: id } },
//             ],
//             ...(type === "mobNo" && { countryCode }),
//           });

//           if (existingUser) {
//             return res.status(400).json({
//               message: type === "mobNo" ? "Mobile number is already registered" : "Email is already registered",
//             });
//           }

//           if (type === "mobNo" && buddy.mobNo) {
//             return res.status(400).json({ message: "Mobile number already exists for this user" });
//           } else if (type === "email" && buddy.emailId) {
//             return res.status(400).json({ message: "Email already exists for this user" });
//           }
//         } else if (action === "change") {
//           const emailOrMobile = type === "mobNo" ? mobno : email;

//           const existingUser = await BuddysModel.findOne({
//             $and: [
//               { [type === "mobNo" ? "mobNo" : "emailId"]: emailOrMobile },
//               { _id: { $ne: id } },
//             ],
//             ...(type === "mobNo" && { countryCode }),
//           });

//           if (existingUser) {
//             return res.status(400).json({
//               message: type === "mobNo" ? "Mobile number is already registered" : "Email is already registered",
//             });
//           }
//         }

//         let updateFields = {};
//         const emailOrMobile = type === "mobNo" ? mobno : email;

//         if (type === "mobNo") {
//           updateFields = { mobNo: mobno, countryCode: countryCode, isMobileVerified: false };
//         } else if (type === "email") {
//           updateFields = { emailId: email, isEmailVerified: false };
//         } else {
//           return res.status(400).send({ message: "Type Does Not Exist" });
//         }

//         const result = await BuddysModel.findOneAndUpdate(
//           { _id: buddy._id },
//           updateFields,
//           { new: true }
//         );

//         // Generate OTP
//         const otpLength = 6;
//         const Otp = await generateOTP(otpLength);
//         const hash = await hashOtp(Otp);

//         // Send OTP and Save OTP Model
//         if (!otpTo) return res.status(400).json({ message: "OTP Preference is missing" });

//         if (otpTo === "email") {
//         //   await sendOtpToEmail({
//         //     userName: buddy.fullName,
//         //     userEmail: emailOrMobile,
//         //     otp: Otp,
//         //   });
//         } else if (otpTo === "sms" || otpTo === "whatsapp") {
//           if (!countryCode) throw new Error("Country Code Does Not Exist");

//         //   const otpSender = otpTo === "whatsapp" ? sendOtpToWhatsApp : sendOtpToMobno;
//         //   await otpSender({ otp: Otp, countryCode, mobNo: emailOrMobile });
//         }

//         const otpSave = new otpModel({
//           emailId: otpTo === "email" ? emailOrMobile : "",
//           mobNo: otpTo !== "email" ? emailOrMobile : "",
//           countryCode: otpTo !== "email" ? countryCode : "",
//           otp: hash,
//         });
//         await otpSave.save();
//         const otpToken = await createOtpToken({
//           otp: Otp,
//           email: emailOrMobile,
//         });

//         res.status(200).send({ message: `${type === "mobNo" ? "Mobile number" : "Email"} is ${action == "update" ? "Updated." : "Changed."}`, otpToken, result });
//       } else {
//         return res.status(400).send({ message: "Action Does Not Exist" });
//       }
//     } else {
//       return res.status(400).send({ message: "User Does Not Exist" });
//     }
//   } catch (error) {
//     res.status(500).send({ message: "Internal Server Error", error });
//   }
// });

// module.exports = router;
