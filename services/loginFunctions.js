const { BuddysModel } = require("../schema/loginSchema.js");

// //generateUsername + 1 
const generateUsername = async (name) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Combine the name, year, month, and day
  let baseUsername = name.toLowerCase() + "_" + year + month + day;

  // Remove special characters and spaces
  baseUsername = baseUsername.replace(/[^A-Za-z0-9._]/g, "");

  // Initialize the username and check if it exists
  let username = baseUsername;
  let count = 0;

  // Check if the username already exists
  let existingUser = await BuddysModel.findOne({ userName: username });

  // Append a number if the username already exists
  while (existingUser) {
    count += 1;
    // Append a count to make the username unique
    username = `${baseUsername}_${count}`;
    existingUser = await BuddysModel.findOne({ userName: username });
  }

  // Return the unique username
  return username;
};

const formatMobileNumberStar = async (mobileNumber) => {
  const prefixLength = 2;
  const suffixLength = 2;

  let prefix = mobileNumber.substring(0, prefixLength);
  let suffix = mobileNumber.slice(-suffixLength);
  let nbStars = mobileNumber.length - (prefixLength + suffixLength);
  let formattedMobile = prefix + "*".repeat(nbStars) + suffix;
  console.log(formattedMobile);
  return formattedMobile;
}

const formatEmailStar = async (Email) => {
  let email = Email;
  let at = email.indexOf("@");
  let formattedEmail = "";
  console.log(at)
  if (at > 8) {
    formattedEmail = email[0] + email[1] + email[2] + email.substring(3, at - 2).replace(/./g, "*") + email[at - 2] + email[at - 1] + email.substring(at, email.length);
    console.log("==>" + formattedEmail);
  } else {
    formattedEmail = email[0] + email[1] + email[2] + email.substring(3, at).replace(/./g, "*") + email.substring(at, email.length);
    console.log("===>" + formattedEmail);
  }
  return formattedEmail;

}

module.exports = {
  generateUsername,
  formatMobileNumberStar,
  formatEmailStar
}