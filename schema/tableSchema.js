// Use Mongoose :
const mongoose = require("mongoose");
const validator = require("validator");

// 1. category Schema :
const categorySchema = new mongoose.Schema(
    {
        userId: { type: String, default: "" },
        name: { type: String },
        description: { type: String },
        icons: { type: String },
        instructor_id: { type: String },
        price: { type: String },
        isFeature: { type: Boolean, default: false },
        // category_id: { type: String }, 	
        // created_at: { type: Date },
        lastActive: { type: Date },

        status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Category" }
);

// 1. courses Schema :
const coursesSchema = new mongoose.Schema(
    {
        userId: { type: String, },
        subjectId: { type: String },
        courseName: { type: String },
        description: { type: String },
        whatYouWillEarn: { type: String },
        features: { type: String },
        targetAudience: { type: String },
        requirements: { type: String },
        instructor: { type: String },
        level: { type: String },
        lessons: { type: String},
        languages: { type: String},
        coursePrice: { type: String },
        courseTime: { type: String },
        certificationOfCompletion: { type: Boolean },
        moreInformation: { type: String },
        courseType: { type: Boolean },
        image: { type: String },
        created_at: { type: Date },
        lastActive: { type: Date },

        status: { type: String, default: "Active" }
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Course" }
);

// studentSchema
const studentSchema = new mongoose.Schema(
    {
        ID: { type: Number, },
        name: { type: String, },
        email: { type: String },
        image: { type: String },
        status: { type: String, default: "Active" }
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Student" }
);

// 2. order Schema :
const orderSchema = new mongoose.Schema(
    {
        userId: { type: String, default: "" },
        courseId: { type: String },
        title: { type: String },
        video_url: { type: String },
        pdf_url: { type: String },
        duration: { type: String },
        created_at: { type: Date },

        status: { type: String, default: "Active" },
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Order" }
);

// 3. lesson Schema :
const lessonSchema = new mongoose.Schema(
    {
        userId: { type: String, default: "" },
        courseId: { type: String },
        title: { type: String },
        video_url: { type: String },
        pdf_url: { type: String },
        duration: { type: String },
        created_at: { type: Date },

        status: { type: String, default: "Active" },
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Lesson" }
);

// 4. Enrollment Schema :
const enrollmentSchema = new mongoose.Schema(
    {
        userId: { type: String, default: "" },
        courseId: { type: String },
        // status (active/completed)	
        progress: { type: String },
        created_at: { type: String },

        status: { type: String, default: "Active" }, //completed
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Enrollment" }
);

const videoSchema = new mongoose.Schema(
    {
        userId: { type: String },
        categoryId: { type: String },
        courseId: { type: String },
        name: { type: String },
        description: { type: String },
        icons: { type: String },
        video: { type: Array },
        created_at: { type: Date },

        status: { type: String, default: "Active" }, //completed
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Videos" }
);



const imageSchema = new mongoose.Schema(
    {
        userId: { type: String },
        categoryId: { type: String },
        courseId: { type: String },
        name: { type: String },
        description: { type: String },
        icons: { type: String },
        image: { type: Array },
        created_at: { type: Date },

        status: { type: String, default: "Active" }, //completed
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Images" }
);

const librarySchema = new mongoose.Schema(
    {
        userId: { type: String },
        categoryId: { type: String },
        courseId: { type: String },
        name: { type: String },
        description: { type: String },
        icons: { type: String },
        library: { type: Array },
        created_at: { type: Date },

        status: { type: String, default: "Active" }, //completed
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Library" }
);

const cartSchema = new mongoose.Schema(
    {
        userId: { type: String },
        courseId: { type: [String] },
        status: { type: String, default: "Active" }, //completed
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Cart" }
);


const siteSettingsSchema = new mongoose.Schema(
    {
        companyName: { type: String, default: "" },
        emailId: { type: String, default: "" },
        contact1: { type: String, default: "" },
        contact2: { type: String, default: "" },
        address: { type: String, default: "" },
        faviconLogo: { type: String, default: "" },
        companyLogo: { type: String, default: "" },
        waterMarkLogo: { type: String, default: "" },
        mobileAuth: { type: Boolean, default: false  },
        googleAuth: { type: Boolean, default: false  },
        emailAuth: { type: Boolean, default: false },
        status: { type: String, default: "Active" }, //completed
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "site Settings" }
);

const categoryModel = mongoose.model("Category", categorySchema);
const coursesModel = mongoose.model("Course", coursesSchema);
const studentModel = mongoose.model("Student", studentSchema);
const videoModel = mongoose.model("Videos", videoSchema);
const imageModel = mongoose.model("Images", imageSchema);
const libraryModel = mongoose.model("Library", librarySchema);
const cartModel = mongoose.model("Cart", cartSchema);

const siteSettingsModel = mongoose.model("site Settings", siteSettingsSchema);


const orderModel = mongoose.model("Order", orderSchema);
const lessonsModel = mongoose.model("Lesson", lessonSchema);
const enrollmentModel = mongoose.model("Enrollment", enrollmentSchema);

module.exports = {
    categoryModel,
    coursesModel,
    orderModel,
    lessonsModel,
    enrollmentModel,
    studentModel,
    videoModel,
    imageModel,
    libraryModel,
    cartModel,
    siteSettingsModel,
};
