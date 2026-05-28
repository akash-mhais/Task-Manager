const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const analyticsRoutes = require("./routes/analytics");
const notificationRoutes = require("./routes/notifications");
const chatRoutes = require("./routes/chat");

const app = express();

// Secure HTTP Headers (Cross-Origin Resource Policy enabled for local file rendering)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Dynamic CORS configuration (whitelists backend configuration or defaults to localhost)
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(o => o.trim())
  : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser agents, Postman, curl, or same-origin requests
    if (!origin) return callback(null, true);
    
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
    const isVercel = origin.endsWith(".vercel.app") || origin.includes("vercel");
    const isWhitelisted = allowedOrigins.includes(origin) || allowedOrigins.includes("*");
    
    if (isLocalhost || isVercel || isWhitelisted) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Body:`, JSON.stringify(req.body));
  next();
});

// Serve static upload files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Security Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { success: false, error: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use("/api/", limiter);

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

// Simple root check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Fallback Route
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Server Error"
  });
});

module.exports = app;
