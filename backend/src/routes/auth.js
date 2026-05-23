const express = require("express");
const router = express.Router();
const { login, getMe, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/me", protect, getMe);
router.post("/reset-password", protect, resetPassword);

module.exports = router;
