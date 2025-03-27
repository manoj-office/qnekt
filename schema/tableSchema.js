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
        subjectId:  { type: String },
    	courseName: { type: String },
        description: { type: String },	
        coursePrice: { type: String },
        courseTime: { type: String },
        certificationOfCompletion: { type: Boolean },
        moreInformation: { type: String },
        courseType:{type: Boolean}, 	
        created_at: { type: Date },
        lastActive: { type: Date },

        status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Course" }
);

// 2. order Schema :
const orderSchema = new mongoose.Schema(
    {
        userId: { type: String, default: "" },
        course_id: { type: String },	
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
        course_id: { type: String },	
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
        course_id: { type: String },	
        // status (active/completed)	
        progress: { type: String },	
        created_at: { type: String },

        status: { type: String, default: "Active" }, //completed
    },
    { timestamps: true },
    { versionKey: false },
    { collection: "Enrollment" }
);

const categoryModel = mongoose.model("Category", categorySchema);
const coursesModel = mongoose.model("Course", coursesSchema);
const orderModel = mongoose.model("Order", orderSchema);
const lessonsModel = mongoose.model("Lesson", lessonSchema);
const enrollmentModel = mongoose.model("Enrollment", enrollmentSchema);

module.exports = {
    categoryModel,
    coursesModel,
    orderModel,
    lessonsModel,
    enrollmentModel
};
