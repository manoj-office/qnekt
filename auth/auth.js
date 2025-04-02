const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const saltRound = process.env.SALTROUND;
const accessSecretKey = "Qw3$er5*ty6&7Uio8*9P";

const hashPassword = async (password) => {
  let salt = await bcrypt.genSalt(saltRound);
  let hash = await bcrypt.hash(password, salt);
  return hash;
};

const hashCompare = (password, hash) => {
  return bcrypt.compare(password, hash);
};

const createToken = async ({ id, fullName }) => {
  let token = jwt.sign({ id, fullName }, accessSecretKey, {
    expiresIn: "5d",
  });
  return token;
};

const createAdminToken = async ({ id, fullName, email, mobNo, dob, role }) => {
  let token = jwt.sign({ id, fullName, email, mobNo, dob, role }, accessSecretKey, {
    expiresIn: "5d",
  });
  return token;
};

const createRefreshToken = async ({ id, firstName, lastName, email, mobNo, dob }) => {
  let token = jwt.sign({ id, firstName, lastName, email, mobNo, dob }, accessSecretKey, {
    expiresIn: "30d",
  });
  return token;
};

const createRefreshAdminToken = async ({ id, firstName, lastName, email, mobNo, dob, role }) => {
  let token = jwt.sign({ id, firstName, lastName, email, mobNo, dob, role }, accessSecretKey, {
    expiresIn: "30d",
  });
  return token;
};

const decodeToken = (token) => {
  let data = jwt.decode(token);
  let id = data ? data.id : null;
  // let role = data ? data.role : null;
  return { id, ...data };
};

const tokenValidation = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      let token = req.headers.authorization.split(" ")[1];
      let { id, ...data } = decodeToken(token);
      if (Math.floor(Date.now() / 1000) <= data.exp) {
        req.userId = id;
        next();
      } else res.status(401).send({ message: "Token Expired" });
    } else {
      res.status(401).send({ message: "Token Not Found" });
    }
  } catch (error) {
    console.error("Internal Server Error Token Validation:", error);
    res
      .status(500)
      .send({ message: "Internal Server Error Token Validation", error });
  }
};

const adminTokenValidation = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      let token = req.headers.authorization.split(" ")[1];
      let { id, ...data } = decodeToken(token);
      if (data.role === "admin") {
        if (Math.floor(Date.now() / 1000) <= data.exp) {
          req.userId = id;
          next();
        } else res.status(401).send({ message: "Token Expired" });
      } else res.status(401).send({ message: "Only Admin can access" });
    } else res.status(401).send({ message: "Token Not Found" });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error });
  }
};

//with or without token 
const userValidation = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      let token = req.headers.authorization.split(" ")[1];
      let { id, ...data } = decodeToken(token);
      if (Math.floor(Date.now() / 1000) <= data.exp) {
        req.userId = id;
        next();
      } else res.status(401).send({ message: "Token Expired" });
    } else {
      next();
      // res.status(401).send({ message: "Token Not Found" });
    }
  } catch (error) {
    console.error("Internal Server Error Token Validation:", error);
    res
      .status(500)
      .send({ message: "Internal Server Error Token Validation", error });
  }
};


module.exports = {
  hashCompare,
  hashPassword,
  createToken,
  createRefreshToken,
  decodeToken,
  tokenValidation,
  createAdminToken,
  createRefreshAdminToken,
  adminTokenValidation,
  userValidation,
};
