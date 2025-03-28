require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVER_KEY;

console.log("Testing Supabase connection...");
console.log("URL:", supabaseUrl);
console.log("Key present:", !!supabaseKey);

async function testConnection() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or key!");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test the connection by getting database health
    const { data, error } = await supabase.from("users").select("*").limit(1);

    if (error) {
      console.error("Error connecting to Supabase:", error);
    } else {
      console.log("Successfully connected to Supabase!");
      console.log("Users table exists:", data !== null);
      console.log("First user (if any):", data);
    }

    // Test Auth API
    console.log("\nTesting Auth API...");
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "test" + Date.now() + "@example.com",
        password: "password123",
      });

      if (authError) {
        console.error("Auth API Error:", authError);
        console.error("Full error:", JSON.stringify(authError, null, 2));
      } else {
        console.log(
          "Auth API success!",
          authData ? "User created" : "No user data returned"
        );
      }
    } catch (authTestError) {
      console.error("Auth API test failed:", authTestError);
    }
  } catch (e) {
    console.error("Test failed:", e);
  }
}

testConnection();
