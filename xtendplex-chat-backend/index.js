const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");
const supabase = require("./utils/supabase");

// Load environment variables
dotenv.config();

// Routes
const routes = require("./routes");
// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  // Authenticate user
  socket.on("authenticate", async (token) => {
    try {
      // Verify token and get user
      const { data: user, error } = await supabase.auth.getUser(token);

      if (error) {
        socket.emit("auth_error", { message: "Authentication failed" });
        return;
      }

      // Store user info in socket
      socket.user = user;
      socket.emit("authenticated", { userId: user.id });

      // Join user's personal room for direct messages
      socket.join(`user:${user.id}`);

      // Get user's groups and join their rooms
      const { data: groups } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (groups) {
        groups.forEach((group) => {
          socket.join(`group:${group.group_id}`);
        });
      }
    } catch (err) {
      console.error("Authentication error:", err);
      socket.emit("auth_error", { message: "Authentication failed" });
    }
  });

  // Handle joining a new group
  socket.on("join_group", (groupId) => {
    socket.join(`group:${groupId}`);
  });

  // Handle new message
  socket.on("new_message", async (messageData) => {
    try {
      // Save message to database
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          content: messageData.content,
          group_id: messageData.groupId,
          user_id: socket.user.id,
          parent_id: messageData.parentId || null,
        })
        .select(`*, users:user_id (id, username, avatar)`)
        .single();

      if (error) {
        socket.emit("message_error", { message: error.message });
        return;
      }

      // Process attachments if any
      if (messageData.attachments && messageData.attachments.length > 0) {
        for (const attachment of messageData.attachments) {
          await supabase.from("message_attachments").insert({
            message_id: message.id,
            file_path: attachment.filePath,
            file_type: attachment.fileType,
            file_name: attachment.fileName,
            file_size: attachment.fileSize,
          });
        }

        // Get message with attachments
        const { data: messageWithAttachments } = await supabase
          .from("messages")
          .select(
            `
            *,
            users:user_id (id, username, avatar),
            message_attachments (*)
          `
          )
          .eq("id", message.id)
          .single();

        if (messageWithAttachments) {
          // Emit message to the group room
          io.to(`group:${messageData.groupId}`).emit(
            "receive_message",
            messageWithAttachments
          );
        }
      } else {
        // Emit message to the group room
        io.to(`group:${messageData.groupId}`).emit("receive_message", message);
      }
    } catch (err) {
      console.error("Message error:", err);
      socket.emit("message_error", { message: "Failed to send message" });
    }
  });

  // Handle typing events
  socket.on("typing", (data) => {
    socket.to(`group:${data.groupId}`).emit("user_typing", {
      userId: socket.user.id,
      username: data.username,
      groupId: data.groupId,
    });
  });

  // Handle message reactions
  socket.on("add_reaction", async (data) => {
    try {
      const { data: reaction, error } = await supabase
        .from("message_reactions")
        .insert({
          message_id: data.messageId,
          user_id: socket.user.id,
          reaction: data.reaction,
        })
        .select(
          `
          *,
          users:user_id (id, username, avatar)
        `
        )
        .single();

      if (error) {
        // Check if it's a duplicate reaction (toggle behavior)
        if (error.code === "23505") {
          // Unique constraint violation
          await supabase.from("message_reactions").delete().match({
            message_id: data.messageId,
            user_id: socket.user.id,
            reaction: data.reaction,
          });

          io.to(`group:${data.groupId}`).emit("reaction_removed", {
            messageId: data.messageId,
            userId: socket.user.id,
            reaction: data.reaction,
          });
        } else {
          socket.emit("reaction_error", { message: error.message });
        }
        return;
      }

      io.to(`group:${data.groupId}`).emit("reaction_added", reaction);
    } catch (err) {
      console.error("Reaction error:", err);
      socket.emit("reaction_error", { message: "Failed to add reaction" });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api", routes);

// Default route
app.get("/", (req, res) => {
  res.send("Xtendplex Chat API is running");
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
