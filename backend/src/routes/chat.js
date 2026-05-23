const express = require("express");
const router = express.Router();
const { getChatHistory, postChatMessage } = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.route("/:projectId")
  .get(getChatHistory)
  .post(postChatMessage);

module.exports = router;
