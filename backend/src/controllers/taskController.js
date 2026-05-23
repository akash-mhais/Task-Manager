const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const Notification = require("../models/Notification");
const ActivityLog = require("../models/ActivityLog");
const { getProductivityInsights, suggestTaskPriority } = require("../services/ai");

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot access tasks" });
    }
    const { project, status, priority, assignedTo, search } = req.query;
    let query = {};

    // RBAC logic to filter tasks
    if (req.user.role === "Team Leader") {
      const tlProjects = await Project.find({ teamMembers: req.user._id }).select("_id");
      query.project = { $in: tlProjects.map(p => p._id) };
    } else if (req.user.role === "Employee") {
      query.assignedTo = req.user._id;
    }

    // Overwrite project filter if provided and user has access
    if (project) {
      query.project = project;
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { taskId: { $regex: search, $options: "i" } }
      ];
    }

    const tasks = await Task.find(query)
      .populate("project", "name plannedEndDate plannedStartDate status manager")
      .populate("assignedTo", "name email role department avatar performanceScore")
      .populate("assignedBy", "name email role")
      .sort({ createdAt: -1 });

    // Suggest smart priority on-the-fly for active tasks using AI Heuristics
    const tasksWithSuggestions = tasks.map(task => {
      const aiSuggestion = suggestTaskPriority(task);
      return {
        ...task.toObject(),
        aiSuggestion
      };
    });

    res.status(200).json({ success: true, count: tasksWithSuggestions.length, tasks: tasksWithSuggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot access tasks" });
    }
    const task = await Task.findById(req.params.id)
      .populate({
        path: "project",
        select: "name plannedEndDate plannedStartDate status teamMembers",
        populate: {
          path: "teamMembers",
          select: "name email role department avatar"
        }
      })
      .populate("assignedTo", "name email role department designation avatar performanceScore")
      .populate("assignedBy", "name email role")
      .populate("comments.author", "name role avatar")
      .populate("workLogs.employee", "name role")
      .populate("attachments.uploadedBy", "name role");

    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    // RBAC authorization checks
    if (req.user.role === "Employee" && task.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Access denied to this task" });
    }

    const aiSuggestion = suggestTaskPriority(task);

    res.status(200).json({
      success: true,
      task: {
        ...task.toObject(),
        aiSuggestion
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private (Admin, Manager, Team Leader)
exports.createTask = async (req, res) => {
  const { title, description, project, assignedTo, priority, startDate, dueDate, estimatedHours, checklist } = req.body;

  if (!title || !description || !project || !assignedTo || !startDate || !dueDate) {
    return res.status(400).json({ success: false, error: "Please fill in all task fields" });
  }

  try {
    // Verify user role permissions
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot create tasks" });
    }
    if (req.user.role === "Employee") {
      return res.status(403).json({ success: false, error: "Employees cannot create tasks" });
    }

    const targetProject = await Project.findById(project);
    if (!targetProject) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }

    const task = await Task.create({
      title,
      description,
      project,
      assignedTo,
      assignedBy: req.user._id,
      priority: priority || "Medium",
      startDate,
      dueDate,
      estimatedHours: estimatedHours || 0,
      checklist: checklist || []
    });

    // Notify assignee
    await Notification.create({
      recipient: assignedTo,
      title: "New Task Assigned",
      message: `You have been assigned task: [${task.title}] by ${req.user.name}`,
      type: "TaskAssigned",
      link: `/tasks/${task._id}`
    });

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: "TASK_CREATE",
      details: `Created task '${title}' assigned to ${assignedTo} on project '${targetProject.name}'`
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a task (status, assign, details)
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot edit tasks" });
    }
    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    // RBAC validation: Employees can only update task status. Admin/Manager/TL can edit everything.
    const { title, description, assignedTo, priority, status, startDate, dueDate, estimatedHours, checklist } = req.body;
    const oldStatus = task.status;

    const oldAssignedTo = task.assignedTo ? task.assignedTo.toString() : "";

    if (req.user.role === "Employee") {
      if (task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, error: "You can only update status of your own tasks" });
      }
      
      if (status) {
        task.status = status;
      }
    } else {
      // Admin, Manager, TL can update everything
      task.title = title || task.title;
      task.description = description || task.description;
      task.assignedTo = assignedTo || task.assignedTo;
      task.priority = priority || task.priority;
      task.status = status || task.status;
      task.startDate = startDate || task.startDate;
      task.dueDate = dueDate || task.dueDate;
      task.estimatedHours = estimatedHours !== undefined ? estimatedHours : task.estimatedHours;
      if (checklist !== undefined) {
        task.checklist = checklist;
      }

      if (assignedTo && assignedTo.toString() !== oldAssignedTo) {
        task.activityHistory.push({
          action: `Reassigned task to user ${assignedTo}`,
          performedBy: req.user._id,
          timestamp: new Date()
        });
      }
    }


    // Track status change activity and notifications
    if (status && status !== oldStatus) {
      task.activityHistory.push({
        action: `Status changed from '${oldStatus}' to '${status}'`,
        performedBy: req.user._id,
        timestamp: new Date()
      });

      // Handle Task Completion details
      if (status === "Completed") {
        task.completionDate = new Date();
        
        // Sum up total hours logged in work logs
        const loggedHours = task.workLogs.reduce((sum, w) => sum + w.hoursLogged, 0);
        task.totalCompletionTime = loggedHours;

        // Notify Assigner
        await Notification.create({
          recipient: task.assignedBy,
          title: "Task Completed",
          message: `Task: [${task.title}] was marked as completed by ${req.user.name}`,
          type: "TaskCompleted",
          link: `/tasks/${task._id}`
        });

        // Trigger Employee performance score recalculation & storage
        const employeeId = task.assignedTo;
        const employee = await User.findById(employeeId);
        if (employee) {
          const employeeTasks = await Task.find({ assignedTo: employeeId });
          // Temporarily merge updated status to calculate score
          const updatedEmployeeTasks = employeeTasks.map(t => 
            t._id.toString() === task._id.toString() ? { ...t.toObject(), status: "Completed", completionDate: new Date() } : t
          );
          
          const performanceInfo = getProductivityInsights(employee, updatedEmployeeTasks);
          employee.performanceScore = performanceInfo.score;
          await employee.save();
        }
      }

      // Check if task status became delayed
      if (status === "Delayed") {
        await Notification.create({
          recipient: task.assignedBy,
          title: "Task Delayed",
          message: `Task: [${task.title}] has been marked as Delayed`,
          type: "Overdue",
          link: `/tasks/${task._id}`
        });
      }
    }

    await task.save();

    if (task.assignedTo.toString() !== oldAssignedTo) {
      await Notification.create({
        recipient: task.assignedTo,
        title: "Task Reassigned",
        message: `You have been assigned task: [${task.title}] by ${req.user.name}`,
        type: "TaskAssigned",
        link: `/tasks/${task._id}`
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      action: "TASK_UPDATE",
      details: `Updated task '${task.title}' (ID: ${task.taskId}, Status: ${task.status})`
    });

    res.status(200).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Post comment on task
// @route   POST /api/tasks/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: "Please enter a comment" });
  }

  try {
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot add comments to tasks" });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const comment = {
      author: req.user._id,
      text: text,
      createdAt: new Date()
    };

    task.comments.push(comment);
    
    // Add to activity history
    task.activityHistory.push({
      action: "Added comment",
      performedBy: req.user._id,
      timestamp: new Date()
    });

    await task.save();

    // Notify other party (if employee commented, notify assigner; if manager commented, notify assignee)
    const recipient = req.user._id.toString() === task.assignedTo.toString() ? task.assignedBy : task.assignedTo;
    await Notification.create({
      recipient,
      title: "New Comment on Task",
      message: `${req.user.name} commented: "${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`,
      type: "ProjectUpdated",
      link: `/tasks/${task._id}`
    });

    res.status(201).json({ success: true, comments: task.comments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add work log
// @route   POST /api/tasks/:id/worklogs
// @access  Private
exports.logWork = async (req, res) => {
  const { hoursLogged, description, date } = req.body;

  if (!hoursLogged || !description) {
    return res.status(400).json({ success: false, error: "Please provide hours logged and work description" });
  }

  try {
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot log work to tasks" });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const workLog = {
      employee: req.user._id,
      hoursLogged: parseFloat(hoursLogged),
      description: description,
      date: date || new Date()
    };

    task.workLogs.push(workLog);

    // Increment estimated total completion time
    const currentLoggedHours = task.workLogs.reduce((sum, w) => sum + w.hoursLogged, 0);
    task.totalCompletionTime = currentLoggedHours;

    task.activityHistory.push({
      action: `Logged ${hoursLogged} hours of work`,
      performedBy: req.user._id,
      timestamp: new Date()
    });

    await task.save();

    await ActivityLog.create({
      user: req.user._id,
      action: "TASK_WORKLOG",
      details: `Logged ${hoursLogged} hours on task '${task.title}'`
    });

    res.status(201).json({ success: true, workLogs: task.workLogs, totalCompletionTime: task.totalCompletionTime });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Upload attachment file to task
// @route   POST /api/tasks/:id/attachments
// @access  Private
exports.uploadAttachment = async (req, res) => {
  try {
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot upload task attachments" });
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Please upload a file" });
    }

    const attachment = {
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    task.attachments.push(attachment);

    task.activityHistory.push({
      action: `Uploaded file '${req.file.originalname}'`,
      performedBy: req.user._id,
      timestamp: new Date()
    });

    await task.save();

    await ActivityLog.create({
      user: req.user._id,
      action: "TASK_ATTACHMENT_UPLOAD",
      details: `Uploaded work file '${req.file.originalname}' to task '${task.title}'`
    });

    res.status(200).json({ success: true, attachments: task.attachments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Submit task (Employees only)
// @route   PUT /api/tasks/:id/submit
// @access  Private
exports.submitTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    // Verify task is assigned to the logged-in user
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Access denied: You can only submit your own tasks" });
    }

    const { checklist, submissionDetails } = req.body;

    task.status = "Completed";
    task.completionDate = new Date();
    task.submissionDate = new Date(); // Server-side fetched current date
    task.submissionDetails = submissionDetails || "";

    if (checklist && Array.isArray(checklist)) {
      // Map checkbox statuses to the task's checklist
      task.checklist = checklist.map(item => ({
        text: item.text,
        isCompleted: !!item.isCompleted
      }));
    }

    // Sum up total hours logged in work logs
    const loggedHours = task.workLogs.reduce((sum, w) => sum + w.hoursLogged, 0);
    task.totalCompletionTime = loggedHours;

    task.activityHistory.push({
      action: "Task submitted and marked Completed",
      performedBy: req.user._id,
      timestamp: new Date()
    });

    await task.save();

    // Recalculate employee performance score
    const employeeId = task.assignedTo;
    const employee = await User.findById(employeeId);
    if (employee) {
      const employeeTasks = await Task.find({ assignedTo: employeeId });
      const updatedEmployeeTasks = employeeTasks.map(t => 
        t._id.toString() === task._id.toString() ? { ...t.toObject(), status: "Completed", completionDate: new Date() } : t
      );
      
      const performanceInfo = getProductivityInsights(employee, updatedEmployeeTasks);
      employee.performanceScore = performanceInfo.score;
      await employee.save();
    }

    // Notify Assigner
    await Notification.create({
      recipient: task.assignedBy,
      title: "Task Submitted",
      message: `Task: [${task.title}] was submitted by ${req.user.name}`,
      type: "TaskCompleted",
      link: `/tasks/${task._id}`
    });

    await ActivityLog.create({
      user: req.user._id,
      action: "TASK_SUBMIT",
      details: `Submitted task '${task.title}' (ID: ${task.taskId})`
    });

    res.status(200).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

