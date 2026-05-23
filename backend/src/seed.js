const mongoose = require("mongoose");
const dns = require("dns");
// Set fallback DNS servers (resolves SRV record query ETIMEOUT issues on some local routers)
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const dotenv = require("dotenv");
const User = require("./models/User");
const Project = require("./models/Project");
const Task = require("./models/Task");
const ActivityLog = require("./models/ActivityLog");
const Notification = require("./models/Notification");
const Message = require("./models/Message");

dotenv.config();

const seedData = async () => {
  try {
    const connStr = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/workflow_pro";
    
    // Securely mask both username and password in logs
    const maskedConnStr = connStr.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    console.log(`Connecting to database for seeding: ${maskedConnStr}`);
    
    await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000 // Fail fast if Atlas is unreachable
    });
    console.log("Database connected. Cleaning existing collections...");

    // Clear all data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await ActivityLog.deleteMany({});
    await Notification.deleteMany({});
    await Message.deleteMany({});

    console.log("Creating default user accounts...");

    // Create Admin
    const admin = await User.create({
      employeeId: "EMP-1001",
      name: "Sanjay Kumar",
      email: "admin@faithautomation.com",
      mobile: "+919876543210",
      password: "AdminPassword123!",
      role: "Admin",
      department: "Management",
      designation: "Chief Technology Officer",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
    });

    // Create Manager
    const manager = await User.create({
      employeeId: "EMP-1002",
      name: "Sophia Vance",
      email: "manager@faithautomation.com",
      mobile: "+919876543211",
      password: "ManagerPassword123!",
      role: "Manager",
      department: "Delivery",
      designation: "Senior Project Manager",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
    });

    // Create Team Leader
    const leader = await User.create({
      employeeId: "EMP-1003",
      name: "Alex Mercer",
      email: "tl@faithautomation.com",
      mobile: "+919876543212",
      password: "LeaderPassword123!",
      role: "Team Leader",
      department: "Engineering",
      designation: "Technical Lead",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    });

    // Create Employees
    const employee1 = await User.create({
      employeeId: "EMP-1004",
      name: "Jane Doe",
      email: "employee@faithautomation.com",
      mobile: "+919876543213",
      password: "EmployeePassword123!",
      role: "Employee",
      department: "Engineering",
      designation: "Software Engineer",
      performanceScore: 88,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
    });

    const employee2 = await User.create({
      employeeId: "EMP-1005",
      name: "Ryan Gosling",
      email: "ryan@faithautomation.com",
      mobile: "+919876543214",
      password: "EmployeePassword123!",
      role: "Employee",
      department: "Design",
      designation: "UI/UX Designer",
      performanceScore: 92,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
    });

    console.log("Users created successfully. Creating projects...");

    // Create Projects
    const project1 = await Project.create({
      name: "E-Commerce Replatforming",
      description: "Migrating legacy monolithic web application to headless React frontend with Node.js microservices.",
      clientName: "Global Retail Corp",
      priority: "Critical",
      status: "On Track",
      plannedStartDate: new Date("2026-05-01"),
      plannedEndDate: new Date("2026-06-30"),
      budget: 150000,
      manager: manager._id,
      teamMembers: [leader._id, employee1._id, employee2._id]
    });

    const project2 = await Project.create({
      name: "Workflow Mobile CRM App",
      description: "Developing cross-platform React Native CRM mobile app for sales agents in the field.",
      clientName: "Acme Sales Inc",
      priority: "High",
      status: "At Risk",
      plannedStartDate: new Date("2026-04-15"),
      plannedEndDate: new Date("2026-06-15"),
      budget: 85000,
      manager: manager._id,
      teamMembers: [leader._id, employee1._id]
    });

    console.log("Projects created successfully. Creating tasks...");

    // Tasks for Project 1
    const task1 = await Task.create({
      title: "Design System Figma Mockups",
      description: "Create visual token libraries and landing page styleguide grids for new brand identity.",
      project: project1._id,
      assignedBy: manager._id,
      assignedTo: employee2._id,
      priority: "High",
      status: "Completed",
      startDate: new Date("2026-05-02"),
      dueDate: new Date("2026-05-10"),
      completionDate: new Date("2026-05-09"),
      estimatedHours: 40,
      totalCompletionTime: 36,
      workLogs: [
        { employee: employee2._id, hoursLogged: 16, description: "Color palettes and typography mapping", date: new Date("2026-05-04") },
        { employee: employee2._id, hoursLogged: 20, description: "Finalizing responsive grid systems", date: new Date("2026-05-08") }
      ]
    });

    const task2 = await Task.create({
      title: "Develop Backend REST Auth API",
      description: "Configure JWT authentication, password hashing, and user profile management microservice.",
      project: project1._id,
      assignedBy: leader._id,
      assignedTo: employee1._id,
      priority: "Critical",
      status: "In Progress",
      startDate: new Date("2026-05-12"),
      dueDate: new Date("2026-05-25"),
      estimatedHours: 24,
      workLogs: [
        { employee: employee1._id, hoursLogged: 8, description: "Schema models design and hashing pre-hooks", date: new Date("2026-05-18") }
      ]
    });

    const task3 = await Task.create({
      title: "Dockerize microservices & DB config",
      description: "Setup unified docker-compose environment for fast developer onboarding.",
      project: project1._id,
      assignedBy: leader._id,
      assignedTo: employee1._id,
      priority: "Medium",
      status: "Not Started",
      startDate: new Date("2026-05-20"),
      dueDate: new Date("2026-05-28"),
      estimatedHours: 12
    });

    // Tasks for Project 2 (Mobile CRM)
    const task4 = await Task.create({
      title: "Configure Push Notification Services",
      description: "Integrate Firebase Cloud Messaging (FCM) and APNS profiles for native client.",
      project: project2._id,
      assignedBy: manager._id,
      assignedTo: employee1._id,
      priority: "High",
      status: "Delayed",
      startDate: new Date("2026-04-20"),
      dueDate: new Date("2026-05-10"), // Overdue task!
      estimatedHours: 16,
      workLogs: [
        { employee: employee1._id, hoursLogged: 12, description: "APNS cert config and device token database mappings", date: new Date("2026-05-02") }
      ]
    });

    // Create Activity Logs
    await ActivityLog.create({
      user: admin._id,
      action: "SYSTEM_SEEDED",
      details: "Database populated with standard roles, projects, and initial tracking items."
    });

    // Create standard notifications
    await Notification.create({
      recipient: employee1._id,
      title: "Overdue Task Warning",
      message: "Task 'Configure Push Notification Services' is past its due date. Update progress.",
      type: "Overdue",
      link: `/tasks/${task4._id}`
    });

    await Notification.create({
      recipient: leader._id,
      title: "New Project Team Lead",
      message: "You have been assigned as Team Leader for 'Workflow Mobile CRM App'",
      type: "ProjectUpdated",
      link: `/projects/${project2._id}`
    });

    // Add a chat message
    await Message.create({
      project: project1._id,
      sender: leader._id,
      message: "Welcome team! Let's start the replatforming sprints. Jane, check the Auth API task."
    });

    await Message.create({
      project: project1._id,
      sender: employee1._id,
      message: "Sure Alex, I've already set up the Mongoose schemas and brypt pre-hooks."
    });

    console.log("Database seeded successfully!");
    mongoose.disconnect();
  } catch (error) {
    console.error("Seeding failed:", error);
    mongoose.disconnect();
  }
};

seedData();
