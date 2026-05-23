const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");
const { predictProjectDelay } = require("../services/ai");

// Helper to determine status color/indicator based on deadlines and delayed tasks
const checkProjectHealth = (project, tasks) => {
  if (!tasks || tasks.length === 0) return "On Track"; // green
  
  const today = new Date();
  const endDate = new Date(project.plannedEndDate);
  
  const activeTasks = tasks.filter(t => t.status !== "Completed");
  const delayedTasks = tasks.filter(t => t.status === "Delayed" || (t.status !== "Completed" && new Date(t.dueDate) < today));

  if (today > endDate && activeTasks.length > 0) {
    return "Delayed"; // Red
  }
  
  if (delayedTasks.length > activeTasks.length * 0.25 || delayedTasks.length > 3) {
    return "Delayed"; // Red
  }

  if (delayedTasks.length > 0 || (endDate - today) / (1000 * 60 * 60 * 24) < 7 && activeTasks.length > 3) {
    return "At Risk"; // Yellow
  }

  return "On Track"; // Green
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot access project directories" });
    }
    const { status, priority, search } = req.query;
    let query = {};

    // Filter projects based on RBAC rules
    if (req.user.role === "Team Leader" || req.user.role === "Employee") {
      query.teamMembers = req.user._id;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const projects = await Project.find(query)
      .populate("manager", "name email department")
      .populate("teamMembers", "name email role department avatar")
      .sort({ createdAt: -1 });

    // Calculate progress for each project on the fly
    const projectsWithProgress = await Promise.all(projects.map(async (project) => {
      const tasks = await Task.find({ project: project._id });
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === "Completed").length;
      
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Auto recalculate status health
      const computedStatus = checkProjectHealth(project, tasks);
      if (project.status !== "Archived" && project.status !== computedStatus) {
        project.status = computedStatus;
        await project.save();
      }

      return {
        ...project.toObject(),
        progress,
        totalTasks,
        completedTasks
      };
    }));

    res.status(200).json({ success: true, count: projectsWithProgress.length, projects: projectsWithProgress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single project details & analytics
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("manager", "name email department designation mobile avatar")
      .populate("teamMembers", "name email role department designation mobile avatar");

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot access project directories" });
    }

    // RBAC validation: Managers have global access. TL/Employees view assigned
    if ((req.user.role === "Team Leader" || req.user.role === "Employee") && 
        !project.teamMembers.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, error: "Access denied to this project" });
    }

    // Retrieve tasks associated with project
    const tasks = await Task.find({ project: project._id })
      .populate("assignedTo", "name role avatar department performanceScore")
      .populate("assignedBy", "name role");

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "Completed").length;
    const pendingTasks = tasks.filter(t => t.status !== "Completed").length;
    const delayedTasksCount = tasks.filter(t => {
      const today = new Date();
      return t.status === "Delayed" || (t.status !== "Completed" && new Date(t.dueDate) < today);
    }).length;

    // Calculations
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const today = new Date();
    const endDate = new Date(project.plannedEndDate);
    const remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));

    // AI Prediction
    const aiPrediction = predictProjectDelay(project, tasks);

    // Update status if it changed
    const currentHealth = checkProjectHealth(project, tasks);
    if (project.status !== "Archived" && project.status !== currentHealth) {
      project.status = currentHealth;
      await project.save();
    }

    // Format Gantt chart timeline tasks
    const ganttTasks = tasks.map(t => ({
      taskId: t.taskId,
      title: t.title,
      start: t.startDate,
      end: t.dueDate,
      status: t.status,
      assignedTo: t.assignedTo ? t.assignedTo.name : "Unassigned"
    }));

    res.status(200).json({
      success: true,
      project: {
        ...project.toObject(),
        progress,
        remainingDays,
        totalTasks,
        completedTasks,
        pendingTasks,
        delayedTasksCount
      },
      tasks,
      ganttTasks,
      aiPrediction
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private/Admin
exports.createProject = async (req, res) => {
  const { name, description, clientName, priority, plannedStartDate, plannedEndDate, budget, manager, teamMembers } = req.body;

  if (!name || !description || !clientName || !plannedStartDate || !plannedEndDate || !manager) {
    return res.status(400).json({ success: false, error: "Please fill in all project fields" });
  }

  try {
    const finalBudget = budget !== undefined && budget !== null && !isNaN(budget) ? parseFloat(budget) : 0;
    const finalPriority = priority || "Medium";

    // Managers can only assign Team Leaders when creating a project
    const filteredTeamMembers = [];
    if (teamMembers && Array.isArray(teamMembers)) {
      for (const memberId of teamMembers) {
        const u = await User.findById(memberId);
        if (u && u.role === "Team Leader" && u.status === "Active") {
          filteredTeamMembers.push(memberId);
        }
      }
    }

    const project = await Project.create({
      name,
      description,
      clientName,
      priority: finalPriority,
      plannedStartDate,
      plannedEndDate,
      budget: finalBudget,
      manager,
      teamMembers: filteredTeamMembers
    });

    // Create notifications for the assigned manager and team members
    await Notification.create({
      recipient: manager,
      title: "New Project Assigned",
      message: `You have been assigned as Manager for the project: ${name}`,
      type: "ProjectUpdated",
      link: `/projects/${project._id}`
    });

    if (filteredTeamMembers.length > 0) {
      const notifications = filteredTeamMembers.map(memberId => ({
        recipient: memberId,
        title: "Assigned to Project",
        message: `You have been added as Team Leader for the project: ${name}`,
        type: "ProjectUpdated",
        link: `/projects/${project._id}`
      }));
      await Notification.insertMany(notifications);
    }

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: "PROJECT_CREATE",
      details: `Created project: ${name} (Client: ${clientName}, Budget: $${finalBudget})`
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin or Assigned Manager)
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    // Authorization: Manager or assigned Team Leader
    if (req.user.role !== "Manager" && req.user.role !== "Team Leader") {
      return res.status(403).json({ success: false, error: "Not authorized to edit this project" });
    }

    if (req.user.role === "Team Leader") {
      // Check if Team Leader is assigned to this project
      const isAssigned = project.teamMembers.some(
        (memberId) => memberId.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: "Not authorized to edit this project" });
      }

      // Team Leaders can only update Employees (Team Members) in the teamMembers array
      const { teamMembers } = req.body;
      if (teamMembers) {
        const currentProject = await Project.findById(project._id).populate("teamMembers");
        const currentTeamLeaders = currentProject.teamMembers
          .filter(m => m.role === "Team Leader")
          .map(m => m._id.toString());

        // Validate incoming members are active Employees
        const incomingEmployees = [];
        for (const memberId of teamMembers) {
          const u = await User.findById(memberId);
          if (u && u.role === "Employee" && u.status === "Active") {
            incomingEmployees.push(memberId.toString());
          }
        }

        // Merge: retain existing Team Leaders, update Employees
        project.teamMembers = [...currentTeamLeaders, ...incomingEmployees];
      }
    } else {
      // Manager can update everything
      const {
        name, description, clientName, priority, status,
        plannedStartDate, plannedEndDate, actualStartDate, actualEndDate,
        budget, manager, teamMembers
      } = req.body;

      project.name = name || project.name;
      project.description = description || project.description;
      project.clientName = clientName || project.clientName;
      project.priority = priority || project.priority;
      project.status = status || project.status;
      project.plannedStartDate = plannedStartDate || project.plannedStartDate;
      project.plannedEndDate = plannedEndDate || project.plannedEndDate;
      project.actualStartDate = actualStartDate || project.actualStartDate;
      project.actualEndDate = actualEndDate || project.actualEndDate;
      project.budget = budget !== undefined ? budget : project.budget;
      project.manager = manager || project.manager;

      if (teamMembers) {
        const currentProject = await Project.findById(project._id).populate("teamMembers");
        const currentEmployees = currentProject.teamMembers
          .filter(m => m.role === "Employee")
          .map(m => m._id.toString());

        // Validate incoming members are active Team Leaders
        const incomingTeamLeaders = [];
        for (const memberId of teamMembers) {
          const u = await User.findById(memberId);
          if (u && u.role === "Team Leader" && u.status === "Active") {
            incomingTeamLeaders.push(memberId.toString());
          }
        }

        // Merge: retain existing Employees, update Team Leaders
        project.teamMembers = [...incomingTeamLeaders, ...currentEmployees];
      }
    }

    await project.save();

    await ActivityLog.create({
      user: req.user._id,
      action: "PROJECT_UPDATE",
      details: `Updated project: ${project.name}`
    });

    res.status(200).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Upload document to project
// @route   POST /api/projects/:id/upload
// @access  Private (Admin, Project Manager, or Team Members)
exports.uploadDocument = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    // Check permissions
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot access project documents" });
    }
    const isMember = project.teamMembers.some(m => m.toString() === req.user._id.toString());
    const isGlobalManager = req.user.role === "Manager";
    if (!isGlobalManager && !isMember) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Please upload a file" });
    }

    const document = {
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    };

    project.documents.push(document);
    await project.save();

    await ActivityLog.create({
      user: req.user._id,
      action: "PROJECT_DOCUMENT_UPLOAD",
      details: `Uploaded document '${req.file.originalname}' to project '${project.name}'`
    });

    res.status(200).json({ success: true, documents: project.documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete/Archive project
// @route   DELETE /api/projects/:id
// @access  Private/Admin
exports.deleteProject = async (req, res) => {
  try {
    if (req.user.role !== "Manager") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    if (req.query.archive === "true") {
      project.status = "Archived";
      await project.save();
      await ActivityLog.create({
        user: req.user._id,
        action: "PROJECT_ARCHIVE",
        details: `Archived project: ${project.name}`
      });
    } else {
      await Project.deleteOne({ _id: req.params.id });
      // Delete associated tasks
      await Task.deleteMany({ project: req.params.id });
      
      await ActivityLog.create({
        user: req.user._id,
        action: "PROJECT_DELETE",
        details: `Deleted project: ${project.name} and all its associated tasks`
      });
    }

    res.status(200).json({ success: true, message: "Project deleted/archived successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
