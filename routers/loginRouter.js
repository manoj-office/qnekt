const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { createAdminToken, createRefreshAdminToken, tokenValidation, adminTokenValidation, userValidation } = require("../auth/auth.js");
const { hashCompare, hashPassword, createToken, createRefreshToken } = require("../auth/auth.js");
const { BuddysModel } = require("../schema/loginSchema.js");
const { generateUsername } = require("../services/loginFunctions.js");
const { categoryModel, coursesModel, libraryModel, videoModel, imageModel, lessonsModel, orderModel, siteSettingsModel, enrollmentModel, dashBoardsModel } = require("../schema/tableSchema.js");


const fs = require('fs');
const multer = require("multer");
const path = require("path");

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Allowed file extensions
const allowedFileExtensions = /mp3|pdf|doc|docx|mp4|jpeg|jpg|png|webp|svg/;

// Allowed MIME types
const allowedMimeTypes = [
  'audio/mpeg',      // .mp3
  'application/pdf', // .pdf
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'video/mp4',       // .mp4
  'image/jpeg',      // .jpeg, .jpg
  'image/png',       // .png
  'image/webp',      // .webp
  'image/svg+xml'    // .svg
];

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
  const extname = allowedFileExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    return cb(new Error("File type not allowed"), false);
  }
};

// Final multer upload setup
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
        $and: [{ emailId: email, status: "Active" },],
      })
        .sort({ createdAt: -1 })
        .limit(1);

      loginType = "email";

    } else if (mobNo !== "") {
      user = await BuddysModel.findOne({
        $and: [{ mobNo: mobNo, status: "Active" }],
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
    const { action, name, description, price, isFeature, ID } = req.body;
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
          isFeature,
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

        let query = {};

        if (name) query.name = name;
        if (description) query.description = description;
        if (icons) query.icons = icons;
        if (price) query.price = price;
        if (isFeature) query.isFeature = isFeature;

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
          { status: "Inactive " },
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
router.post("/courses", upload.single("image"), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, subjectId, courseName, description, whatYouWillEarn, features, targetAudience, requirements, instructor, level, lessons, languages, coursePrice, courseTime, certificationOfCompletion, moreInformation, courseType, ID } = req.body;
    req.body.userId = id;

    const image = req.file; // Change req.files to req.file

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
          whatYouWillEarn,
          features,
          targetAudience,
          requirements,
          instructor,
          level,
          lessons,
          languages,
          coursePrice,
          courseTime,
          certificationOfCompletion,
          moreInformation,
          image: image ? image.path : "", // Store path (or buffer)
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

        let updateFields = {};
        // Number, Name, Description, Icons, Status
        // subjectId, courseName, description, coursePrice, courseTime, certificationOfCompletion, moreInformation, courseType, status
        if (subjectId) updateFields.subjectId = subjectId;
        if (courseName) updateFields.courseName = courseName;
        if (description) updateFields.description = description;

        if (whatYouWillEarn) updateFields.whatYouWillEarn = whatYouWillEarn;
        if (features) updateFields.features = features;
        if (targetAudience) updateFields.targetAudience = targetAudience;
        if (requirements) updateFields.requirements = requirements;
        if (instructor) updateFields.instructor = instructor;
        if (level) updateFields.level = level;
        if (lessons) updateFields.lessons = lessons;
        if (languages) updateFields.languages = languages;

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
    // const { action, ID } = req.body; // Extract action and status
    const { action, searchKeyword, currentPage, pageSize, ID } = req.body; // Extract action and status

    req.body.userId = id;

    const skip = (currentPage - 1) * pageSize;

    if (!ID) return res.status(400).json({ message: "ID is required." });

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {

        const filter = searchKeyword
          ? { courseName: { $regex: searchKeyword, $options: "i" } }
          : {};

        const existingCategory = await categoryModel.findOne({ _id: ID });
        if (!existingCategory) return res.status(400).send({ message: "No subject (category) found in table." });

        const results = await coursesModel.find({ subjectId: ID, ...filter }).skip(skip).limit(pageSize);

        const result = await Promise.all(results.map(async (course) => {

          let instructor = null;

          if (mongoose.Types.ObjectId.isValid(course.instructor)) {
            instructor = await BuddysModel
              .findOne({ _id: course.instructor })
              .select("firstName lastName image");
          }

          return {
            ...course._doc,
            subjectName: existingCategory.name || "",
            instructorDetails: instructor || null
          };
        })
        );

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

        let updateFields = {};

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
    const { action, searchKeyword, currentPage, pageSize } = req.body;
    req.body.userId = id;

    const skip = (currentPage - 1) * pageSize;

    const totalCount = {
      studentList: await BuddysModel.countDocuments({ status: "Active" }),
      deletedList: await BuddysModel.countDocuments({ status: "Inactive" }),
      pendingList: await BuddysModel.countDocuments({ status: "Pending" }),
    };

    const filter = searchKeyword
      ? { userName: { $regex: searchKeyword, $options: "i" } }
      : {};

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "studentList") {
        const result = await BuddysModel.find({ status: "Active", role: { $ne: "admin" }, ...filter }).lean().skip(skip).limit(pageSize);

        res.status(200).json({ message: "student List", totalCount, result: result });
      } else if (action == "deletedList") {
        const result = await BuddysModel.find({ status: "Inactive", role: { $ne: "admin" }, ...filter }).lean().skip(skip).limit(pageSize);

        res.status(200).json({ message: "deleted List", totalCount, result: result });
      } else if (action == "pendingList") {
        const result = await BuddysModel.find({ status: "Pending", role: { $ne: "admin" }, ...filter }).lean().skip(skip).limit(pageSize);

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
          totalUsers: await BuddysModel.countDocuments({ role: "" }),
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
router.post("/adminVideo", upload.array("video", 10), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, categoryId, courseId, name, description, icons, ID } = req.body;
    req.body.userId = id;

    const videos = req.files?.map(file => file.path) || []; // Store paths instead of whole file objects

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

        let updateFields = {};

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
    const { action, searchKeyword, currentPage, pageSize } = req.body;
    req.body.userId = id;

    const skip = (currentPage - 1) * pageSize;

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {
        // Step 1: Get all video records
        const videos = await videoModel.find({}).select("courseId video status");
        if (!videos || videos.length === 0) return res.status(404).send({ message: "No videos found." });

        // Step 2: Extract and validate unique courseIds from videos
        const courseIdSet = new Set(videos.map(video => video.courseId)
          .filter(courseId => courseId && mongoose.Types.ObjectId.isValid(courseId))
        );

        const uniqueCourseIds = Array.from(courseIdSet);
        if (uniqueCourseIds.length === 0) return res.status(404).send({ message: "No valid course IDs found in videos." });

        // Step 3: Fetch course details with pagination
        const courseDetails = await coursesModel.find({ _id: { $in: uniqueCourseIds } }).skip(skip).limit(pageSize).lean();
        if (!courseDetails || courseDetails.length === 0) return res.status(404).send({ message: "No course details found." });

        // Step 4: Group videos by courseId
        const videosGroupedByCourse = {};
        for (const video of videos) {
          const courseId = String(video.courseId);
          if (!videosGroupedByCourse[courseId]) videosGroupedByCourse[courseId] = [];
          videosGroupedByCourse[courseId].push(video);
        }

        // Step 5: Fetch subject names from categoryModel
        const subjectIds = courseDetails.map(course => course.subjectId).filter(Boolean);
        const subjects = await categoryModel.find({ _id: { $in: subjectIds } }).lean();

        const subjectMap = {};
        for (const subject of subjects) {
          subjectMap[String(subject._id)] = subject.name;
        }

        // Step 6: Combine all data
        const coursesWithVideos = courseDetails.map(course => {
          const courseId = String(course._id);
          const subjectId = String(course.subjectId);
          const videoDocs = videosGroupedByCourse[courseId] || [];

          // Add video URL + type + filename + size
          const videoUrls = videoDocs.flatMap(video =>
            (video.video || []).map(videoPath => {
              const ext = videoPath.split('.').pop().split('?')[0].toLowerCase();

              return {
                _id: video._id,
                status: video.status || "",
                url: videoPath,
                type: ext,
                filename: video.filename || videoPath.split('/').pop(), // fallback to last part of URL
                size: video.size || null // size in bytes or a human-readable format if available
              };
            })
          );

          return {
            ...course,
            subject: subjectMap[subjectId] || null,
            videos: videoUrls
          };
        });

        // Step 7: Send response
        res.status(200).send({ message: "Courses and their videos fetched successfully.", result: coursesWithVideos });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


//gallery management
//image CRUD
router.post("/adminImage", upload.array("image", 10), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, categoryId, courseId, name, description, icons, ID } = req.body;
    req.body.userId = id;

    const images = req.files?.map(file => file.path) || []; // Store paths instead of whole file objects


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

        let updateFields = {};

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
    const { action, searchKeyword, currentPage, pageSize } = req.body;
    req.body.userId = id;

    const skip = (currentPage - 1) * pageSize;

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {
        // Step 1: Get all image records
        const images = await imageModel.find({}).select("courseId image status");
        if (!images || images.length === 0) return res.status(404).send({ message: "No images found." });

        // Step 2: Extract and validate unique courseIds from images
        const courseIdSet = new Set(images.map(img => img.courseId)
          .filter(courseId => courseId && mongoose.Types.ObjectId.isValid(courseId))
        );

        const uniqueCourseIds = Array.from(courseIdSet);
        if (uniqueCourseIds.length === 0) return res.status(404).send({ message: "No valid course IDs found in images." });

        // Step 3: Fetch course details with pagination
        const courseDetails = await coursesModel.find({ _id: { $in: uniqueCourseIds } }).skip(skip).limit(pageSize).lean();
        if (!courseDetails || courseDetails.length === 0) return res.status(404).send({ message: "No course details found." });

        // Step 4: Group images by courseId
        const imagesGroupedByCourse = {};
        for (const img of images) {
          const courseId = String(img.courseId);
          if (!imagesGroupedByCourse[courseId]) imagesGroupedByCourse[courseId] = [];
          imagesGroupedByCourse[courseId].push(img);
        }

        // Step 5: Fetch subject names from categoryModel
        const subjectIds = courseDetails.map(course => course.subjectId).filter(Boolean);
        const subjects = await categoryModel.find({ _id: { $in: subjectIds } }).lean();

        const subjectMap = {};
        for (const subject of subjects) {
          subjectMap[String(subject._id)] = subject.name;
        }

        // Step 6: Combine all data
        const coursesWithImages = courseDetails.map(course => {
          const courseId = String(course._id);
          const subjectId = String(course.subjectId);
          const imageDocs = imagesGroupedByCourse[courseId] || [];

          // Add image URL + type + filename + size
          const imageUrls = imageDocs.flatMap(img =>
            (img.image || []).map(imagePath => {
              const ext = imagePath.split('.').pop().split('?')[0].toLowerCase();

              return {
                _id: img._id,
                status: img.status || "",
                url: imagePath,
                type: ext,
                filename: img.filename || imagePath.split('/').pop(), // fallback to last part of URL
                size: img.size || null // size in bytes or a human-readable format if available
              };
            })
          );

          return {
            ...course,
            subject: subjectMap[subjectId] || null,
            images: imageUrls
          };
        });

        // Step 7: Send response
        res.status(200).send({ message: "Courses and their images fetched successfully.", result: coursesWithImages });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

//libaray management
//library 
router.post("/library", upload.array("library", 10), adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, categoryId, courseId, name, description, icons, ID } = req.body;
    req.body.userId = id;

    const libraries = req.files?.map(file => file.path) || []; // Store paths instead of whole file objects

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "create") {
        const result = new libraryModel({
          userId: id,
          categoryId,
          courseId,
          library: libraries,
          name,
          description,
          icons,
        });

        await result.save();

        res.status(200).send({ message: "library successfully created.", result });
      } else if (action == "read") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        const result = await libraryModel.findById(ID);
        if (!result) return res.status(400).json({ error: "library not found in table." });

        res.status(200).json({ message: "library Details", result });
      } else if (action == "update") {
        if (!ID) return res.status(400).json({ message: "ID is required" });

        let updateFields = {};

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


//library list admin
router.post("/adminLibraryList", adminTokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, searchKeyword, currentPage, pageSize } = req.body;
    req.body.userId = id;

    const skip = (currentPage - 1) * pageSize;

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action == "readAll") {
        // Step 1: Get all library records
        const libraries = await libraryModel.find({}).select("courseId library status");
        if (!libraries || libraries.length === 0) return res.status(404).send({ message: "No libraries found." });

        // Step 2: Extract and validate unique courseIds from libraries
        const courseIdSet = new Set(libraries.map(lib => lib.courseId)
          .filter(courseId => courseId && mongoose.Types.ObjectId.isValid(courseId))
        );

        const uniqueCourseIds = Array.from(courseIdSet);
        if (uniqueCourseIds.length === 0) return res.status(404).send({ message: "No valid course IDs found in libraries." });

        // Step 3: Fetch course details with pagination
        const courseDetails = await coursesModel.find({ _id: { $in: uniqueCourseIds } }).skip(skip).limit(pageSize).lean();
        if (!courseDetails || courseDetails.length === 0) return res.status(404).send({ message: "No course details found." });

        // Step 4: Group libraries by courseId
        const librariesGroupedByCourse = {};
        for (const lib of libraries) {
          const courseId = String(lib.courseId);
          if (!librariesGroupedByCourse[courseId]) librariesGroupedByCourse[courseId] = [];
          librariesGroupedByCourse[courseId].push(lib);
        }

        // Step 5: Fetch subject names from categoryModel
        const subjectIds = courseDetails.map(course => course.subjectId).filter(Boolean);
        const subjects = await categoryModel.find({ _id: { $in: subjectIds } }).lean();

        const subjectMap = {};
        for (const subject of subjects) {
          subjectMap[String(subject._id)] = subject.name;
        }

        // Step 6: Combine all data
        const coursesWithLibraries = courseDetails.map(course => {
          const courseId = String(course._id);
          const subjectId = String(course.subjectId);
          const libraryDocs = librariesGroupedByCourse[courseId] || [];

          // Add library URL + type + filename + size
          const libraryUrls = libraryDocs.flatMap(lib =>
            (lib.library || []).map(libraryPath => {
              const ext = libraryPath.split('.').pop().split('?')[0].toLowerCase();

              return {
                _id: lib._id,
                status: lib.status || "",
                url: libraryPath,
                type: ext,
                filename: lib.filename || libraryPath.split('/').pop(), // fallback to last part of URL
                size: lib.size || null // size in bytes or a human-readable format if available
              };
            })
          );

          return {
            ...course,
            subject: subjectMap[subjectId] || null,
            libraries: libraryUrls
          };
        });

        // Step 7: Send response
        res.status(200).send({ message: "Courses and their libraries fetched successfully.", result: coursesWithLibraries });
      } else res.status(400).send({ message: "Action does not exist." });
    } else res.status(400).send({ message: "User does not exist." });
  } catch (error) {
    console.error("Error in /adminLibraryList:", error);
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

      const existingCategory = await categoryModel.find({ status: "Active", ...filter }).skip(skip).limit(pageSize);
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

      const existingCategory = await categoryModel.findOne({ _id: ID, status: "Active" });
      if (!existingCategory) return res.status(400).send({ message: "No category found in table." });

      const result = await coursesModel.find({ subjectId: ID, status: "Active", ...filter }).skip(skip).limit(pageSize);

      if (!result || result.length === 0) {
        return res.status(400).send({ message: "No course found for this subject." });
      }
      // Add subjectName from category to each course
      const enrichedResult = result.map(course => ({
        ...course.toObject(),
        subjectName: existingCategory.name
      }));

      res.status(200).json({ message: "Course Details List.", result: enrichedResult });
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

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    // const user = await BuddysModel.findOne({ _id: id });
    // if (user) {
    if (action == "read") {
      if (!ID) return res.status(400).json({ message: "ID is required" });

      const result = await coursesModel.findOne({ _id: ID, status: "Active", });
      if (!result) return res.status(400).send({ message: "No course found." });

      // Get the subject data
      const subject = await categoryModel.findOne({ _id: result.subjectId, status: "Active", });

      // Merge subject name into result
      const courseWithSubject = {
        ...result._doc,
        subjectName: subject ? subject.name : "",
      };

      const checkCourse = await enrollmentModel.findOne({ courseId: result._id, userId: id });
      if (checkCourse) {
        const video = await videoModel.find({ courseId: result._id, status: "Active" }).select("video");
        const image = await imageModel.find({ courseId: result._id, status: "Active" }).select("image");

        const flattenedImage = [...new Set(image.flatMap(item => item.image))];
        const flattenedVideo = [...new Set(video.flatMap(item => item.video))];

        const courseWith = {
          ...result._doc,
          subjectName: subject ? subject.name : "",
          videosList: flattenedImage ? flattenedImage : [],
          imagesList: flattenedVideo ? flattenedVideo : []
        };

        return res.status(200).json({ message: "Course Details.", result: courseWith });
      }

      return res.status(200).json({ message: "Course Details.", result: courseWithSubject });
    } else res.status(400).send({ message: "Action Does Not Exist." });
    // } else res.status(400).send({ message: "User Does Not Exists." });
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

    const user = await BuddysModel.findOne({ _id: id, status: "Active", });
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

        let updateFields = {};

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
router.post("/profile", upload.single("image"), tokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, type, firstName, lastName, emailId, mobNo, city, country, password, searchKeyword, currentPage, pageSize } = req.body; // Extract action and status
    req.body.userId = id;


    const skip = (currentPage - 1) * pageSize;

    const image = req.file; // Change req.files to req.file

    // if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
    //   return res.status(400).send({ message: "Invalid ID." });
    // }

    const existingUser = await BuddysModel.findOne({ _id: id, status: "Active", });
    if (existingUser) {
      if (action == "myprofile") {
        if (type == "read") {

          res.status(200).send({ message: "profile Details,", result: existingUser });
        } else if (type == "update") {

          const result = await BuddysModel.findOneAndUpdate(
            { _id: existingUser._id, status: "Active", },
            {
              firstName,
              lastName,
              emailId,
              mobNo,
              image: image ? image.path : "", // Store path (or buffer)
              city,
              password: await hashPassword(password),
              country
            },
            { new: true }
          );

          if (!result) return res.status(400).send({ message: "no profile found in the table." });

          res.status(200).send({ message: "profile Details Updated.", result });
        } else res.status(400).send({ message: "Type Does Not Exist." });
      } else if (action == "myCourse") {

        const count = {
          enrolledCourse: await enrollmentModel.countDocuments({ status: "Active", userId: id }),
          inProgressCourse: await lessonsModel.countDocuments({ status: "InProgress", userId: id }),
          completedCourse: await lessonsModel.countDocuments({ status: "Completed", userId: id }),
          failedCourse: await lessonsModel.countDocuments({ status: "deleted", userId: id }),
        };

        if (type == "enrollment") {
          const result = await enrollmentModel.find({ userId: id, status: "Active" });

          if (!result || result.length === 0) {
            return res.status(400).send({ message: "No enrolled courses" });
          }

          // Extract courseIds and remove duplicates
          const courseIds = [...new Set(result.map(enrollment => enrollment.courseId.toString()))];

          // Get course details
          const courseDetails = await coursesModel.find({ _id: { $in: courseIds } });

          return res.status(200).send({ message: "my enrolled course Details", result: { ...count, courseDetails } });
        } else if (type == "inProgress") {
          const result = await lessonsModel.find({ userId: id, status: "InProgress" });

          if (!result || result.length === 0) {
            return res.status(400).send({ message: "No InProgress courses" });
          }

          // Extract courseIds and remove duplicates
          const courseIds = [...new Set(result.map(enrollment => enrollment.courseId.toString()))];

          // Get course details
          const courseDetails = await coursesModel.find({ _id: { $in: courseIds } });

          return res.status(200).send({ message: "my inProgress course Details", result: { ...count, courseDetails } });
        } else if (type == "completed") {
          const result = await lessonsModel.find({ userId: id, status: "Completed" });

          if (!result || result.length === 0) {
            return res.status(400).send({ message: "No completed courses" });
          }

          // Extract courseIds and remove duplicates
          const courseIds = [...new Set(result.map(enrollment => enrollment.courseId.toString()))];

          // Get course details
          const courseDetails = await coursesModel.find({ _id: { $in: courseIds } });

          return res.status(200).send({ message: "my completed course Details", result: { ...count, courseDetails } });
        } else if (type == "failed") {
          const result = await enrollmentModel.find({ userId: id, status: "deleted" });

          if (!result || result.length === 0) {
            return res.status(400).send({ message: "No failed courses" });
          }

          // Extract courseIds and remove duplicates
          const courseIds = [...new Set(result.map(enrollment => enrollment.courseId.toString()))];

          // Get course details
          const courseDetails = await coursesModel.find({ _id: { $in: courseIds } });

          return res.status(200).send({ message: "my failed course Details", result: { ...count, courseDetails } });
        }

        res.status(200).send({ message: "myCourse Details.", result: count });
      } else if (action == "library") {
        if (type == "library") {
          // Step 1: Get enrollments for the user
          const enrollments = await enrollmentModel.find({ userId: existingUser._id });
          if (!enrollments || enrollments.length === 0)
            return res.status(400).send({ message: "User is not enrolled in any course." });

          // Step 2: Extract courseIds from enrollments
          const enrolledCourseIds = enrollments.map(enroll => enroll.courseId);

          // Step 3: Fetch course details
          const courses = await coursesModel.find({ _id: { $in: enrolledCourseIds } });

          // Step 4: For each course, get category's subjectName and libraries
          const results = await Promise.all(
            courses.map(async course => {
              // Get subjectName from categoryModel
              const category = await categoryModel.findById(course.subjectId);
              const subjectName = category?.name || "";

              // Get library data for the course
              const libraryDocs = await libraryModel.find({ courseId: course._id });
              // const libraries = libraryDocs.flatMap(doc => doc.library); // assuming `library` is an array in each doc

              const libraries = libraryDocs.flatMap(doc =>
                (doc.library || []).map(lib => {
                  const ext = lib.split('.').pop().split('?')[0].toLowerCase();

                  return {
                    url: lib,
                    type: ext,
                    filename: lib.filename || lib.split('/').pop(), // fallback to last part of URL
                    size: lib.size || null // size in bytes or a human-readable format if available

                  };
                })
              );


              // Return full course details + subjectName + libraries
              return {
                ...course._doc,
                subjectName,
                libraries,
              };
            })
          );

          res.status(200).send({ message: "My library Details.", result: results });
        } else if (type == "video") {
          // Step 1: Get enrollments for the user
          const enrollments = await enrollmentModel.find({ userId: existingUser._id });
          if (!enrollments || enrollments.length === 0)
            return res.status(400).send({ message: "User is not enrolled in any course." });

          // Step 2: Extract courseIds from enrollments
          const enrolledCourseIds = enrollments.map(enroll => enroll.courseId);

          // Step 3: Fetch course details
          const courses = await coursesModel.find({ _id: { $in: enrolledCourseIds } });

          // Step 4: For each course, get category's subjectName and videos
          const results = await Promise.all(
            courses.map(async course => {
              // Get subjectName from categoryModel
              const category = await categoryModel.findById(course.subjectId);
              const subjectName = category?.name || "";

              // Get video data
              const videoDocs = await videoModel.find({ courseId: course._id });
              const videos = videoDocs.flatMap(doc => doc.video); // Flatten all videos

              // Return full course details + subjectName + videos
              return {
                ...course._doc,
                subjectName,
                videos,
              };
            })
          );

          res.status(200).send({ message: "My video Details.", result: results });
        } else if (type == "image") {
          // Step 1: Get enrollments for the user
          const enrollments = await enrollmentModel.find({ userId: existingUser._id });

          if (!enrollments || enrollments.length === 0)
            return res.status(400).send({ message: "User is not enrolled in any course." });

          // Step 2: Extract courseIds from enrollments
          const enrolledCourseIds = enrollments.map(enroll => enroll.courseId);

          // Step 3: Fetch course details
          const courses = await coursesModel.find({ _id: { $in: enrolledCourseIds } });

          // Step 4: For each course, fetch image records and structure the response
          const results = await Promise.all(
            courses.map(async (course) => {
              // Get subjectName from categoryModel
              const category = await categoryModel.findById(course.subjectId);
              const subjectName = category?.name || "";

              // Get image data
              const imageDocs = await imageModel.find({ courseId: course._id }).skip(skip).limit(pageSize);
              const images = imageDocs.flatMap(doc => doc.image); // Combine all image arrays

              return {
                ...course._doc,
                subjectName,
                images
              };
            })
          );

          res.status(200).send({ message: "My image details.", result: results });
        } else res.status(400).send({ message: "Type Does Not Exist." });
      } else if (action == "mySubscription") {
        if (type == "allCourses") {
          const courseFilter = {
            ...(searchKeyword && { courseName: { $regex: searchKeyword, $options: "i" } }), // <-- Add regex filter
            status: "Active"
          };

          const result = await coursesModel.find(courseFilter).skip(skip).limit(pageSize);

          if (!result || result.length === 0) {
            return res.status(400).send({ message: "No course found in the table." });
          }

          const enhancedCourses = await Promise.all(result.map(async (course) => {
            const courseObj = course.toObject();

            if (!course.subjectId) {
              // Skip category lookup if subjectId is missing
              return {
                ...courseObj,
                subjectName: "",
              };
            }

            const category = await categoryModel.findById(course.subjectId).select("name");
            return {
              ...courseObj,
              subjectName: category?.name || "",
            };
          }));

          res.status(200).send({ message: "Courses Details.", result: enhancedCourses });
        } else if (type == "myList") {
          const result = await enrollmentModel.find({ userId: existingUser._id, status: "Active" }).skip(skip).limit(pageSize);

          if (!result || result.length === 0) {
            return res.status(400).send({ message: "No course found in the table." });
          }

          const enhancedCourses = await Promise.all(result.map(async (course) => {
            const courses = await coursesModel.findById(course.courseId);
            const category = await categoryModel.findById(courses.subjectId);

            return {
              ...courses._doc,
              subjectName: category ? category.name : "",
            };
          }));

          // Filter by courseName using searchKeyword (case-insensitive)
          const filteredCourses = searchKeyword
            ? enhancedCourses.filter(course =>
              course.courseName?.toLowerCase().includes(searchKeyword.toLowerCase()))
            : enhancedCourses;

          res.status(200).send({ message: "My Courses Details.", result: filteredCourses });
        } else res.status(400).send({ message: "Type Does Not Exist." });
      } else if (action == "notification") {

        // Step 1: Fetch clientIds
        const clientData = await model.find({ clientId: { $in: id } }).select("title body");

        const userDetails = await BuddysModel.findOne({ _id: id });

        const result = {
          ...clientData._doc,
          userDetails,
        };
        // fcmTokens now contains all valid tokens
        res.status(200).send({ message: "Notification List.", result });
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

    // Coerce string to boolean (only "true" should be true, everything else is false)
    const parseBool = (value) => value === 'true' || value === true;

    const mobileAuthBool = parseBool(mobileAuth);
    const googleAuthBool = parseBool(googleAuth);
    const emailAuthBool = parseBool(emailAuth);

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
          mobileAuth: mobileAuthBool,
          googleAuth: googleAuthBool,
          emailAuth: emailAuthBool,
        });

        await result.save();

        res.status(201).send({ message: "Site settings created successfully", result });
      } else if (action == "read") {
        // if (!ID) return res.status(400).json({ message: "ID is required" });
        //  _id: ID, status: "Active"
        const result = await siteSettingsModel.findOne({});

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

        if (req.files && req.files["faviconLogo"]) {
          updatedData.faviconLogo = req.files["faviconLogo"] ? req.files["faviconLogo"][0].path : "";
        }

        if (req.files && req.files["companyLogo"]) {
          updatedData.companyLogo = req.files["companyLogo"] ? req.files["companyLogo"][0].path : "";
        }

        if (req.files && req.files["waterMarkLogo"]) {
          updatedData.waterMarkLogo = req.files["waterMarkLogo"] ? req.files["waterMarkLogo"][0].path : "";
        }

        // Corrected boolean checks
        // For update:
        if (mobileAuth !== undefined) updatedData.mobileAuth = mobileAuthBool;
        if (googleAuth !== undefined) updatedData.googleAuth = googleAuthBool;
        if (emailAuth !== undefined) updatedData.emailAuth = emailAuthBool;


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
        const result = await userNotificationDevicesModel.find({}).select("devices.fcm_token");

        await sendPushNotification(result, title, body);

        res.status(200).json({ message: "Flash message Sent", result });
      } else res.status(400).json({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exists." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

//user enrollment to a course
router.post("/courseEntrollment", tokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, courseId } = req.body; // Extract action and status
    req.body.userId = id;

    // if (!action || !courseId) return res.status(400).json({ message: "All  fields are required " });

    if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).send({ message: "Invalid courseId." });
    }

    const user = await BuddysModel.findOne({ _id: id, status: "Active", });
    if (user) {
      if (action == "create") {
        const newOrder = new orderModel({
          userId: id,
          courseId: courseId,
        });
        const enrollment = new enrollmentModel({
          userId: id,
          courseId: courseId,
        });

        await newOrder.save();

        const result = await coursesModel.findOne({ _id: courseId });

        const readdata = newOrder.toObject();
        readdata.courseDetails = result;

        await enrollment.save();
        const results = await coursesModel.findOne({ _id: courseId });

        const readdatas = enrollment.toObject();
        readdatas.courseDetails = results;

        const lessons = new lessonsModel({
          userId: id,
          courseId: courseId,
        });
        await lessons.save();

        res.status(201).json({ message: "Order  & Entrollment Created", Order: readdata, Enrollment: readdatas });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exist." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
})

//profile
//couseRead video, image and library
router.post("/listResource", tokenValidation, async (req, res) => {
  try {
    const id = req.userId;
    const { action, ID } = req.body; // Extract action and status
    req.body.userId = id;

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id, status: "Active", });
    if (user) {
      if (!ID) return res.status(400).send({ message: "ID is needed." });

      const result = await coursesModel.findOne({ _id: ID });
      if (!result) return res.status(400).json({ message: "No course found in the table." });

      if (action == "image") {
        const image = await imageModel.find({ courseId: result._id });
        const flattenedImage = [...new Set(image.flatMap(item => item.image))];

        res.status(200).send({ message: "course image List.", result: flattenedImage });
      } else if (action == "video") {
        const video = await videoModel.find({ courseId: result._id });
        const flattenedVideo = [...new Set(video.flatMap(item => item.video))];

        res.status(200).send({ message: "course video List.", result: flattenedVideo });
      } else if (action == "library") {
        const library = await libraryModel.find({ courseId: result._id });
        const flattenedLibrary = [...new Set(library.flatMap(item => item.library))];

        res.status(200).send({ message: "course library List.", result: flattenedLibrary });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exist." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/dashboard", upload.fields([{ name: "slider", maxCount: 20 },]), async (req, res) => {
  try {
    const { action, ID, popular } = req.body;
    const slider = req.files?.slider?.map(file => file.path) || [];

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    if (action == "create") {
      const newDashBoard = new dashBoardsModel({
        slider,
        popularMostWatch: popular
      });

      await newDashBoard.save();

      res.status(201).json({ message: "DashBoard Created", result: newDashBoard });
    } else if (action === "read") {
      const readDashBoard = await dashBoardsModel.findOne({ status: "Active"});

      if (!readDashBoard) return res.status(400).json({ error: "DashBoard not found" });

      res.status(200).json({ message: "DashBoard Details", result: readDashBoard });
    } else if (action === "update") {
      if (!ID) return res.status(400).json({ error: "ID required for update" });

      let updateFields = {};

      if (req.files?.slider?.length > 0) updateFields.slider = slider;  
      if (popular) updateFields.popularMostWatch = popular;

      const updateDashBoard = await dashBoardsModel.findOneAndUpdate(
        { _id: ID },
        updateFields,
        { new: true }
      );

      if (!updateDashBoard) return res.status(400).json({ error: "DashBoard not found" });

      res.status(200).json({ message: "DashBoard Updated ", result: updateDashBoard });
    } else if (action === "delete") {
      if (!ID) return res.status(400).json({ error: "ID required for deletion" });

      const deleteDashBoard = await dashBoardsModel.findByIdAndUpdate(
        ID,
        { status: "Inactive" },
        { new: "true" }
      );

      if (!deleteDashBoard) return res.status(404).json({ error: "DashBoard not found" });

      res.status(200).json({ message: "DashBoard status set to be inactive ", result: deleteDashBoard });
    } else res.status(400).send({ message: "Action Does Not Exist." });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error", error })
  }
});

//  admin
// creating Dashboard from upload files & youtube Links
router.post("/banner", adminTokenValidation, upload.fields([{ name: "slider", maxCount: 20 }]), async (req, res) => {
  try {
    const id = req.userId;
    const { action, ID, popular } = req.body;
    req.body.userId = id;

    const slider = req.files?.slider?.map(file => file.path) || [];

    if (ID && !mongoose.Types.ObjectId.isValid(ID)) {
      return res.status(400).send({ message: "Invalid ID." });
    }

    const user = await BuddysModel.findOne({ _id: id });
    if (user) {
      if (action === "create") {
        const newDashBoard = new dashBoardsModel({
          slider,
          popularMostWatch: popular
        });

        await newDashBoard.save();

        res.status(201).json({ message: "DashBoard Created", result: newDashBoard });
      } else if (action === "read") {
        const readDashBoard = await dashBoardsModel.find({});

        if (!readDashBoard) return res.status(400).json({ error: "DashBoard not found" });

        res.status(200).json({ message: "DashBoard Details", result: readDashBoard });
      } else if (action === "update") {
        if (!ID) return res.status(400).json({ error: "ID required for update" });

        let updateFields = {};

        if (req.files?.slider?.length > 0) updateFields.slider = slider;
        if (popular) updateFields.popularMostWatch = popular;

        const updateDashBoard = await dashBoardsModel.findOneAndUpdate(
          { _id: ID },
          updateFields,
          { new: true }
        );

        if (!updateDashBoard) return res.status(400).json({ error: "DashBoard not found" });

        res.status(200).json({ message: "DashBoard Updated ", result: updateDashBoard });
      } else if (action === "delete") {
        if (!ID) return res.status(400).json({ error: "ID required for deletion" });

        const deleteDashBoard = await dashBoardsModel.findByIdAndUpdate(
          ID,
          { status: "Inactive" },
          { new: true }
        );

        if (!deleteDashBoard) return res.status(404).json({ error: "DashBoard not found" });

        res.status(200).json({ message: "DashBoard status set to be inactive ", result: deleteDashBoard });
      } else res.status(400).send({ message: "Action Does Not Exist." });
    } else res.status(400).send({ message: "User Does Not Exist." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});




module.exports = router;