const express = require("express");
const router = express.Router();
const { getTasks, getTask, createTask, updateTask, addComment, logWork, uploadAttachment, submitTask } = require("../controllers/taskController");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);

router.route("/")
  .get(getTasks)
  .post(authorize("Manager", "Team Leader"), createTask);

router.route("/:id")
  .get(getTask)
  .put(updateTask);

router.put("/:id/submit", submitTask);

router.post("/:id/comments", addComment);
router.post("/:id/worklogs", logWork);
router.post("/:id/attachments", upload.single("file"), uploadAttachment);

module.exports = router;
