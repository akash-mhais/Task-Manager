const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin (We will check role in routes)
exports.getUsers = async (req, res) => {
  try {
    const { role, department, status, search } = req.query;
    
    let query = {};

    if (role) query.role = role;
    if (department) query.department = department;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  const { role, name, employeeId, email, mobile, department, designation, password } = req.body;

  if (!role || !name || !employeeId || !email || !mobile || !department || !designation || !password) {
    return res.status(400).json({ success: false, error: "Please fill in all user profile details" });
  }

  try {
    const userExists = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (userExists) {
      return res.status(400).json({ success: false, error: "User with this Email ID or Employee ID already exists" });
    }

    const user = await User.create({
      role,
      name,
      employeeId,
      email, // Automatically becomes the Email ID / username
      mobile,
      department,
      designation,
      password
    });

    await ActivityLog.create({
      user: req.user._id,
      action: "USER_CREATE",
      details: `Created new user account: ${name} (${email}) as ${role}`
    });

    res.status(201).json({
      success: true,
      message: "User account created successfully",
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  const { name, mobile, role, department, designation, status } = req.body;

  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    user.name = name || user.name;
    user.mobile = mobile || user.mobile;
    user.role = role || user.role;
    user.department = department || user.department;
    user.designation = designation || user.designation;
    user.status = status || user.status;

    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: "USER_UPDATE",
      details: `Updated user account details for: ${user.name} (${user.email})`
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Reset password (Admin action)
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
exports.adminResetPassword = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, error: "Please enter a new password" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    user.password = password;
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: "USER_PASSWORD_RESET_ADMIN",
      details: `Admin reset password for user: ${user.name} (${user.email})`
    });

    res.status(200).json({ success: true, message: `Password for user ${user.name} reset successfully` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Toggle status to Disabled, or completely delete. The specs say "Delete users" and "Disable users".
    // For safety, let's delete the database record or set status to Disabled depending on request.
    // If the request query has hard=true, delete it. Otherwise toggle status to Disabled.
    if (req.query.hard === "true") {
      await User.deleteOne({ _id: req.params.id });
      await ActivityLog.create({
        user: req.user._id,
        action: "USER_DELETE_HARD",
        details: `Deleted user account record: ${user.name} (${user.email})`
      });
    } else {
      user.status = "Disabled";
      await user.save();
      await ActivityLog.create({
        user: req.user._id,
        action: "USER_DISABLE",
        details: `Disabled user account access: ${user.name} (${user.email})`
      });
    }

    res.status(200).json({ success: true, message: "User status updated/deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
