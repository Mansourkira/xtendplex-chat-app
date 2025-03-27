const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");

// Register new user
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    console.log("Register request received:", { username, email });

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
        data: { username },
        emailRedirectTo: `${process.env.CLIENT_URL}/auth/callback`,
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

    // Since Supabase may require email verification, we'll add the user to our
    // users table even before verification to maintain data consistency
    try {
      const { error: dbError } = await supabase.from("users").insert({
        id: authUser.user.id,
        username,
        email,
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

    if (!authData || !authData.user) {
      return res.status(400).json({ message: "Authentication failed" });
    }

    console.log("Login successful for user ID:", authData.user.id);

    // Get user profile or create if doesn't exist
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("id", authData.user.id)
      .single();

    // If user profile doesn't exist in the users table, create it
    if (userError || !user) {
      const username =
        authData.user.user_metadata?.username || email.split("@")[0];

      try {
        await supabase.from("users").insert({
          id: authData.user.id,
          username,
          email: authData.user.email,
          created_at: new Date().toISOString(),
        });
      } catch (insertError) {
        console.error("Error creating user profile:", insertError);
      }

      // Return session with basic user info
      return res.json({
        message: "Login successful",
        user: {
          id: authData.user.id,
          username,
          email: authData.user.email,
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: new Date(authData.session.expires_at).toISOString(),
        },
      });
    }

    // Return user profile with session tokens
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
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
      .select("id, username, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      // Return basic info if profile not in database
      return res.json({
        id: user.id,
        username: user.user_metadata?.username || user.email.split("@")[0],
        email: user.email,
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
    res.status(500).json({ message: "Server error" });
  }
});

// Logout user
router.post("/logout", async (req, res) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
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

module.exports = router;
