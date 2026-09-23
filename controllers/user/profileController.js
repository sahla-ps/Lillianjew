const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP for password reset",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP: ${otp}</h4></b>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
};

const securePassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.error("Error hashing password:", error);
    throw error;
  }
};

const getForgotPassPage = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);

      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgotPass-otp");
        console.log("OTP:", otp);
      } else {
        res.json({
          success: false,
          message: "Failed to send OTP. Please try again.",
        });
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exist",
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP not match" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "An error occured. please try again." });
  }
};

const getResetPassPage = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;

    console.log("Resending OTP to email:", email);
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp);
      res.status(200).json({ success: true, message: "Resend OTP Successful" });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Failed to resend OTP" });
    }
  } catch (error) {
    console.error("Error in resend OTP.", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const postNewPassword = async(req,res) => {
  try {
    
    const {newPass1,newPass2} = req.body;
    const email = req.session.email;

    if(newPass1 === newPass2){
      const passwordHash = await securePassword(newPass1)
      await User.updateOne(
        {email:email},
        {$set: {password:passwordHash}}
      )
      res.redirect("/login")
    }else{
      res.render("reset-password",{message:"Passwords do not match."})
    }

  } catch (error) {
    res.redirect("/pageNotFound")
  }
}



// const postNewPassword = async (req, res) => {
//   try {
//     const { newPass1, newPass2 } = req.body;
//     const email = req.session.email;

//     if (!email || !req.session.otpVerified) {
//       return res.redirect("/forgot-password");
//     }

//     if (!newPass1 || newPass1.length < 8) {
//       return res.render("reset-password", { message: "Password must be at least 8 characters." });
//     }

//     if (newPass1 !== newPass2) {
//       return res.render("reset-password", { message: "Passwords do not match." });
//     }

//     const passwordHash = await securePassword(newPass1);

//     const result = await User.updateOne(
//       { email: email },
//       { $set: { password: passwordHash } }
//     );

//     if (result.matchedCount === 0) {
//       return res.redirect("/pageNotFound");
//     }

//     req.session.email = null;
//     req.session.userOtp = null;
//     req.session.otpVerified = null;

//     res.redirect("/login");
//   } catch (error) {
//     console.error("Error in postNewPassword:", error);
//     res.redirect("/pageNotFound");
//   }
// };

module.exports = {
  getForgotPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword
};
