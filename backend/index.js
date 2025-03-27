const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Routes
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const groupsRoutes = require("./routes/groups");
const messagesRoutes = require("./routes/messages");
const attachmentsRoutes = require("./routes/attachments");

// Initialize Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/attachments", attachmentsRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Xtendplex Chat API is running");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
