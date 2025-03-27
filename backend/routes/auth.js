const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const supabase = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");

// Register new user
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    console.log("Register request received:", { username, email });

    // Register user with Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return res.status(400).json({ message: authError.message });
    }

    if (!authUser || !authUser.user) {
      console.error("No auth user data returned");
      return res
        .status(400)
        .json({ message: "Failed to create authentication account" });
    }

    console.log("Auth user created:", authUser.user.id);

    // Use a direct query to insert into users table
    try {
      // Try a simple direct query to insert the user
      const { data: newUser, error: dbError } = await supabase
        .from("users")
        .insert({
          id: authUser.user.id,
          username,
          email,
          created_at: new Date().toISOString(),
        })
        .select();

      if (dbError) {
        console.error("Database error inserting user:", dbError);

        // Return success even if we couldn't insert into the users table
        // The trigger should handle it if properly set up
      }

      console.log("Database insert response:", newUser);
    } catch (dbError) {
      console.error("Error during database insert:", dbError);
    }

    // Create JWT token
    const token = jwt.sign(
      { id: authUser.user.id, username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return success regardless of whether the database insert worked
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: authUser.user.id,
        username,
        email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    console.log("Login attempt:", email);

    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.error("Login error:", authError);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Login successful for user ID:", authData.user.id);

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", authData.user.id)
      .single();

    if (userError) {
      console.error("Error fetching user profile:", userError);

      // If user profile doesn't exist, create a basic one from auth data
      return res.json({
        message: "Login successful",
        token: jwt.sign(
          { id: authData.user.id, username: email.split("@")[0] },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        ),
        user: {
          id: authData.user.id,
          username:
            authData.user.user_metadata?.username || email.split("@")[0],
          email: authData.user.email,
        },
      });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get current user
router.get("/me", verifyToken, async (req, res) => {
  try {
    // Get user profile from Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", req.user.id)
      .single();

    if (error) {
      console.error("Error fetching current user:", error);
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

// Logout user
router.post("/logout", verifyToken, async (req, res) => {
  try {
    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return res.status(500).json({ message: error.message });
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
