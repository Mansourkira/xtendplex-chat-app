const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const cors = require("cors");

// Apply CORS specifically for auth routes
router.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

// Register new user
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Set default role to 'admin' for development purposes
  const userRole = "admin";

  try {
    console.log("Register request received:", { username, email, password });

    // Check if email is valid (simple validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Register user with Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      console.error("Auth error details:", JSON.stringify(authError, null, 2));
      return res.status(400).json({ message: authError.message });
    }

    if (!authUser || !authUser.user) {
      console.error("No auth user data returned");
      return res
        .status(400)
        .json({ message: "Failed to create authentication account" });
    }

    console.log("Auth user created:", authUser.user.id);

    // Since Supabase may require email verification, we'll add the user to our
    // users table even before verification to maintain data consistency
    try {
      const { error: dbError } = await supabase.from("users").insert({
        id: authUser.user.id,
        username,
        email,
        avatar: `/avatars/default-avatar.png`,
        status: "online",
        password: password,
        role: userRole,
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Database error inserting user:", dbError);
        // Continue anyway since the auth user was created
      }
    } catch (dbError) {
      console.error("Error during database insert:", dbError);
    }

    // Get the session from auth response
    const session = authUser.session;

    // Return the Supabase session tokens instead of creating our own JWT
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: authUser.user.id,
        username,
        email,
        status: "online",
        role: userRole,
      },
      session: session
        ? {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: new Date(session.expires_at).toISOString(),
          }
        : null,
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

    // Check if input is an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(email);

    let authData;
    let authError;

    if (isEmail) {
      // Sign in with email
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authData = result.data;
      authError = result.error;
    } else {
      // First get user by username
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email")

        .eq("username", email)
        .single();
      // update user status to online
      await supabase
        .from("users")
        .update({ status: "online" })
        .eq("id", userData.id);
      if (userError || !userData) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Then sign in with email
      const result = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });
      authData = result.data;
      authError = result.error;
    }

    if (authError) {
      console.error("Login error:", authError);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!authData || !authData.user) {
      return res.status(400).json({ message: "Authentication failed" });
    }

    console.log("Login successful for user ID:", authData.user.id);

    // Get user profile or create if doesn't exist
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, email, status, role")
      .eq("id", authData.user.id)
      .single();

    // If user profile doesn't exist in the users table, create it
    if (userError || !user) {
      const username =
        authData.user.user_metadata?.username || email.split("@")[0];
      const userRole = authData.user.user_metadata?.role || "user";

      try {
        await supabase.from("users").insert({
          id: authData.user.id,
          username,
          email: authData.user.email,
          created_at: new Date().toISOString(),
          status: "online",
          role: userRole,
        });
      } catch (insertError) {
        console.error("Error creating user profile:", insertError);
      }

      // Update user status to online
      await supabase
        .from("users")
        .update({ status: "online" })
        .eq("id", authData.user.id);

      // Return session with basic user info
      return res.json({
        message: "Login successful",
        user: {
          id: authData.user.id,
          username,
          email: authData.user.email,
          status: "online",
          role: userRole,
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: new Date(authData.session.expires_at).toISOString(),
        },
      });
    }

    // Update user status to online
    await supabase.from("users").update({ status: "online" }).eq("id", user.id);

    // Return user profile with session tokens
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: "online",
        role: user.role,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: new Date(authData.session.expires_at).toISOString(),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get current user
router.get("/me", async (req, res) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Use Supabase to get user from token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Error fetching current user:", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, username, email, status, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      // Return basic info if profile not in database
      return res.json({
        id: user.id,
        username: user.user_metadata?.username || user.email.split("@")[0],
        email: user.email,
        status: "offline",
        role: user.user_metadata?.role || "user",
      });
    }

    res.json(userProfile);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Refresh token
router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      console.error("Token refresh error:", error);

      // Check for rate limiting errors
      if (error.status === 429 || error.message?.includes("rate limit")) {
        return res.status(429).json({
          message: "Too many refresh attempts, please try again later",
          code: "rate_limit_exceeded",
        });
      }

      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: new Date(data.session.expires_at).toISOString(),
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    // Return appropriate status code for different errors
    if (error.status === 429 || error.message?.includes("rate limit")) {
      return res.status(429).json({
        message: "Too many refresh attempts, please try again later",
        code: "rate_limit_exceeded",
      });
    }

    res.status(500).json({ message: "Server error" });
  }
});

//

// Logout user
router.post("/logout", async (req, res) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Get user ID from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (!userError && user) {
      // Update user status to offline
      await supabase
        .from("users")
        .update({ status: "offline" })
        .eq("id", user.id);
    }

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

// Add new endpoint to update user status
router.put("/status", async (req, res) => {
  const { status } = req.body;

  if (!status || !["online", "offline", "away"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Valid status is required (online, offline, away)" });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Update user status
    const { error: updateError } = await supabase
      .from("users")
      .update({ status })
      .eq("id", user.id);

    if (updateError) {
      return res.status(500).json({ message: "Failed to update status" });
    }

    // After successful update, emit to all connected clients
    req.io.emit("user_status_change", {
      userId: user.id,
      status: status,
    });

    res.json({ message: "Status updated successfully", status });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
