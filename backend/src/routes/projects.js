const express = require("express");
const router = express.Router();
const { getProjects, getProject, createProject, updateProject, deleteProject, uploadDocument } = require("../controllers/projectController");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);

router.route("/")
  .get(getProjects)
  .post(authorize("Manager"), createProject);

router.route("/:id")
  .get(getProject)
  .put(authorize("Manager"), updateProject)
  .delete(authorize("Manager"), deleteProject);

router.post("/:id/upload", upload.single("file"), uploadDocument);

module.exports = router;
