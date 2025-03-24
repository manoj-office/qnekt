let createError = require("http-errors");
let express = require("express");
let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
let cors = require("cors");
let socket = require("socket.io");
const connectDB = require("./config/mongoDbConfig"); // Ensure MongoDB connection is established

// let budsRouters = require("./routes/budsRouters");
// let chatRouters = require("./routes/chatRouters");
let loginRouters = require("./routers/loginRouter");
// let shareRouters = require("./routes/shareRouters");
// let buddysRouters = require("./routes/buddysRouters");
// let verifyRouters = require("./routes/verifyRouters");
// let searchRouters = require("./routes/searchRouters");
// let eventsRouters = require("./routes/eventsRouters");

// let eventsRoutersNew = require("./routes/eventsRoutersNew");

// let runCronJobs = require("./services/cronFunctions");
// let contactRouters = require("./routes/contactRouters");
// let storiesRouters = require("./routes/storiesRouters");
// let reportsRouters = require("./routes/reportsRouters");
// let dropDownRouters = require("./routes/dropDownRouters");
// let discoverRouters = require("./routes/discoverRouters");
// let communityRouters = require("./routes/communityRouters");
// let communityViewRouters = require("./routes/communityViewRouters");
// let suggestionsRouters = require("./routes/suggestionsRouters");
// let notificationRouters = require("./routes/notificationRouters");
// let generalSettingsRouters = require("./routes/generalSettingsRouters");
// let privacySettingsRouters = require("./routes/privacySettingsRouters");
// let paymentRouters = require("./routes/paymentRouters");
// let deleteRouters = require("./routes/deleteRouters");
// let discountRouters = require("./routes/discountsRouter");
// let instituteRouters = require("./routes/instituteRouters");
// let invoiceRouters = require("./routes/invoiceRouters");
// let walletRouters = require("./routes/walletRouters");

// // Admin Routers :
// let generalRouters = require("./adminRouters/generalRouters");
// let dashboardRouters = require("./adminRouters/dashboardRouters");
// let manageBudsRouter = require("./adminRouters/manageBudsRouter");
// let manageBuddyRouters = require("./adminRouters/manageBuddysRouter");
// let manageEventsRouter = require("./adminRouters/manageEventsRouter");
// let manageReportsRouter = require("./adminRouters/manageReportsRouter");
// let manageCommunityRouter = require("./adminRouters/manageCommunityRouter");
// let manageCategoriesRouter = require("./adminRouters/manageCategoriesRouter");
// let manageProfileVerification = require("./adminRouters/manageProfileVerification");
// let versionRouters = require("./adminRouters/versionRouters");
// let skillsIntrestsRouter = require("./adminRouters/skillsIntrestsRouter");
// let feedbacksRouter = require("./adminRouters/feedbacksRouter");
// let manageDiscountRouter = require("./adminRouters/manageDiscountRouter");
// let manageInstituteRouter = require("./adminRouters/manageInstituteRouter");
// let manangeTaxRouter = require("./adminRouters/manageTaxRouters");

var app = express();

// #!/usr/bin/env node

/**
 * Module dependencies.
 */

// var app = require('../app');
var debug = require("debug")("api:server");
var http = require("http");

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || 5000);
app.set("port", port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
connectDB;
server.listen(port, () => console.log("Server is listening :", port));
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json({ extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

app.use("/api/v1/", loginRouters);
// app.use("/api/v1/", searchRouters);
// app.use("/api/v1/bud/", budsRouters);
// app.use("/api/v1/chat/", chatRouters);
// app.use("/api/v1/share", shareRouters);
// app.use("/api/v1/story", storiesRouters);
// app.use("/api/v1/event/", eventsRouters);
// app.use("/api/v1/newevent/", eventsRoutersNew);
// app.use("/api/v1/buddy/", buddysRouters);
// app.use("/api/v1/verify/", verifyRouters);
// app.use("/api/v1/contact/", contactRouters);
// app.use("/api/v1/reports/", reportsRouters);
// app.use("/api/v1/discover/", discoverRouters);
// app.use("/api/v1/dropDown/", dropDownRouters);
// app.use("/api/v1/community/", communityRouters);
// app.use("/api/v1/communityView/", communityViewRouters);
// app.use("/api/v1/suggestion/", suggestionsRouters);
// app.use("/api/v1/settings/", privacySettingsRouters);
// app.use("/api/v1/settings/", generalSettingsRouters);
// app.use("/api/v1/notification/", notificationRouters);
// app.use("/api/v1/payment/", paymentRouters);
// app.use("/api/v1/delete/", deleteRouters);
// app.use("/api/v1/discount/", discountRouters);
// app.use("/api/v1/institute/", instituteRouters);
// app.use("/api/v1/invoice/", invoiceRouters);
// app.use("/api/v1/wallet/", walletRouters);

// // Admin Routers :
// app.use("/api/v1/admin/buds/", manageBudsRouter);
// app.use("/api/v1/admin/general/", generalRouters);
// app.use("/api/v1/admin/buddys/", manageBuddyRouters);
// app.use("/api/v1/admin/events/", manageEventsRouter);
// app.use("/api/v1/admin/dashboard/", dashboardRouters);
// app.use("/api/v1/admin/report/", manageReportsRouter);
// app.use("/api/v1/admin/community/", manageCommunityRouter);
// app.use("/api/v1/admin/categories/", manageCategoriesRouter);
// app.use("/api/v1/admin/version/", versionRouters);
// app.use("/api/v1/admin/profileVerification/", manageProfileVerification);
// app.use("/api/v1/admin/skillsIntrests", skillsIntrestsRouter);
// app.use("/api/v1/admin/feedbacks", feedbacksRouter);
// app.use("/api/v1/admin/discount", manageDiscountRouter);
// app.use("/api/v1/admin/institute", manageInstituteRouter);
// app.use("/api/v1/admin/tax/", manangeTaxRouter);


// Default Route - Ensure this comes before the 404 handler
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Qnekt API!" });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});


// // Cron Jobs :
// runCronJobs();

// Socket IO :
const io = socket(server, {
  cors: {
    //origin: "https://dev-admin.mybuddysapp.com/api"
    // origin: "https://164.52.207.14:5006/",
    //origin: "http://13.233.23.16:5008/"
    origin: "http://localhost:5000",
    credentials: true,
  },
});

let connectedClients = [];
io.on("connection", (socket) => {
  console.log("User connected: ", socket.id);

  socket.on("joinChat", ({ chatId, userId }) => {
    const chatIndex = connectedClients.findIndex(
      (chat) => chat.chatId === chatId
    );
    if (chatIndex !== -1) {
      connectedClients[chatIndex][userId] = socket.id;
    } else {
      const newChat = { chatId: chatId };
      newChat[userId] = socket.id;
      connectedClients.push(newChat);
    }
    console.log(connectedClients, "123");
  });

  socket.on("oneToOneMessage", ({ chatId, receiver, message }) => {
    const chatIndex = connectedClients.findIndex(
      (chat) => chat.chatId === chatId
    );
    if (chatIndex !== -1) {
      const receiverSocketId = connectedClients[chatIndex][receiver];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", message);
        console.log(receiverSocketId, message);
      } else {
        console.log(`${receiver} is not online. Message not sent.`);
      }
    } else {
      console.log(`Chat not found for ${receiver}. Message not sent.`);
    }
  });

  socket.on("groupMessage", ({ chatId, receiver, message }) => {
    receiver.forEach(async (receiver) => {
      const chatIndex = connectedClients.findIndex(
        (chat) => chat.chatId === chatId
      );
      if (chatIndex !== -1) {
        const receiverSocketId = connectedClients[chatIndex][receiver];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", message);
        } else {
          console.log(`${receiver} is not online. Message not sent.`);
        }
      } else {
        console.log(`Chat not found for ${receiver}. Message not sent.`);
      }
    });
  });

  socket.on("disconnect", () => {
    connectedClients.forEach((chat) => {
      for (const userId in chat) {
        if (chat.hasOwnProperty(userId) && chat[userId] === socket.id) {
          delete chat[userId];
          break;
        }
      }
    });
    connectedClients = connectedClients.filter(
      (chat) => Object.keys(chat).length > 1
    );
    console.log(connectedClients, "User disconnected");
  });
});

module.exports = app;
