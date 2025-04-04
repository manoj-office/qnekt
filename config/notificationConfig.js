const firebase = require("firebase-admin");

// Import Firebase service account credentials
const serviceAccount = require("../qnekt-1e590-firebase-adminsdk-fbsvc-1955c865c6.json");
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
});

const messaging = firebase.messaging();

// Function to send push notifications to multiple users
const sendPushNotification = async (deviceTokens, title, body) => {
  if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
    console.error("Device tokens must be a non-empty array.");
    return;
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    tokens: deviceTokens, // Array of device tokens
  };

  try {
    const response = await messaging.sendMulticast(message);
    console.log("Successfully sent messages:", response);
  } catch (error) {
    console.error("Error sending messages:", error);
  }
};


module.exports = { firebase, sendPushNotification };