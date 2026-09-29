const express = require("express");
const router = express.Router();
const passport = require("passport");
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const { userAuth, adminAuth } = require("../middlewares/auth");
router.get("/pageNotFound", userController.PageNotFound);

//sign up Management
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    res.redirect("/");
  },
);

router.get("/login", userController.loadLogin);
router.post("/login", userController.login);

//Home page & Shopping page
router.get("/", userController.loadHomepage);
router.get("/logout", userController.logout);

//profile Management
router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.post("/reset-password", profileController.postNewPassword);
//userAuth
router.get("/userProfile", profileController.userProfile);
router.get('/change-email',profileController.changeEmail)
router.post("/change-email",profileController.changeEmailValid)
router.post("/verify-email-otp",profileController.verifyEmailOtp)
router.post("/update-email",profileController.updateEmail)
router.get("/change-password",profileController.changePassword)
router.post("/change-password",profileController.changePasswordValid)
router.post("/verify-changepassword-otp",profileController.verifyChangePassOtp)

module.exports = router;
