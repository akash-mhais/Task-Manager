const Message = require("../models/Message");
const Project = require("../models/Project");

// @desc    Get chat logs for a project team
// @route   GET /api/chat/:projectId
// @access  Private
exports.getChatHistory = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    // RBAC validation: managers can view only assigned. TL/Employees view assigned
    const isMember = project.teamMembers.some(m => m.toString() === req.user._id.toString());
    const isManager = project.manager.toString() === req.user._id.toString();
    
    if (req.user.role !== "Admin" && !isManager && !isMember) {
      return res.status(403).json({ success: false, error: "Access denied to project chat logs" });
    }

    const messages = await Message.find({ project: projectId })
      .populate("sender", "name role avatar designation")
      .sort({ createdAt: 1 })
      .limit(100);

    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Send chat message (HTTP fallback or helper)
// @route   POST /api/chat/:projectId
// @access  Private
exports.postChatMessage = async (req, res) => {
  const { projectId } = req.params;
  const { message, attachments } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: "Please enter a message" });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    const isMember = project.teamMembers.some(m => m.toString() === req.user._id.toString());
    const isManager = project.manager.toString() === req.user._id.toString();
    
    if (req.user.role !== "Admin" && !isManager && !isMember) {
      return res.status(403).json({ success: false, error: "Access denied to project chat logs" });
    }

    const chatMessage = await Message.create({
      project: projectId,
      sender: req.user._id,
      message,
      attachments: attachments || []
    });

    const populatedMessage = await Message.findById(chatMessage._id).populate("sender", "name role avatar");

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
