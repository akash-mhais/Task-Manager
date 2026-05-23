const express = require("express");
const router = express.Router();
const { getUsers, createUser, updateUser, adminResetPassword, deleteUser } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");

// All user management routes require admin rights
router.use(protect);

router.route("/")
  .get(authorize("Admin", "Manager"), getUsers)
  .post(authorize("Admin"), createUser);

router.use(authorize("Admin"));

router.route("/:id")
  .put(updateUser)
  .delete(deleteUser);

router.put("/:id/reset-password", adminResetPassword);

module.exports = router;
