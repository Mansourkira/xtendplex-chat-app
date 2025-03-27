const jwt = require("jsonwebtoken");
const supabase = require("../utils/supabase");

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists in Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid user" });
    }

    // Add user from payload to request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = { verifyToken };
