const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { createAdminToken, createRefreshAdminToken, tokenValidation, adminTokenValidation, userValidation } = require("../auth/auth.js");
const { hashCompare, hashPassword, createToken, createRefreshToken } = require("../auth/auth.js");
const { BuddysModel } = require("../schema/loginSchema.js");
const { generateUsername } = require("../services/loginFunctions.js");
const { categoryModel, coursesModel, libraryModel, videoModel, imageModel, lessonsModel, orderModel, siteSettingsModel, enrollmentModel } = require("../schema/tableSchema.js");


const fs = require('fs');
const multer = require("multer");
const path = require("path");

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Define allowed file types
const allowedFileTypes = /mp3|pdf|doc|docx|mp4|jpeg|jpg|png|webp|svg/;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    return cb(new Error("Only MP3, PDF, DOC, DOCX, MP4, JPEG, PNG, WebP, and SVG files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});


// 1. Register
router.post("/signup", async (req, res) => {
  try {
    const { firstName, email, mobNo, password, role } = req.body;

    // Check if either email or mobile number is provided
    if (!email || !mobNo) {
      return res.status(400).json({ message: "Email or mobile number is required" });
    }

    let existingUser = await BuddysModel.findOne({
      $or: [{ emailId: email }, { mobNo: mobNo }],
    });

    if (existingUser) return res.status(400).json({ message: "Email or mobNo is already registered" });

    // Generate User Name  :
    const genUserName = await generateUsername(firstName);

    // Create the buddy user
    const user = new BuddysModel({
      // fullName: req.body.fullName,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      emailId: email,
      mobNo: mobNo,
      // emailId: type === "email" ? email : "",
      // mobNo: type === "mobNo" ? mobNo : "",
      // countryCode: type === "mobNo" ? countryCode : "",
      // dob: req.body.dob,
      role: role ? role : "",
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
    const { email, mobNo, deviceType, fcm } = req.body;
    let user;
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
          if ("admin" == user.role) {
            token = await createAdminToken({
              id: user._id,
              // fullName: user.fullName,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.emailId,
              mobNo: user.mobNo,
              // dob: user.dob,
              role: "admin",
            });
            refreshToken = await createRefreshAdminToken({
              id: user._id,
              // fullName: user.fullName,
              firstName: user.firstName,
              lastName: user.lastName,
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
            // fullName: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.emailId,
            mobNo: user.mobNo,
            // dob: user.dob,
          });
          refreshToken = await createRefreshToken({
            id: user._id,
            // fullName: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName,
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

        if (fcm.length > 50 && fcm) {
          const fcm_Token = await userNotificationDevicesModel.findOne({
            'devices.device_type': deviceType,
            userId: user._id,
          });

          if (fcm_Token) {
            // Update the specific device's FCM token and last login
            await userNotificationDevicesModel.updateOne(
              { 'devices.device_type': deviceType, userId: user._id },
              {
                $set: {
                  "devices.$.last_login": new Date(),
                  "devices.$.fcm_token": fcm,
                }
              },
              { upsert: true }
            );
          } else {
            // Add a new device if it doesn't exist for this userId
            await userNotificationDevicesModel.updateOne(
              { userId: user._id },
              {
                $push: {
                  devices: {
                    device_type: deviceType,
                    fcm_token: fcm,
                    last_login: new Date(),
                  }
                }
              },
              { upsert: true }
            );
          }

        } else {
          var FCM = "Please enter Valid FCM Token.";
        }

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


//-------------------------------------------------------------------------------------------------
// subject
// 4. courses - List
router.post("/Category", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, searchKeyword, currentPage, pageSize } = req.body;
    req.body.userId = id;

    const skip = (currentPage - 1) * pageSize;

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {
        // Define search filter
        const filter = searchKeyword
          ? { name: { $regex: searchKeyword, $options: "i" } }
          : {}; // If no keyword, fetch all

        const existingCategory = await categoryModel.find(filter).skip(skip).limit(pageSize);
        if (!existingCategory) return res.status(400).send({ message: "No category found in table." });

        res.status(200).send({ message: "Category detail.", result: existingCategory });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

//subject 
// 1. courses - CRUD
router.post("/subject", upload.single("icons"), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, name, description, price, ID } = req.body;
    req.body.userId = id;

    const icons = req.file; // Change req.files to req.file

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "create") {
        const existingCategory = await categoryModel.findOne({ name: name });
        if (existingCategory) return res.status(400).send({ message: "category with this name already exists." });

        const result = new categoryModel({
          userId: id,
          name,
          description,
          icons,
          icons: icons ? icons.path : "", // Store path (or buffer)
          price,
        });

        await result.save();

        res.status(200).send({ message: "New Category is successfully created." });
      } else if (action == "read") {
        if (!ID) return res.status(400).send({ message: "ID is needed." });

        const existingCategory = await categoryModel.findOne({ _id: ID });
        if (!existingCategory) return res.status(400).send({ message: "category is not found in table." });

        res.status(200).send({ message: "Category detail.", result: existingCategory });
      } else if (action == "update") {
        if (!ID) return res.status(400).send({ message: "ID is needed." });

        const existingCategory = await categoryModel.findOne({ _id: ID });
        if (!existingCategory) return res.status(400).send({ message: "category is not found in table." });

        const query = {};

        if (name) query.name = name;
        if (description) query.description = description;
        if (icons) query.icons = icons;
        if (price) query.price = price;


        const result = await categoryModel.findOneAndUpdate(
          { _id: ID },
          query,
          { new: true }
        );

        res.status(200).send({ message: "Category detail updated successfully.", result });
      } else if (action == "delete") {
        if (!ID) return res.status(400).send({ message: "ID is needed." });

        const existingCategory = await categoryModel.findOne({ _id: ID });
        if (!existingCategory) return res.status(400).send({ message: "category is not found in table." });

        const result = await categoryModel.findOneAndUpdate(
          { _id: ID },
          { status: "Deactive" },
          { new: true }
        );

        res.status(200).send({ message: "Category detail deleted successfully.", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});
//-------------------------------------------------------------------------------------------------
// courses
//CRUD operations in single API
router.post("/courses", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, subjectId, courseName, description, coursePrice, courseTime, certificationOfCompletion, moreInformation, courseType, ID } = req.body;
    req.body.userId = id;

    if (subjectId && !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).send({ message: "Invalid subjectId." });
    }
    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "create") {

        const newCourse = new coursesModel({
          userId: id,
          subjectId,
          courseName,
          description,
          coursePrice,
          courseTime,
          certificationOfCompletion,
          moreInformation,
          courseType
        });

        await newCourse.save();

        res.status(201).json({ message: "Course Created", result: newCourse });
      } else if (action === "read") {
        if (!ID) return res.status(400).json({ error: "Course ID is required" });
        const readdocument = await coursesModel.findById(ID);

        if (!readdocument) return res.status(400).json({ error: "Course not found" });

        res.status(200).json({ message: "Course Details", result: readdocument });
      } else if (action === "update") {
        if (!ID) return res.status(400).json({ error: "ID required for update" });

        const updateFields = {};
        // Number, Name, Description, Icons, Status
        // subjectId, courseName, description, coursePrice, courseTime, certificationOfCompletion, moreInformation, courseType, status
        if (subjectId) updateFields.subjectId = subjectId;
        if (courseName) updateFields.courseName = courseName;
        if (description) updateFields.description = description;
        if (coursePrice) updateFields.coursePrice = coursePrice;
        if (courseTime) updateFields.courseTime = courseTime;
        if (certificationOfCompletion) updateFields.certificationOfCompletion = certificationOfCompletion;
        if (moreInformation) updateFields.moreInformation = moreInformation;
        if (courseType) updateFields.courseType = courseType;

        const updatedocument = await coursesModel.findOneAndUpdate(
          { _id: ID },
          updateFields,
          { new: true }
        );

        if (!updatedocument) return res.status(400).json({ error: "Course not found" });

        res.status(200).json({ message: "Course Updated ", result: updatedocument });
      } else if (action === "delete") {
        if (!ID) return res.status(400).json({ error: "ID required for deletion" });

        const deletedocument = await coursesModel.findByIdAndUpdate(
          ID,
          { status: "Inactive" },
          { new: "true" }
        );

        if (!deletedocument) return res.status(404).json({ error: "Course not found" });

        res.status(200).json({ message: "Course status set to be inactive ", deletedcourse: deletedocument });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


// give subjectId and get course List
router.post("/coursesList", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, ID } = req.body; // Extract action and status
    req.body.userId = id;

    if (!ID) return res.status(400).json({ message: "ID is required." });

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {
        const result = await coursesModel.find({ subjectid: ID });

        res.status(200).json({ message: "Data received", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

//---------------------------------------------------------------------------------------------------
// user Management
//StudentList CRUD operations 
router.post("/users", adminTokenValidation, upload.single("image"), async (req, res) => {
  try {
    const id = req.userId;
    const { action, firstName, lastName, email, mobNo, ID } = req.body;
    req.body.userId = id;

    const image = req.file; // Change req.files to req.file

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action === "create") {

        const newStudentList = new BuddysModel({
          firstName,
          lastName,
          emailId: email,
          mobNo,
          image: image ? image.path : "", // Store path (or buffer)
        });

        await newStudentList.save();

        return res.status(201).json({ message: "new student Created", result: newStudentList });
      } else if (action === "read") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const readdocument = await BuddysModel.findById(ID);
        if (!readdocument) return res.status(400).json({ error: "Student not found in table." });

        res.status(200).json({ message: "Students Details", result: readdocument });
      } else if (action === "update") {
        if (!ID) return res.status(400).json({ message: "ID required for update" });

        const updateFields = {};

        if (firstName) updateFields.firstName = ID;
        if (lastName) updateFields.lastName = lastName;
        if (email) updateFields.emailId = email;
        if (mobNo) updateFields.mobNo = mobNo;
        if (image) updateFields.image = image.path;


        const updatedocument = await BuddysModel.findOneAndUpdate(
          { _id: ID },
          updateFields,
          { new: true }
        );

        if (!updatedocument) return res.status(400).json({ error: "Student not found in the table." });

        res.status(200).json({ message: "Student Details Updated ", result: updatedocument });
      } else if (action === "delete") {
        if (!ID) return res.status(400).json({ message: "ID required for deletion" });

        const deletedocument = await BuddysModel.findOneAndUpdate(
          { _id: ID },
          { status: "Inactive" },
          { new: "true" }
        );

        if (!deletedocument) return res.status(404).json({ error: "Student not found in table." });

        res.status(200).json({ message: "Student status set to be inactive ", result: deletedocument });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

// user Management
// user List
// Get users list by status
router.post("/userslist", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action } = req.body;
    req.body.userId = id;

    const totalCount = {
      studentList: await BuddysModel.countDocuments({ status: "Active" }),
      deletedList: await BuddysModel.countDocuments({ status: "Inactive" }),
      pendingList: await BuddysModel.countDocuments({ status: "Pending" }),
    };

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "studentList") {
        const result = await BuddysModel.find({ status: "Active", role: { $ne: "admin" } }).lean();

        res.status(200).json({ message: "student List", totalCount, result: result });
      } else if (action == "deletedList") {
        const result = await BuddysModel.find({ status: "Inactive", role: { $ne: "admin" } }).lean();

        res.status(200).json({ message: "deleted List", totalCount, result: result });
      } else if (action == "pendingList") {
        const result = await BuddysModel.find({ status: "Pending", role: { $ne: "admin" } }).lean();

        res.status(200).json({ message: "pending List", totalCount, result: result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


//--------------------------------------------------------------------------------------------------

// Admin Dashboard
router.post("/adminDashboard", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action } = req.body;
    req.body.userId = id;


    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {
        const Count = {
          totalUsers: await BuddysModel.countDocuments({}),
          totalSubscribers: await orderModel.countDocuments({}),
          totalVideos: await videoModel.countDocuments({}),
          totalPhotos: await imageModel.countDocuments({}),
          totalDocuments: await libraryModel.countDocuments({}),
          totalRevenue: await orderModel.countDocuments({}),
        };

        res.status(200).send({ message: "Admin Dashboard.", result: Count });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


//-------------------------------------------------------------------------------------------------
//video management
//video CRUD
router.post("/adminVideo", upload.array("video", 5), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, categoryId, courseId, name, description, icons, ID } = req.body;
    req.body.userId = id;
    const videos = req.files.map(file => file.path); // Store paths instead of whole file objects


    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "create") {
        const result = new videoModel({
          userId: id,
          categoryId,
          courseId,
          video: videos, // Store file paths
          name,
          description,
          icons,
        });

        await result.save();

        res.status(200).send({ message: "video succefully uploaded.", result });
      } else if (action == "read") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const result = await videoModel.findById(ID);
        if (!result) return res.status(400).json({ error: "Video not found in table." });

        res.status(200).json({ message: "Video Details", result });
      } else if (action == "update") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const updateFields = {};

        if (categoryId) updateFields.categoryId = categoryId;
        if (courseId) updateFields.courseId = courseId;
        if (req.files && req.files.length > 0) updateFields.video = videos; // Update only if new files uploaded
        if (name) updateFields.name = name;
        if (description) updateFields.description = description;
        if (icons) updateFields.icons = icons;

        const result = await videoModel.findOneAndUpdate(
          { _id: ID },
          updateFields,
          { new: true }
        );

        if (!result) return res.status(400).json({ error: "Video not found in table." });

        res.status(200).json({ message: "Video Details", result });
      } else if (action == "delete") {
        if (!ID) return res.status(400).json({ message: "ID is required" });


        const result = await videoModel.findOneAndUpdate(
          { _id: ID },
          { status: "Inactive" },
          { new: true }
        );

        if (!result) return res.status(400).json({ error: "Video not found in table." });

        res.status(200).json({ message: "Video Details", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

//video management
//video list  ----change
router.post("/adminVideoList", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action } = req.body;
    req.body.userId = id;

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {
        const result = await categoryModel.aggregate([
          {
            $lookup: {
              from: "courses", // Ensure this matches your actual collection name
              localField: "_id",
              foreignField: "subjectId",
              as: "courseInfo"
            }
          },
          {
            $unwind: {
              path: "$courseInfo",
              preserveNullAndEmptyArrays: true // Keeps categories without courses
            }
          },
          {
            $project: {
              name: 1,
              description: 1,
              courseName: "$courseInfo.courseName" // Extract course name
            }
          }
        ]);


        res.status(200).send({ message: "category Name.", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


//gallery management
//image CRUD
router.post("/adminImage", upload.array("image", 5), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, categoryId, courseId, name, description, icons, ID } = req.body;
    req.body.userId = id;
    const images = req.files.map(file => file.path); // Store paths instead of whole file objects


    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "create") {
        const result = new imageModel({
          userId: id,
          categoryId,
          courseId,
          image: images,
          name,
          description,
          icons,
        });

        await result.save();

        res.status(200).send({ message: "image succefully uploaded.", result });
      } else if (action == "read") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const result = await imageModel.findById(ID);
        if (!result) return res.status(400).json({ error: "image not found in table." });

        res.status(200).json({ message: "image Details", result });
      } else if (action == "update") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const updateFields = {};

        if (categoryId) updateFields.categoryId = categoryId;
        if (courseId) updateFields.courseId = courseId;
        if (req.files && req.files.length > 0) updateFields.image = images; // Update only if new files uploaded
        if (name) updateFields.name = name;
        if (description) updateFields.description = description;
        if (icons) updateFields.icons = icons;

        const result = await imageModel.findOneAndUpdate(
          { _id: ID },
          updateFields,
          { new: true }
        );

        if (!result) return res.status(400).json({ error: "image not found in table." });

        res.status(200).json({ message: "image Details", result });
      } else if (action == "delete") {
        if (!ID) return res.status(400).json({ message: "ID is required" });


        const result = await imageModel.findOneAndUpdate(
          { _id: ID },
          { status: "Inactive" },
          { new: true }
        );

        if (!result) return res.status(400).json({ error: "image not found in table." });

        res.status(200).json({ message: "image Details", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

//gallery management
//Image list  ----change
router.post("/adminImageList", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action } = req.body;
    req.body.userId = id;

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {
        const result = await categoryModel.aggregate([
          {
            $lookup: {
              from: "courses", // Ensure this matches your actual collection name
              localField: "_id",
              foreignField: "subjectId",
              as: "courseInfo"
            }
          },
          {
            $unwind: {
              path: "$courseInfo",
              preserveNullAndEmptyArrays: true // Keeps categories without courses
            }
          },
          {
            $project: {
              name: 1,
              description: 1,
              courseName: "$courseInfo.courseName" // Extract course name
            }
          }
        ]);


        res.status(200).send({ message: "category Name.", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

//libaray management
//library 
router.post("/library", upload.array("library", 5), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, subjectId, courseId, ID } = req.body;
    req.body.userId = id;

    const libraries = req.files.map(file => file.path); // Store paths instead of whole file objects

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "create") {
        const result = new libraryModel({
          userId: id,
          categoryId: subjectId,
          courseId,
          library: libraries,
          name,
          description,
          icons,
        });

        await result.save();

        res.status(200).send({ message: "library succefully uploaded.", result });
      } else if (action == "read") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const result = await libraryModel.findById(ID);
        if (!result) return res.status(400).json({ error: "library not found in table." });

        res.status(200).json({ message: "library Details", result });
      } else if (action == "update") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const updateFields = {};

        if (categoryId) updateFields.categoryId = categoryId;
        if (courseId) updateFields.courseId = courseId;
        if (req.files && req.files.length > 0) updateFields.library = libraries; // Update only if new files uploaded
        if (name) updateFields.name = name;
        if (description) updateFields.description = description;
        if (icons) updateFields.icons = icons;

        const result = await libraryModel.findOneAndUpdate(
          { _id: ID },
          updateFields,
          { new: true }
        );

        if (!result) return res.status(400).json({ error: "library not found in table." });

        res.status(200).json({ message: "library Details", result });
      } else if (action == "delete") {
        if (!ID) return res.status(400).json({ message: "ID is required" });


        const result = await libraryModel.findOneAndUpdate(
          { _id: ID },
          { status: "Inactive" },
          { new: true }
        );

        if (!result) return res.status(400).json({ error: "library not found in table." });

        res.status(200).json({ message: "library Details", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});




//------------------------------------------------------------------------------------------------
//user 

router.post("/subjectList", async (req, res) => {
  try {
    const id = req.userId;
    const { action, searchKeyword, currentPage, pageSize } = req.body;
    req.body.userId = id;

    const skip = (currentPage - 1) * pageSize;

    if (action == "readAll") {
      // Define search filter
      const filter = searchKeyword
        ? { name: { $regex: searchKeyword, $options: "i" } }
        : {}; // If no keyword, fetch all

      const existingCategory = await categoryModel.find(filter).skip(skip).limit(pageSize);
      if (!existingCategory) return res.status(400).send({ message: "No category found in table." });

      res.status(200).send({ message: "Subject's List.", result: existingCategory });
    } else res.status(400).send({ message: "Action Does Not Exist." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

router.post("/listCourses", async (req, res) => {
  try {
    const id = req.userId;
    const { action, searchKeyword, currentPage, pageSize, ID } = req.body; // Extract action and status
    req.body.userId = id;

    const skip = (currentPage - 1) * pageSize;


    if (!ID) return res.status(400).json({ message: "ID is required." });

    if (action == "readAll") {

      const filter = searchKeyword
        ? { courseName: { $regex: searchKeyword, $options: "i" } }
        : {};

      const existingCategory = await categoryModel.findOne({ _id: ID });
      if (!existingCategory) return res.status(400).send({ message: "No category found in table." });

      const result = await coursesModel.find({ subjectId: ID, ...filter }).skip(skip).limit(pageSize);;

      if (!result) return res.status(400).send({ message: "no course found for the subject." });

      res.status(200).json({ message: "Course Details List.", result });
    } else res.status(400).send({ message: "Action Does Not Exist." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

// //course - R
// router.post("/courseRead", async (req, res) => {
//   try {
//     const id = req.userId;
//     const { action, ID } = req.body; // Extract action and status
//     req.body.userId = id;

//     if(action == "read") {
//       const result = await coursesModel.find({ _id: ID });

//       if(!result) return  res.status(400).send({ message: "no course found for the subject." });

//       res.status(200).json({ message: "Course Details.", result });
//     } else res.status(400).send({ message: "Action Does Not Exist." });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// })

//course - R
router.post("/courseRead", userValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, ID } = req.body; // Extract action and status
    req.body.userId = id;
    const user = await BuddysModel.findOne({ _id: id });
    if (user) {

      if (action == "read") {
        const result = await coursesModel.find({ _id: ID });

        const checkCourse = await enrollmentModel.findOne({ course_id: result._id });
        if (checkCourse) {
          const video = await videoModel.find({ courseId: result._id });
          const image = await imageModel.find({ courseId: result._id });

          return res.status(200).json({ message: "Course Details.", result, video, image });
        }

        if (!result) return res.status(400).send({ message: "no course found for the subject." });

        res.status(200).json({ message: "Course Details.", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });

  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


router.post("/cart", tokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, courseId, ID } = req.body; // Extract action and status
    req.body.userId = id;

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action === "create") {
        const cardList = await cartModel.findOne({ userId: id });
        if (cardList) {
          const result = await cartModel.findOneAndUpdate(
            { userId: id },
            { $addToSet: { courseId } }, 
            { new: true }
          );

          return res.status(201).json({ message: "cart updated", result });
        }

        const result = new cartModel({
          userId: id,
          courseId,
        });

        await result.save();

        res.status(201).json({ message: "cart Created", result });
      } else if (action === "read") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        // const readdocument = await cartModel.findById(ID);
        const readdocument = await cartModel.findOne({ _id: ID });

        if (!readdocument) return res.status(400).json({ error: "cart not found in table." });

        const result = await coursesModel.find({ _id: { $in: readdocument.courseId } });

        const readdata = readdocument.toObject();
        readdata.courseDetails = result;

        // const cartWithCourses = { ...readdocument.toObject(), courseDetails: result };

        res.status(200).json({ message: "cart Details", result: readdata });
      } else if (action === "update") {
        if (!ID) return res.status(400).json({ message: "ID required for update" });

        const updateFields = {};

        if (courseId) updateFields.courseId = courseId;

        const updatedocument = await cartModel.findOneAndUpdate(
          { _id: ID },
          updateFields,
          { new: true }
        );

        if (!updatedocument) return res.status(400).json({ error: "Student not found in the table." });

        res.status(200).json({ message: "Student Details Updated ", result: updatedocument });
      } else if (action === "delete") {
        if (!ID) return res.status(400).json({ message: "ID required for deletion" });

        const deletedocument = await cartModel.findOneAndUpdate(
          { _id: ID },
          { $pull: { courseId: { $in: Array.isArray(courseId) ? courseId : [courseId] } } },  // Removes specific courseId from array
          { new: true }
        );

        if (!deletedocument) return res.status(404).json({ error: "cart not found in table." });

        res.status(200).json({ message: "cart deleted ", result: deletedocument });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
})


//status
router.post("/status", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, ID, status } = req.body;
    req.body.userId = id;

    const validStatuses = ["Active", "Inactive", "Pending"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Allowed values: Active, Inactive, Pending." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (action === "user") {
      if (!ID) return res.status(400).json({ message: "ID is required " });

      const updateduser = await BuddysModel.findOneAndUpdate(
        { _id: ID },
        { status },
        { new: true }
      );
      res.status(200).json({ message: "Status Updated ", result: updateduser });
    } else if (action === "course") {
      if (!ID) return res.status(400).json({ message: "ID is required " });

      const updatedcourse = await coursesModel.findOneAndUpdate(
        { _id: ID },
        { status },
        { new: true }
      );
      res.status(200).json({ message: "Status Updated ", result: updatedcourse });
    } else if (action === "subject") {
      if (!ID) return res.status(400).json({ message: "ID is required " });

      const updateduser = await categoryModel.findOneAndUpdate(
        { _id: ID },
        { status },
        { new: true }
      );
      res.status(200).json({ message: "Status Updated ", result: updateduser });
    } else res.status(400).send({ message: "Action Does Not Exist." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

//-----------------------------------------------------------------------------------------------

//profile
router.post("/profile", tokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, type, firstName, lastName, emailId, mobNo, city, country } = req.body; // Extract action and status
    req.body.userId = id;

    // if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
    //   return res.status(400).send({ message: "Invalid ID." });
    // }

    const existingUser = await BuddysModel.findOne({ _id: id });
    if (existingUser) {
      if (action == "myprofile") {
        if (existingUser) return res.status(200).send({ message: "profile Details,", result: existingUser });

        const result = await BuddysModel.findOneAndUpdate(
          { _id: existingUser._id },
          {
            firstName,
            lastName,
            emailId,
            mobNo,
            city,
            country
          },
          { new: true }
        );

        if (!result) return res.status(400).send({ message: "no profile found in the table." });

        res.status(200).send({ message: "profile Details Updated.", result });
      } else if (action == "myCourse") {

        const result = {
          enrolledCourse: await lessonsModel.countDocuments({ status: "Active" }),
          inProgressCourse: await lessonsModel.countDocuments({ status: "InProgress" }),
          completedCourse: await lessonsModel.countDocuments({ status: "Completed" }),
          failedCourse: await lessonsModel.countDocuments({ status: "deleted" }),
        };

        res.status(200).send({ message: "myCourse Details.", result });
      } else if (action == "library") {
        if (type == "library") {
          const result = await libraryModel.find({ userId: existingUser._id });

          res.status(200).send({ message: "My library Details.", result });
        } else if (type == "video") {
          const result = await videoModel.find({ userId: existingUser._id });

          if (!result) return res.status(400).send({ message: "no video found in the table." });

          res.status(200).send({ message: "My video Details.", result });
        } else if (type == "image") {
          const result = await imageModel.find({ userId: existingUser._id });

          if (!result) return res.status(400).send({ message: "no image found in the table." });

          res.status(200).send({ message: "My image Details.", result });
        } else res.status(400).send({ message: "Type Does Not Exist." });
      } else if (action == "mySubscription") {
        if (type == "allCourses") {
          const result = await coursesModel.find({});

          if (!result) return res.status(400).send({ message: "no course found in the table." });

          res.status(200).send({ message: "Courses Details.", result });
        } else if (type == "myList") {
          const result = await coursesModel.find({ userId: existingUser._id });

          if (!result) return res.status(400).send({ message: "no course found in the table." });

          res.status(200).send({ message: "My Courses Details.", result });
        } else res.status(400).send({ message: "Type Does Not Exist." });
      } else if (action == "notification") {

      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


//admin
//siteSettings
router.post("/siteSettings", upload.fields([
  { name: "faviconLogo", maxCount: 1 },
  { name: "companyLogo", maxCount: 1 },
  { name: "waterMarkLogo", maxCount: 1 },
]), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, companyName, emailId, contact1, contact2, address, mobileAuth, googleAuth, emailAuth, ID } = req.body;
    req.body.userId = id;

    const existingUser = await BuddysModel.findOne({ _id: id });
    if (existingUser) {
      if (action == "create") {
        const result = new siteSettingsModel({
          companyName,
          emailId,
          contact1,
          contact2,
          address,
          faviconLogo: req.files["faviconLogo"] ? req.files["faviconLogo"][0].path : "",
          companyLogo: req.files["companyLogo"] ? req.files["companyLogo"][0].path : "",
          waterMarkLogo: req.files["waterMarkLogo"] ? req.files["waterMarkLogo"][0].path : "",
          mobileAuth,
          googleAuth,
          emailAuth,
        });

        await result.save();

        res.status(201).send({ message: "Site settings created successfully", result });
      } else if (action == "read") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const result = await siteSettingsModel.findOne({ _id: ID, status: "Active" });

        if (!result) return res.status(400).json({ error: "site Settings not found in table." });

        res.status(201).send({ message: "Site settings Details", result });
      } else if (action == "update") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const existingSettings = await siteSettingsModel.findOne({ _id: ID });
        if (!existingSettings) return res.status(400).json({ message: "Site settings not found." });

        let updatedData = {};
        if (companyName) updatedData.companyName = companyName;

        if (emailId) updatedData.emailId = emailId;
        if (contact1) updatedData.contact1 = contact1;
        if (contact2) updatedData.contact2 = contact2;
        if (address) updatedData.address = address;
        if (faviconLogo) updatedData.faviconLogo = req.files["faviconLogo"] ? req.files["faviconLogo"][0].path : "";
        if (companyLogo) updatedData.companyLogo = req.files["companyLogo"] ? req.files["companyLogo"][0].path : "";
        if (waterMarkLogo) updatedData.waterMarkLogo = req.files["waterMarkLogo"] ? req.files["waterMarkLogo"][0].path : "";

        // Corrected boolean checks
        if (mobileAuth !== undefined) updatedData.mobileAuth = mobileAuth;
        if (googleAuth !== undefined) updatedData.googleAuth = googleAuth;
        if (emailAuth !== undefined) updatedData.emailAuth = emailAuth;


        const result = await siteSettingsModel.findOneAndUpdate(
          { _id: ID },
          updatedData,
          { new: true }
        );

        if (!result) return res.status(400).json({ error: "cart not found in table." });

        res.status(201).send({ message: "Site settings Updated", result });
      } else if (action == "delete") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const result = await siteSettingsModel.findOneAndUpdate(
          { _id: ID },
          { status: "Inactive" },
          { new: true }
        );

        if (!result) return res.status(400).json({ error: "site Settings not found in table." });

        res.status(201).send({ message: "site Settings Deleted", result });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


// admin
// notification
router.post("/notification", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, title, body } = req.body;
    req.body.userId = id;

    const existingUser = await BuddysModel.findOne({ _id: id });
    if (existingUser) {
      if (action === "flash") {
        const result = await model.findOne({ userId: id }).select("devices.fcm_token");

        await sendPushNotification(result, title, body);

        res.status(200).json({ message: "Flash message Sent", result });
      } else res.status(400).json({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

router.post("/courseEntrollment" , tokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, courseId } = req.body; // Extract action and status
    req.body.userId = id; 
    
    if (!action || !courseId)return res.status(400).json({ message: "All  fields are required " });
  

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "create") {
        const newOrder = new orderModel({
          userId: id,
          course_id : courseId,
        });

        
        const enrollment = new enrollmentModel({
          userId: id,
          course_id : courseId,
        });

        await newOrder.save();
        
        const result = await coursesModel.findOne({ _id: courseId });

        const readdata = newOrder.toObject();
        readdata.courseDetails = result;

        await enrollment.save();
        const results = await coursesModel.findOne({ _id: courseId });

        const readdatas = enrollment.toObject();
        readdatas.courseDetails = results;

        res.status(201).json({ message: "Order  & Entrollment Created" , Order: readdata, Enrollment : readdatas });
      }
    }else res.status(400).send({ message: "Action Does Not Exist." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
})

module.exports = router;