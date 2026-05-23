const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  clientName: { type: String, required: true },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  status: { type: String, enum: ["On Track", "At Risk", "Delayed", "Archived"], default: "On Track" },
  plannedStartDate: { type: Date, required: true },
  plannedEndDate: { type: Date, required: true },
  actualStartDate: { type: Date },
  actualEndDate: { type: Date },
  budget: { type: Number, required: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  documents: [{
    name: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
