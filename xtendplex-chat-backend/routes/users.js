const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const supabase = require("../utils/supabase");

const bcrypt = require("bcryptjs");
// Get all users for chat (except current user)
router.get("/chat-users", verifyToken, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, avatar, status")
      .neq("id", req.user.id)
      .order("username");

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    // Add default avatar for users who don't have one
    const usersWithDefaultAvatar = users.map((user) => ({
      ...user,
      avatar: user.avatar || `/avatars/default-${user.id.slice(0, 2)}.svg`,
    }));

    res.json(usersWithDefaultAvatar);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// create a new user
router.post("/create", verifyToken, async (req, res) => {
  const { username, email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  // create a new user in the users table
  const { data: user, error: userError } = await supabase.from("users").insert({
    id: data.user.id,
    username,
    email,
    password: await bcrypt.hash(password, 10),
    avatar: `/avatars/default-avatar.png`,
    status: "offline",
    role: "user",
    created_at: new Date(),
    updated_at: new Date(),
  });

  if (userError) {
    return res.status(500).json({ message: userError.message });
  }

  // get the session from auth response

  res.json({ message: "User created successfully", user });
});

// Get all users
router.get("/", verifyToken, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, email, status, role, created_at")
      .order("username", { ascending: true });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email, status, role , created_at")
      .eq("id", req.params.id)
      .single();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update current user
router.put("/current", verifyToken, async (req, res) => {
  const { username, email, status } = req.body;
  const updates = {};

  if (username) updates.username = username;
  if (email) updates.email = email;
  if (status) updates.status = status;
  updates.updated_at = new Date();

  const { data: updatedUser, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", req.user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  res.json({
    message: "User updated successfully",
    user: updatedUser,
  });
});

// Update user
router.put("/:id", verifyToken, async (req, res) => {
  try {
    // Get the user making the request
    const { data: requestingUser, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (userError) {
      return res.status(500).json({ message: userError.message });
    }

    // Only allow users to update their own profile unless they're an admin
    if (req.user.id !== req.params.id && requestingUser.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { username, email, role } = req.body;
    const updates = {};

    if (username) updates.username = username;
    if (email) updates.email = email;
    // Only allow admins to update roles
    if (role && requestingUser.role === "admin") updates.role = role;
    updates.updated_at = new Date();

    // Update user in Supabase
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user status
router.get("/:id/status", verifyToken, async (req, res) => {
  try {
    const { data: status, error } = await supabase
      .from("user_status")
      .select("status, last_seen_at")
      .eq("user_id", req.params.id)
      .single();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json(status || { status: "offline" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user status
router.put("/status", verifyToken, async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  try {
    // Check if status exists for user
    const { data: existingStatus } = await supabase
      .from("user_status")
      .select("user_id")
      .eq("user_id", req.user.id)
      .single();

    let result;

    if (existingStatus) {
      // Update status
      result = await supabase
        .from("user_status")
        .update({
          status,
          last_seen_at: new Date(),
        })
        .eq("user_id", req.user.id)
        .select()
        .single();
    } else {
      // Insert new status
      result = await supabase
        .from("user_status")
        .insert({
          user_id: req.user.id,
          status,
          last_seen_at: new Date(),
        })
        .select()
        .single();
    }

    if (result.error) {
      return res.status(500).json({ message: result.error.message });
    }

    res.json({
      message: "Status updated successfully",
      status: result.data,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Search users by username
router.get("/search/:query", verifyToken, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, email")
      .ilike("username", `%${req.params.query}%`)
      .order("username");

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get online users
router.get("/online", verifyToken, async (req, res) => {
  try {
    // Fetch users who are currently online
    const { data: onlineUsers, error } = await supabase
      .from("users")
      .select("id, username, avatar, status, last_seen")
      .not("status", "eq", "offline")
      .order("username");

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json(onlineUsers);
  } catch (error) {
    console.error("Error fetching online users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
