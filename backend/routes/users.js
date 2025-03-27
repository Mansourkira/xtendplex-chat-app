const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const supabase = require("../utils/supabase");

// Get all users
router.get("/", verifyToken, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, email, created_at")
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
      .select("id, username, email, created_at")
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

// Update user
router.put("/:id", verifyToken, async (req, res) => {
  // Only allow users to update their own profile unless they're an admin
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  const { username, email } = req.body;
  const updates = {};

  if (username) updates.username = username;
  if (email) updates.email = email;
  updates.updated_at = new Date();

  try {
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

module.exports = router;
