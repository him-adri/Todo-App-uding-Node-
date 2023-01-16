const validator = require("validator");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const validateDetails = (name, email, username, phonenumber, password, confirmpassword) =>{
    return new Promise((reject, resolve) => {
        if(typeof(name) != String) reject("Invalid Name");
        if(typeof(email) != String) reject("Invalid Email");
        if(typeof(username) != String) reject("Invalid UserName");
        if(typeof(password) != String) reject("Invalid Name");
        if(typeof(phonenumber) != Number) reject("Invalid Number");

        if(! email || !name || !password || !confirmpassword) reject("Invalid Content");
        if(!validator.isEmail(email)) reject("Invalid Email Format");
        if(username.length < 3 || username.length > 20) reject("Invalid UserName Format");
        if(name.length < 3 || name.length > 20) reject("Invalid name Format");
        if(password.length < 4 || username.length > 100) reject("Invalid UserName Format");

        resolve();
    });
}
const jwtSign = (email) => {
    const JWT_TOKEN = jwt.sign({ email: email }, "backendnodejs", {
      expiresIn: "15d",
    });
    return JWT_TOKEN;
  };
  
module.exports = {validateDetails, jwtSign} ;