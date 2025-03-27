const supabase = require("../utils/supabase");

// Middleware to verify JWT token using Supabase
const verifyToken = async (req, res, next) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Token verification error:", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Add user data to the request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = { verifyToken };
