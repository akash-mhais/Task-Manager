const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Global store to persist data across requests during runtime
global.mockDbStore = {
  User: [],
  Project: [],
  Task: [],
  ActivityLog: [],
  Notification: [],
  Message: []
};

// Helper to evaluate value (handles ObjectIds, Dates, and plain values)
function evaluateVal(val) {
  if (val && val._id) return val._id.toString();
  if (val && typeof val === "object" && val.toString && !(val instanceof Date)) {
    return val.toString();
  }
  return val;
}

// Helper to match mongo-like queries
function matchesQuery(doc, query) {
  if (!query) return true;
  for (const key of Object.keys(query)) {
    if (key === "$or") {
      if (!Array.isArray(query.$or)) continue;
      let matched = false;
      for (const subQuery of query.$or) {
        if (matchesQuery(doc, subQuery)) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
      continue;
    }
    if (key === "$and") {
      if (!Array.isArray(query.$and)) continue;
      for (const subQuery of query.$and) {
        if (!matchesQuery(doc, subQuery)) return false;
      }
      continue;
    }

    const val = query[key];
    const docVal = doc[key];

    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof mongoose.Types.ObjectId)) {
      // Operator like $ne, $in, $nin, $regex, $lt, $lte, $gt, $gte
      for (const op of Object.keys(val)) {
        const opVal = val[op];
        if (op === "$ne") {
          if (evaluateVal(docVal) === evaluateVal(opVal)) return false;
        } else if (op === "$in") {
          const list = Array.isArray(opVal) ? opVal.map(evaluateVal) : [];
          // Handle arrays in docVal (e.g. teamMembers)
          if (Array.isArray(docVal)) {
            const docValList = docVal.map(evaluateVal);
            if (!docValList.some(item => list.includes(item))) return false;
          } else {
            if (!list.includes(evaluateVal(docVal))) return false;
          }
        } else if (op === "$nin") {
          const list = Array.isArray(opVal) ? opVal.map(evaluateVal) : [];
          if (list.includes(evaluateVal(docVal))) return false;
        } else if (op === "$regex") {
          const regex = new RegExp(opVal, val.$options || "i");
          if (!regex.test(docVal || "")) return false;
        } else if (op === "$lt") {
          if (!(new Date(docVal) < new Date(opVal))) return false;
        } else if (op === "$lte") {
          if (!(new Date(docVal) <= new Date(opVal))) return false;
        } else if (op === "$gt") {
          if (!(new Date(docVal) > new Date(opVal))) return false;
        } else if (op === "$gte") {
          if (!(new Date(docVal) >= new Date(opVal))) return false;
        }
      }
    } else {
      // Direct match
      if (Array.isArray(docVal)) {
        const docValList = docVal.map(evaluateVal);
        if (!docValList.includes(evaluateVal(val))) return false;
      } else {
        if (evaluateVal(docVal) !== evaluateVal(val)) return false;
      }
    }
  }
  return true;
}

// Find referenced document from global store
function findRefDocument(id) {
  if (!id) return null;
  const idStr = id.toString();
  for (const modelName of Object.keys(global.mockDbStore)) {
    const found = global.mockDbStore[modelName].find(d => d._id.toString() === idStr);
    if (found) {
      return found.toObject ? found.toObject() : JSON.parse(JSON.stringify(found));
    }
  }
  return null;
}

// Helper to populate fields recursively based on spec
function populateSpecHelper(doc, spec) {
  if (!doc || !spec) return;
  const path = typeof spec === "string" ? spec : spec.path;
  if (!path || typeof path !== "string") return;

  const paths = path.split(" ");
  for (const p of paths) {
    if (!p) continue;
    
    const refVal = doc._doc ? doc._doc[p] : doc[p];
    if (refVal === undefined || refVal === null) continue;

    let populatedVal = null;
    if (Array.isArray(refVal)) {
      populatedVal = refVal.map(id => findRefDocument(id)).filter(Boolean);
    } else {
      populatedVal = findRefDocument(refVal);
    }

    if (populatedVal !== null) {
      if (!doc._populatedFields) {
        doc._populatedFields = {};
      }
      doc._populatedFields[p] = populatedVal;

      Object.defineProperty(doc, p, {
        value: populatedVal,
        writable: true,
        configurable: true,
        enumerable: true
      });

      if (spec.populate) {
        if (Array.isArray(populatedVal)) {
          for (const item of populatedVal) {
            populateSpecHelper(item, spec.populate);
          }
        } else {
          populateSpecHelper(populatedVal, spec.populate);
        }
      }
    }
  }
}

// Mock Query Class to mimic Mongoose Query chain (.populate, .sort, .limit, .skip, etc.)
class MockQuery {
  constructor(modelName, executor, singleResult = false) {
    this.modelName = modelName;
    this.executor = executor;
    this.singleResult = singleResult;
    this.populates = [];
    this.sortFields = null;
    this.limitVal = null;
    this.skipVal = null;
    this.selectFields = null;
  }

  populate(path, select) {
    if (typeof path === "object" && path !== null) {
      this.populates.push(path);
    } else {
      this.populates.push({ path, select });
    }
    return this;
  }

  sort(fields) {
    this.sortFields = fields;
    return this;
  }

  limit(val) {
    this.limitVal = val;
    return this;
  }

  skip(val) {
    this.skipVal = val;
    return this;
  }

  select(fields) {
    this.selectFields = fields;
    return this;
  }

  async exec() {
    let result = this.executor();

    // Sorting
    if (this.sortFields) {
      let sortKey = "";
      let sortOrder = 1;
      if (typeof this.sortFields === "string") {
        if (this.sortFields.startsWith("-")) {
          sortKey = this.sortFields.substring(1);
          sortOrder = -1;
        } else {
          sortKey = this.sortFields;
          sortOrder = 1;
        }
      } else if (typeof this.sortFields === "object") {
        sortKey = Object.keys(this.sortFields)[0];
        sortOrder = this.sortFields[sortKey];
      }

      if (sortKey) {
        result.sort((a, b) => {
          let valA = a[sortKey];
          let valB = b[sortKey];
          
          if (valA instanceof Date) valA = valA.getTime();
          if (valB instanceof Date) valB = valB.getTime();

          if (valA < valB) return -1 * sortOrder;
          if (valA > valB) return 1 * sortOrder;
          return 0;
        });
      }
    }

    // Skip & Limit
    if (this.skipVal) {
      result = result.slice(this.skipVal);
    }
    if (this.limitVal !== null && this.limitVal !== undefined) {
      result = result.slice(0, this.limitVal);
    }

    // Population
    for (const pop of this.populates) {
      for (const doc of result) {
        populateSpecHelper(doc, pop);
      }
    }

    // Handle single result vs array result
    if (this.singleResult) {
      return result.length > 0 ? result[0] : null;
    }

    return result;
  }

  then(onfulfilled, onrejected) {
    return this.exec().then(onfulfilled, onrejected);
  }
}

// Function to replace Mongoose Model methods with In-Memory engine
function setupMockDb(mongooseInstance) {
  // Override mongoose.connect
  mongooseInstance.connect = async function() {
    console.log("Mock Connection: In-Memory DB enabled.");
    return mongooseInstance.connection;
  };

  // Mock connection object
  mongooseInstance.connection = {
    on: () => {},
    once: (event, cb) => { if (event === "open" || event === "connected") cb(); },
    close: async () => {},
    db: {
      admin: () => ({
        ping: async () => true
      })
    }
  };

  // Override Save instance method
  mongooseInstance.Model.prototype.save = async function() {
    const modelName = this.constructor.modelName;

    // Run password hook manually
    if (modelName === "User" && this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Auto-generate taskId for Tasks in mock mode
    if (modelName === "Task" && !this.taskId) {
      const list = global.mockDbStore.Task || [];
      this.taskId = `WFP-${list.length + 1001}`;
      if (!this.activityHistory) {
        this.activityHistory = [];
      }
      if (this.activityHistory.length === 0) {
        this.activityHistory.push({
          action: "Task created",
          performedBy: this.assignedBy,
          timestamp: new Date()
        });
      }
    }

    if (!this._id) {
      this._id = new mongooseInstance.Types.ObjectId();
    }
    if (!this.createdAt) {
      this.createdAt = new Date();
      this.updatedAt = new Date();
    } else {
      this.updatedAt = new Date();
    }

    const list = global.mockDbStore[modelName];
    const index = list.findIndex(d => d._id.toString() === this._id.toString());
    if (index !== -1) {
      list[index] = this;
    } else {
      list.push(this);
    }
    return this;
  };

  // Override toObject
  mongooseInstance.Model.prototype.toObject = function() {
    const obj = { ...this._doc };
    obj._id = this._id;
    if (this._populatedFields) {
      for (const key of Object.keys(this._populatedFields)) {
        const val = this._populatedFields[key];
        if (Array.isArray(val)) {
          obj[key] = val.map(v => (v && typeof v === "object" && v.toObject) ? v.toObject() : v);
        } else if (val && typeof val === "object" && val.toObject) {
          obj[key] = val.toObject();
        } else {
          obj[key] = val;
        }
      }
    }
    return obj;
  };

  // Overrides for static Model methods
  mongooseInstance.Model.find = function(query) {
    return new MockQuery(this.modelName, () => {
      const list = global.mockDbStore[this.modelName] || [];
      return list.filter(doc => matchesQuery(doc, query));
    });
  };

  mongooseInstance.Model.findOne = function(query) {
    return new MockQuery(this.modelName, () => {
      const list = global.mockDbStore[this.modelName] || [];
      return list.filter(doc => matchesQuery(doc, query));
    }, true);
  };

  mongooseInstance.Model.findById = function(id) {
    return new MockQuery(this.modelName, () => {
      const list = global.mockDbStore[this.modelName] || [];
      return list.filter(doc => doc._id && doc._id.toString() === (id ? id.toString() : ""));
    }, true);
  };

  mongooseInstance.Model.countDocuments = async function(query) {
    const list = global.mockDbStore[this.modelName] || [];
    return list.filter(doc => matchesQuery(doc, query)).length;
  };

  mongooseInstance.Model.create = async function(data) {
    const modelName = this.modelName;
    const createSingle = async (item) => {
      const doc = new this(item);
      await doc.save();
      return doc;
    };

    if (Array.isArray(data)) {
      const docs = [];
      for (const item of data) {
        docs.push(await createSingle(item));
      }
      return docs;
    } else {
      return await createSingle(data);
    }
  };

  mongooseInstance.Model.insertMany = async function(data) {
    const modelName = this.modelName;
    const createSingle = async (item) => {
      const doc = new this(item);
      await doc.save();
      return doc;
    };

    const docs = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        docs.push(await createSingle(item));
      }
    } else {
      docs.push(await createSingle(data));
    }
    return docs;
  };

  mongooseInstance.Model.findByIdAndUpdate = function(id, update, options = {}) {
    return new MockQuery(this.modelName, () => {
      const list = global.mockDbStore[this.modelName] || [];
      const doc = list.find(d => d._id && d._id.toString() === (id ? id.toString() : ""));
      if (!doc) return [];
      
      const fields = update.$set || update;
      for (const key of Object.keys(fields)) {
        if (key.startsWith("$")) continue;
        doc[key] = fields[key];
      }
      
      doc.updatedAt = new Date();
      return [doc];
    }, true);
  };

  mongooseInstance.Model.findByIdAndDelete = function(id) {
    return new MockQuery(this.modelName, () => {
      const list = global.mockDbStore[this.modelName] || [];
      const index = list.findIndex(d => d._id && d._id.toString() === (id ? id.toString() : ""));
      if (index === -1) return [];
      const deleted = list.splice(index, 1);
      return deleted;
    }, true);
  };

  mongooseInstance.Model.deleteMany = async function(query) {
    const list = global.mockDbStore[this.modelName] || [];
    if (!query || Object.keys(query).length === 0) {
      const count = list.length;
      global.mockDbStore[this.modelName] = [];
      return { deletedCount: count };
    }
    const remaining = list.filter(doc => !matchesQuery(doc, query));
    const deletedCount = list.length - remaining.length;
    global.mockDbStore[this.modelName] = remaining;
    return { deletedCount };
  };

  mongooseInstance.Model.deleteOne = async function(query) {
    const list = global.mockDbStore[this.modelName] || [];
    const index = list.findIndex(doc => matchesQuery(doc, query));
    if (index !== -1) {
      list.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  };

  mongooseInstance.Model.updateMany = async function(query, update) {
    const list = global.mockDbStore[this.modelName] || [];
    const matches = list.filter(doc => matchesQuery(doc, query));
    const fields = update.$set || update;
    for (const doc of matches) {
      for (const key of Object.keys(fields)) {
        doc[key] = fields[key];
      }
      doc.updatedAt = new Date();
    }
    return { matchedCount: matches.length, modifiedCount: matches.length };
  };

  mongooseInstance.Model.updateOne = async function(query, update) {
    const list = global.mockDbStore[this.modelName] || [];
    const doc = list.find(doc => matchesQuery(doc, query));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    const fields = update.$set || update;
    for (const key of Object.keys(fields)) {
      doc[key] = fields[key];
    }
    doc.updatedAt = new Date();
    return { matchedCount: 1, modifiedCount: 1 };
  };

  // Run the seeding logic inside this running process
  seedInitialData(mongooseInstance);
}

// Function to populate mock database collections with default seed data
async function seedInitialData(mongooseInstance) {
  const User = mongooseInstance.models.User;
  const Project = mongooseInstance.models.Project;
  const Task = mongooseInstance.models.Task;
  const ActivityLog = mongooseInstance.models.ActivityLog;
  const Notification = mongooseInstance.models.Notification;
  const Message = mongooseInstance.models.Message;

  console.log("Seeding in-memory database fallback...");

  try {
    // 1. Create Users
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

    // 2. Create Projects
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

    // 3. Create Tasks
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

    const task4 = await Task.create({
      title: "Configure Push Notification Services",
      description: "Integrate Firebase Cloud Messaging (FCM) and APNS profiles for native client.",
      project: project2._id,
      assignedBy: manager._id,
      assignedTo: employee1._id,
      priority: "High",
      status: "Delayed",
      startDate: new Date("2026-04-20"),
      dueDate: new Date("2026-05-10"),
      estimatedHours: 16,
      workLogs: [
        { employee: employee1._id, hoursLogged: 12, description: "APNS cert config and device token database mappings", date: new Date("2026-05-02") }
      ]
    });

    // 4. Create Activity Logs
    await ActivityLog.create({
      user: admin._id,
      action: "SYSTEM_SEEDED",
      details: "In-memory database populated with standard roles, projects, and initial tracking items."
    });

    // 5. Create standard notifications
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

    // 6. Add chat messages
    await Message.create({
      project: project1._id,
      sender: leader._id,
      message: "Welcome team! Let's start the replatforming sprints. Jane, check the Auth API task."
    });

    await Message.create({
      project: project1._id,
      sender: employee1._id,
      message: "Sure Alex, I've already set up the Mongoose schemas and bcrypt pre-hooks."
    });

    console.log("In-memory database seeded successfully!");
  } catch (error) {
    console.error("In-memory seeding failed:", error);
  }
}

module.exports = setupMockDb;
