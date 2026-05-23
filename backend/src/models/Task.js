const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  taskId: { type: String, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  status: { type: String, enum: ["Not Started", "In Progress", "On Hold", "Completed", "Delayed"], default: "Not Started" },
  startDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  completionDate: { type: Date },
  checklist: [{
    text: { type: String, required: true },
    isCompleted: { type: Boolean, default: false }
  }],
  submissionDetails: { type: String },
  submissionDate: { type: Date },
  estimatedHours: { type: Number, default: 0 },
  totalCompletionTime: { type: Number, default: 0 }, // logged hours sum
  attachments: [{
    name: { type: String },
    url: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  activityHistory: [{
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  workLogs: [{
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    hoursLogged: { type: Number, required: true },
    description: { type: String, required: true }
  }]
}, { timestamps: true });

// Auto-generate taskId
taskSchema.pre("save", async function(next) {
  if (this.isNew && !this.taskId) {
    try {
      const count = await this.constructor.countDocuments();
      this.taskId = `WFP-${count + 1001}`;
      
      // Initial activity log
      this.activityHistory.push({
        action: "Task created",
        performedBy: this.assignedBy,
        timestamp: new Date()
      });
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Task", taskSchema);
