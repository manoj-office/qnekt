require('dotenv').config();
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const saltRound = 7;
const secretKey = 'Qw3$er5*ty&7Uio8*9okjP'
// const {buddyProfileModel} = require('../schema/buddysSchema')
const {BuddysModel} = require("../schema/loginSchema.js");

// Generate Referral Code
const generateReferralCode = async (length)=> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let referralCode = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    referralCode += characters.charAt(randomIndex);
  }
  return referralCode;
}

// Generate OTP :
const generateOTP = async (otpLength) => {
  let digits = "123456789";
  let OTP = "";
  for (let i = 0; i < otpLength; i++) {
    OTP += digits[Math.floor(Math.random() * 9)]; 
  }
  return OTP;
};

// Hash OTP :
const hashOtp = async(otp)=>{
  try {
    let salt = await bcrypt.genSalt(saltRound)
    let hash = await bcrypt.hash(otp,salt)
    return String(hash);
  } catch (error) {
    console.log(error);
  }
}

// Hash Compare OTP :
const hashCompareOtp = (otp, hashOtp)=>{
    return bcrypt.compare(otp,hashOtp)
}

// OTP Token :
const createOtpToken = async ({otp, email})=>{
  let otpToken = jwt.sign({otp, email},secretKey,{expiresIn:'2m'})
  return otpToken
}

const decodeOtpToken = (otpToken)=>{
  let data = jwt.decode(otpToken)
  return data
}

// OTP Token Validation :
const otpValidation = async (req,res,next)=>{
  try {
      if(req.headers.authorization){
          let otpToken = req.headers.authorization.split(" ")[1];
          let data = decodeOtpToken(otpToken);
          if((Math.floor(Date.now()/1000))<=data.exp)
              next()
          else
              res.status(401).send({message:"Invalid Security Token"})
      }
      else{
          res.status(401).send({message:"OTP Token Not Found"})
      }
  } catch (error) {
      res.status(500).send({message:"Internal Server Error",error})
  }
}

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
  if(at > 8){
    formattedEmail = email[0] + email[1] + email[2] + email.substring(3, at-2).replace(/./g, "*") + email[at-2] + email[at-1] + email.substring(at, email.length);
    console.log("==>"+formattedEmail);
  }else{
    formattedEmail = email[0] + email[1] + email[2] + email.substring(3, at).replace(/./g, "*") + email.substring(at, email.length);
    console.log("===>"+formattedEmail);
  }
  return formattedEmail;

}

module.exports = {
  generateReferralCode,
  generateOTP,
  hashOtp,
  hashCompareOtp,
  createOtpToken,
  decodeOtpToken,
  otpValidation,
  generateUsername,
  formatMobileNumberStar,
  formatEmailStar
}