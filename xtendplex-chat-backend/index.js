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
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],

    credentials: true,
  },
});

// Store connected users
const connectedUsers = new Map();

// Replace Firebase auth with Supabase auth
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      console.error("Authentication error: No token provided");
      return next(new Error("Authentication error: No token provided"));
    }

    // Use Supabase to verify the JWT token
    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error) {
        console.error("Token verification error:", error);
        if (error.message.includes("Auth session missing")) {
          return next(
            new Error(
              "Authentication error: Session expired, please log in again"
            )
          );
        }
        return next(new Error(`Authentication error: ${error.message}`));
      }

      if (!data || !data.user) {
        console.error("No user data found for the provided token");
        return next(new Error("Authentication error: No user found"));
      }

      // Set user information on the socket
      socket.user = {
        uid: data.user.id,
        email: data.user.email,
        // Get additional user data from the database
        username:
          data.user.user_metadata?.username || data.user.email.split("@")[0],
      };

      // Get additional user info from the database
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("username, avatar, status, role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
      }

      if (userProfile) {
        socket.user.username = userProfile.username;
        socket.user.avatar = userProfile.avatar;
        socket.user.status = userProfile.status;
        socket.user.role = userProfile.role;
      }

      console.log("Socket authentication successful for", socket.user.username);
      next();
    } catch (verifyError) {
      console.error("Token verification error:", verifyError);
      return next(new Error("Authentication error: Invalid token"));
    }
  } catch (error) {
    console.error("Authentication error:", error);
    next(new Error("Authentication error: Server error"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.user.uid);

  // Store user connection
  connectedUsers.set(socket.user.uid, {
    socketId: socket.id,
    status: "online",
  });

  // Join user's personal room
  socket.join(`user:${socket.user.uid}`);

  // Simple ping/pong for connection testing
  socket.on("ping", (data) => {
    console.log("Ping received from client:", socket.user.uid);
    socket.emit("pong", {
      message: "Server pong response",
      userId: socket.user.uid,
      timestamp: new Date().toISOString(),
      receivedData: data,
    });
  });

  // Handle join group
  socket.on("join_group", async (groupId) => {
    try {
      console.log(`User ${socket.user.uid} joining group ${groupId}`);

      // Check if user is a member of the group
      const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", socket.user.uid)
        .single();

      if (membershipError) {
        console.error("Error checking group membership:", membershipError);
        socket.emit("error", { message: "Failed to join group" });
        return;
      }

      // Join group room
      socket.join(`group:${groupId}`);
      console.log(`User ${socket.user.uid} joined group ${groupId}`);
    } catch (error) {
      console.error("Error joining group:", error);
      socket.emit("error", { message: "Failed to join group" });
    }
  });

  // Handle new message
  socket.on("send_message", async (data) => {
    try {
      const { content, groupId, parentId, attachments } = data;

      console.log("Received message:", {
        content,
        user_id: socket.user.uid,
        group_id: groupId,
      });

      // Validate that groupId is a valid UUID
      if (
        !groupId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          groupId
        )
      ) {
        console.error("Invalid group ID format:", groupId);
        socket.emit("error", { message: "Invalid group ID format" });
        return;
      }

      // Create new message in Supabase
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          content,
          user_id: socket.user.uid,
          group_id: groupId,
          parent_id: parentId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting message:", error);
        throw error;
      }

      // Now fetch the user data separately to avoid relationship issues
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, username, avatar")
        .eq("id", socket.user.uid)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      // Combine message with user data
      const messageWithUser = {
        ...message,
        user: userData || {
          id: socket.user.uid,
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
      };

      // If there are attachments, save them
      if (attachments && attachments.length > 0) {
        const attachmentInserts = attachments.map((attachment) => ({
          message_id: message.id,
          file_path: attachment.filePath,
          file_type: attachment.fileType,
          file_name: attachment.fileName,
          file_size: attachment.fileSize,
        }));

        const { error: attachmentError } = await supabase
          .from("message_attachments")
          .insert(attachmentInserts);

        if (attachmentError) {
          console.error("Error saving attachments:", attachmentError);
        }
      }

      console.log("Message inserted successfully:", message.id);

      // Emit message to group room
      io.to(`group:${groupId}`).emit("message", messageWithUser);

      // Update group's last message
      const { error: updateError } = await supabase
        .from("groups")
        .update({
          last_message: {
            content,
            user_id: socket.user.uid,
            created_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", groupId);

      if (updateError) {
        console.error("Error updating group:", updateError);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle message update
  socket.on("update_message", async (data) => {
    try {
      const { messageId, content } = data;

      // Verify user owns the message
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .single();

      if (messageError) {
        throw new Error("Message not found");
      }

      if (messageData.user_id !== socket.user.uid) {
        throw new Error("Unauthorized");
      }

      // Update the message
      const { data: updatedMessage, error } = await supabase
        .from("messages")
        .update({
          content,
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Fetch user data separately
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, username, avatar")
        .eq("id", socket.user.uid)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      // Combine message with user data
      const updatedMessageWithUser = {
        ...updatedMessage,
        user: userData || {
          id: socket.user.uid,
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
      };

      // Emit updated message to group room
      io.to(`group:${messageData.group_id}`).emit(
        "message_update",
        updatedMessageWithUser
      );
    } catch (error) {
      console.error("Error updating message:", error);
      socket.emit("error", { message: "Failed to update message" });
    }
  });

  // Handle message deletion
  socket.on("delete_message", async (data) => {
    try {
      const { messageId } = data;

      // Verify user owns the message
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .single();

      if (messageError) {
        throw new Error("Message not found");
      }

      if (messageData.user_id !== socket.user.uid) {
        throw new Error("Unauthorized");
      }

      // Delete message
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) {
        throw error;
      }

      // Emit message deletion to group room
      io.to(`group:${messageData.group_id}`).emit("message_delete", messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  // Handle reaction addition
  socket.on("add_reaction", async (data) => {
    try {
      const { messageId, reaction } = data;

      // Get message info
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("group_id")
        .eq("id", messageId)
        .single();

      if (messageError) {
        throw new Error("Message not found");
      }

      // Check if reaction already exists (for toggle functionality)
      const { data: existingReaction } = await supabase
        .from("message_reactions")
        .select("*")
        .eq("message_id", messageId)
        .eq("user_id", socket.user.uid)
        .eq("reaction", reaction)
        .single();

      if (existingReaction) {
        // Remove reaction if it exists (toggle behavior)
        const { error: deleteError } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (deleteError) {
          throw deleteError;
        }

        // Emit reaction removal
        io.to(`group:${messageData.group_id}`).emit("reaction_removed", {
          messageId,
          userId: socket.user.uid,
          reaction,
        });
      } else {
        // Add new reaction
        const { data: newReaction, error: insertError } = await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: socket.user.uid,
            reaction,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Fetch user data separately
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, username, avatar")
          .eq("id", socket.user.uid)
          .single();

        if (userError) {
          console.error("Error fetching user data:", userError);
        }

        // Combine reaction with user data
        const reactionWithUser = {
          ...newReaction,
          user: userData || {
            id: socket.user.uid,
            username: socket.user.username,
            avatar: socket.user.avatar,
          },
        };

        // Emit reaction added
        io.to(`group:${messageData.group_id}`).emit(
          "reaction_added",
          reactionWithUser
        );
      }
    } catch (error) {
      console.error("Error with reaction:", error);
      socket.emit("error", { message: "Failed to process reaction" });
    }
  });

  // Handle typing notifications
  socket.on("typing", (data) => {
    const { groupId } = data;
    socket.to(`group:${groupId}`).emit("user_typing", {
      userId: socket.user.uid,
      username: socket.user.username,
      groupId,
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.user.uid);
    connectedUsers.delete(socket.user.uid);
  });
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
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

// Socket test endpoint
app.get("/socket-test", (req, res) => {
  res.sendFile(__dirname + "/socket-test.html");
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
