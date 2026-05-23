const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "wfp_secret_key_2026_super_secure", {
    expiresIn: process.env.JWT_EXPIRE || "30d"
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Please provide an email and password" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    if (user.status === "Disabled") {
      return res.status(403).json({ success: false, error: "Your account is disabled" });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    // Create activity log
    await ActivityLog.create({
      user: user._id,
      action: "LOGIN",
      details: `User ${user.name} (${user.email}) logged in successfully`,
      ipAddress: req.ip || req.headers["x-forwarded-for"]
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Forgot Password (Simulated reset)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "No user found with that email" });
    }

    // Reset password to a temporary default for easy manual recovery
    const tempPassword = "TempPassword123!";
    user.password = tempPassword;
    await user.save();

    console.log(`[PASSWORD RESET] Simulated email sent to ${email}. Temporary password: ${tempPassword}`);
    
    // Log recovery action
    await ActivityLog.create({
      user: user._id,
      action: "FORGOT_PASSWORD",
      details: `Password recovery triggered. Temporary password reset: '${tempPassword}'`
    });

    res.status(200).json({
      success: true,
      message: `Password reset simulation triggered. Check server console. Use temporary password: '${tempPassword}'`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Reset password (Self update)
// @route   POST /api/auth/reset-password
// @access  Private
exports.resetPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Please provide current and new passwords" });
  }

  try {
    const user = await User.findById(req.user.id);
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid current password" });
    }

    user.password = newPassword;
    await user.save();

    await ActivityLog.create({
      user: user._id,
      action: "PASSWORD_CHANGED",
      details: "User updated their password successfully"
    });

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
