const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { balanceWorkload } = require("../services/ai");

// @desc    Get dashboard statistics based on role
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    if (req.user.role === "Admin") {
      return res.status(403).json({ success: false, error: "Admins cannot access dashboard stats" });
    }
    const today = new Date();
    
    // 1. Core counters
    let projectQuery = {};
    let taskQuery = {};
    
    if (req.user.role === "Team Leader") {
      projectQuery.teamMembers = req.user._id;
      const tlProjects = await Project.find({ teamMembers: req.user._id }).select("_id");
      taskQuery.project = { $in: tlProjects.map(p => p._id) };
    } else if (req.user.role === "Employee") {
      projectQuery.teamMembers = req.user._id;
      taskQuery.assignedTo = req.user._id;
    }

    const totalProjects = await Project.countDocuments(projectQuery);
    const totalEmployees = await User.countDocuments({ role: { $ne: "Admin" } });
    
    const activeTasks = await Task.countDocuments({ ...taskQuery, status: { $ne: "Completed" } });
    const completedTasks = await Task.countDocuments({ ...taskQuery, status: "Completed" });
    const delayedTasks = await Task.countDocuments({
      ...taskQuery,
      $or: [
        { status: "Delayed" },
        { status: { $ne: "Completed" }, dueDate: { $lt: today } }
      ]
    });

    const delayedProjects = await Project.countDocuments({ ...projectQuery, status: "Delayed" });

    // 2. Project completion percentages
    const projectsList = await Project.find(projectQuery).select("_id name status plannedEndDate");
    let sumPercentage = 0;
    
    const projectsProgressList = await Promise.all(projectsList.map(async (p) => {
      const allTasks = await Task.find({ project: p._id });
      const doneTasks = allTasks.filter(t => t.status === "Completed").length;
      const pct = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;
      sumPercentage += pct;
      return {
        _id: p._id,
        name: p.name,
        progress: pct,
        status: p.status,
        dueDate: p.plannedEndDate
      };
    }));

    const projectCompletionPercent = totalProjects > 0 ? Math.round(sumPercentage / totalProjects) : 0;

    // 3. Upcoming Deadlines (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const upcomingTasks = await Task.find({
      ...taskQuery,
      status: { $ne: "Completed" },
      dueDate: { $gte: today, $lte: nextWeek }
    })
      .populate("project", "name")
      .populate("assignedTo", "name")
      .sort({ dueDate: 1 })
      .limit(5);

    // 4. Employee Productivity Scores (averages)
    let teamPerformance = [];
    if (req.user.role === "Manager") {
      const employees = await User.find({ role: "Employee" })
        .select("name department designation performanceScore avatar")
        .sort({ performanceScore: -1 });
      
      teamPerformance = employees.slice(0, 5); // top 5
    }

    // 5. Workload balancing suggestions
    let workloadBalancing = [];
    if (req.user.role === "Manager") {
      const activeProjects = await Project.find(projectQuery).select("_id");
      const activeProjTasks = await Task.find({
        project: { $in: activeProjects.map(p => p._id) },
        status: { $ne: "Completed" }
      });
      const team = await User.find({ role: { $in: ["Employee", "Team Leader"] } });
      workloadBalancing = balanceWorkload(team, activeProjTasks);
    }

    // 6. Project Analytics chart data (Tasks state count per project)
    const analyticsChartData = projectsProgressList.slice(0, 6);

    res.status(200).json({
      success: true,
      stats: {
        totalProjects,
        totalEmployees,
        activeTasks,
        completedTasks,
        delayedTasks,
        delayedProjects,
        projectCompletionPercent
      },
      upcomingDeadlines: upcomingTasks,
      topPerformers: teamPerformance,
      workloadBalancing: workloadBalancing.filter(w => w.status === "Overloaded"),
      projectAnalytics: analyticsChartData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Generate report data
// @route   GET /api/analytics/reports
// @access  Private (Admin/Manager)
exports.generateReport = async (req, res) => {
  const { type, projectId } = req.query;

  try {
    if (req.user.role !== "Manager") {
      return res.status(403).json({ success: false, error: "Access denied. Reports are restricted to Managers." });
    }

    let data = [];
    
    if (type === "employee-performance") {
      const employees = await User.find({ role: "Employee" }).select("name employeeId email department designation performanceScore");
      
      data = await Promise.all(employees.map(async (emp) => {
        const tasks = await Task.find({ assignedTo: emp._id });
        const completed = tasks.filter(t => t.status === "Completed").length;
        const active = tasks.filter(t => t.status !== "Completed").length;
        const delayed = tasks.filter(t => t.status === "Delayed").length;
        const totalHours = tasks.reduce((sum, t) => sum + (t.totalCompletionTime || 0), 0);

        return {
          employeeId: emp.employeeId,
          name: emp.name,
          email: emp.email,
          department: emp.department,
          designation: emp.designation,
          productivityScore: emp.performanceScore,
          completedTasks: completed,
          activeTasks: active,
          delayedTasks: delayed,
          totalHoursLogged: totalHours
        };
      }));
    } else if (type === "project-status") {
      const projects = await Project.find({}).populate("manager", "name").populate("teamMembers", "name");
      
      data = await Promise.all(projects.map(async (p) => {
        const tasks = await Task.find({ project: p._id });
        const completed = tasks.filter(t => t.status === "Completed").length;
        const total = tasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const delayedTasks = tasks.filter(t => t.status === "Delayed").length;

        return {
          projectName: p.name,
          clientName: p.clientName,
          priority: p.priority,
          status: p.status,
          manager: p.manager ? p.manager.name : "Unassigned",
          teamSize: p.teamMembers.length,
          totalTasks: total,
          completedTasks: completed,
          progressPercent: progress,
          delayedTasks: delayedTasks,
          budget: p.budget
        };
      }));
    } else if (type === "delay-report") {
      const today = new Date();
      // Delayed tasks or overdue tasks
      const delayedTasks = await Task.find({
        $or: [
          { status: "Delayed" },
          { status: { $ne: "Completed" }, dueDate: { $lt: today } }
        ]
      })
        .populate("project", "name")
        .populate("assignedTo", "name department");

      data = delayedTasks.map(t => {
        const due = new Date(t.dueDate);
        const daysDelayed = Math.max(0, Math.ceil((today - due) / (1000 * 60 * 60 * 24)));
        return {
          taskId: t.taskId,
          taskTitle: t.title,
          project: t.project ? t.project.name : "Unknown",
          assignee: t.assignedTo ? t.assignedTo.name : "Unassigned",
          department: t.assignedTo ? t.assignedTo.department : "Unknown",
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          daysDelayed
        };
      });
    } else if (type === "audit-activities") {
      // Fetch activity logs
      const logs = await ActivityLog.find({})
        .populate("user", "name email role")
        .sort({ timestamp: -1 })
        .limit(100);

      data = logs.map(l => ({
        timestamp: l.timestamp,
        user: l.user ? l.user.name : "System",
        email: l.user ? l.user.email : "system",
        role: l.user ? l.user.role : "System",
        action: l.action,
        details: l.details,
        ipAddress: l.ipAddress || "N/A"
      }));
    } else {
      return res.status(400).json({ success: false, error: "Invalid report type specified" });
    }

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Export report as CSV
// @route   GET /api/analytics/reports/export
// @access  Private (Admin/Manager)
exports.exportReportCSV = async (req, res) => {
  const { type } = req.query;

  try {
    if (req.user.role !== "Manager") {
      return res.status(403).json({ success: false, error: "Access denied. Reports are restricted to Managers." });
    }

    // Call internal function to generate data
    req.query.type = type;
    
    // Mimic the logic of generateReport
    let reportData = [];
    let headers = [];
    let fileName = `report_${type || "data"}.csv`;

    if (type === "employee-performance") {
      const employees = await User.find({ role: "Employee" });
      reportData = await Promise.all(employees.map(async (emp) => {
        const tasks = await Task.find({ assignedTo: emp._id });
        return {
          "Employee ID": emp.employeeId,
          "Name": emp.name,
          "Email": emp.email,
          "Department": emp.department,
          "Designation": emp.designation,
          "Productivity Score": emp.performanceScore,
          "Completed Tasks": tasks.filter(t => t.status === "Completed").length,
          "Active Tasks": tasks.filter(t => t.status !== "Completed").length,
          "Delayed Tasks": tasks.filter(t => t.status === "Delayed").length,
          "Total Hours Logged": tasks.reduce((sum, t) => sum + (t.totalCompletionTime || 0), 0)
        };
      }));
      headers = ["Employee ID", "Name", "Email", "Department", "Designation", "Productivity Score", "Completed Tasks", "Active Tasks", "Delayed Tasks", "Total Hours Logged"];
    } else if (type === "project-status") {
      const projects = await Project.find({}).populate("manager", "name");
      reportData = await Promise.all(projects.map(async (p) => {
        const tasks = await Task.find({ project: p._id });
        const completed = tasks.filter(t => t.status === "Completed").length;
        const total = tasks.length;
        return {
          "Project Name": p.name,
          "Client Name": p.clientName,
          "Priority": p.priority,
          "Status": p.status,
          "Manager": p.manager ? p.manager.name : "Unassigned",
          "Total Tasks": total,
          "Completed Tasks": completed,
          "Progress %": total > 0 ? Math.round((completed / total) * 100) : 0,
          "Delayed Tasks": tasks.filter(t => t.status === "Delayed").length,
          "Budget": p.budget
        };
      }));
      headers = ["Project Name", "Client Name", "Priority", "Status", "Manager", "Total Tasks", "Completed Tasks", "Progress %", "Delayed Tasks", "Budget"];
    } else if (type === "delay-report") {
      const today = new Date();
      const delayedTasks = await Task.find({
        $or: [
          { status: "Delayed" },
          { status: { $ne: "Completed" }, dueDate: { $lt: today } }
        ]
      })
        .populate("project", "name")
        .populate("assignedTo", "name department");

      reportData = delayedTasks.map(t => {
        const due = new Date(t.dueDate);
        const daysDelayed = Math.max(0, Math.ceil((today - due) / (1000 * 60 * 60 * 24)));
        return {
          "Task ID": t.taskId,
          "Title": t.title,
          "Project": t.project ? t.project.name : "Unknown",
          "Assignee": t.assignedTo ? t.assignedTo.name : "Unassigned",
          "Department": t.assignedTo ? t.assignedTo.department : "Unknown",
          "Priority": t.priority,
          "Status": t.status,
          "Due Date": t.dueDate.toISOString().split("T")[0],
          "Days Overdue": daysDelayed
        };
      });
      headers = ["Task ID", "Title", "Project", "Assignee", "Department", "Priority", "Status", "Due Date", "Days Overdue"];
    } else if (type === "audit-activities") {
      const logs = await ActivityLog.find({}).populate("user", "name role").sort({ timestamp: -1 });
      reportData = logs.map(l => ({
        "Timestamp": l.timestamp.toISOString(),
        "User": l.user ? l.user.name : "System",
        "Role": l.user ? l.user.role : "System",
        "Action": l.action,
        "Details": l.details,
        "IP Address": l.ipAddress || "N/A"
      }));
      headers = ["Timestamp", "User", "Role", "Action", "Details", "IP Address"];
    } else {
      return res.status(400).json({ success: false, error: "Invalid report type" });
    }

    // Generate CSV string
    let csvContent = headers.join(",") + "\n";
    reportData.forEach(row => {
      const values = headers.map(header => {
        let val = row[header];
        if (val === undefined || val === null) return "";
        val = String(val).replace(/"/g, '""'); // escape double quotes
        return `"${val}"`;
      });
      csvContent += values.join(",") + "\n";
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
