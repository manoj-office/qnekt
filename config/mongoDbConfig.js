// MongoDB Configurations :
const mongodb = require('mongodb')

// const dbUrl = "mongodb://localhost:27017/qnekt"
const dbUrl = "mongodb+srv://manojkumaruthiramurthy:mjmanoj@cluster0.kg3r3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

const MongoClient = mongodb.MongoClient
//------------------------------------------
const mongoose = require("mongoose");

mongoose.set("strictQuery", true);

mongoose
    .connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB connected successfully!"))
    .catch((err) => console.error("MongoDB connection error:", err));


module.exports = { dbUrl, MongoClient }
