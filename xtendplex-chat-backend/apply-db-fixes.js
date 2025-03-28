const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVER_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL and key must be provided!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyDatabaseFixes() {
  try {
    console.log("Applying database fixes...");

    // Read SQL files
    const rlsPoliciesSQL = fs.readFileSync(
      path.join(__dirname, "fix-rls-policies.sql"),
      "utf8"
    );
    const createDmFunctionSQL = fs.readFileSync(
      path.join(__dirname, "create-dm-function.sql"),
      "utf8"
    );

    // Execute RLS policies SQL
    console.log("Applying RLS policies...");
    const { error: rlsError } = await supabase.rpc("pgexecute", {
      query: rlsPoliciesSQL,
    });

    if (rlsError) {
      console.error("Error applying RLS policies:", rlsError);
    } else {
      console.log("RLS policies applied successfully");
    }

    // Execute create DM function SQL
    console.log("Creating stored procedure for direct messages...");
    const { error: dmFunctionError } = await supabase.rpc("pgexecute", {
      query: createDmFunctionSQL,
    });

    if (dmFunctionError) {
      console.error("Error creating DM function:", dmFunctionError);
    } else {
      console.log("DM function created successfully");
    }

    console.log("Database fixes completed");
  } catch (error) {
    console.error("Error applying database fixes:", error);
  }
}

// Run the function
applyDatabaseFixes();
