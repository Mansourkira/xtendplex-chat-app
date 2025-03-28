const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Debug environment variables
console.log("Supabase URL:", process.env.SUPABASE_URL);
console.log(
  "Supabase Key:",
  process.env.SUPABASE_SERVER_ROLE_KEY ? "Key is defined" : "Key is undefined"
);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVER_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL and key must be provided!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
