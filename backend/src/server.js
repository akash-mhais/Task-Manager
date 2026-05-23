const app = require("./app");
const http = require("http");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { Server } = require("socket.io");

// Load env variables
dotenv.config();

// Connect to database
connectDB().catch(err => {
  console.error("Database connection failure. Continuing in mock database / offline mode if MONGODB_URI is not loaded.");
});

const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Map of online users: userId -> socketId
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // Register online user
  socket.on("register", (userId) => {
    if (userId) {
      onlineUsers.set(userId.toString(), socket.id);
      console.log(`User registered: ${userId} -> Socket: ${socket.id}`);
    }
  });

  // Join a project room for team chat
  socket.on("join_project", (projectId) => {
    socket.join(projectId);
    console.log(`Socket ${socket.id} joined project room: ${projectId}`);
  });

  // Leave project room
  socket.on("leave_project", (projectId) => {
    socket.leave(projectId);
    console.log(`Socket ${socket.id} left project room: ${projectId}`);
  });

  // Broadcast chat message to project room
  socket.on("send_message", (data) => {
    // data: { project, sender: { _id, name, avatar }, message, createdAt }
    socket.to(data.project).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log(`Socket Disconnected: ${socket.id}`);
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} unregistered`);
        break;
      }
    }
  });
});

// Expose socket.io to req context
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// Custom helper function to push real-time notifications
app.set("sendRealtimeNotification", (recipientId, notificationData) => {
  const socketId = onlineUsers.get(recipientId.toString());
  if (socketId) {
    io.to(socketId).emit("receive_notification", notificationData);
    console.log(`Realtime notification sent to user ${recipientId}`);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
