const firebase = require("firebase-admin");

// const serviceAccount = require("../firebase-config.json");
const serviceAccount = "";
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
});


// Function to send push notifications
const sendPushNotification = async (deviceToken, title, body) => {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: deviceToken, // Device Token from client app
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("Successfully sent message:", response);
  } catch (error) {
    console.error("Error sending message:", error);
  }
};


module.exports = { firebase, sendPushNotification };