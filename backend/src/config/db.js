const mongoose = require("mongoose");
const setupMockDb = require("./mockDb");

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/workflow_pro";
    
    // Securely mask both username and password in logs
    const maskedConnStr = connStr.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    console.log(`Connecting to MongoDB at: ${maskedConnStr}`);
    
    await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout (safe for production Atlas cold starts)
    });
    
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.warn(`\n[WARNING] MongoDB Connection failed: ${error.message}`);
    console.warn("Initializing fully-functional in-memory database fallback...");
    setupMockDb(mongoose);
    console.log("In-Memory Database initialized successfully with seed data.\n");
  }
};

module.exports = connectDB;
