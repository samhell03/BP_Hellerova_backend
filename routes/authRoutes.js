const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const auth = require("../middleware/auth");


router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/verify-registration-code", authController.verifyRegistrationCode);
router.post("/resend-registration-code", authController.resendRegistrationCode);

router.get("/me", auth, authController.me);

router.put("/change-password", auth, authController.changePassword);
router.post("/request-password-change-code", auth, authController.requestPasswordChangeCode);
router.post("/confirm-password-change", auth, authController.confirmPasswordChange);

router.put("/update-name", auth, authController.updateName);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;