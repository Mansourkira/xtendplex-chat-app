const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyFinalPolicies() {
  try {
    console.log("Applying final RLS policies...");

    const fs = require("fs");
    const path = require("path");
    const sql = fs.readFileSync(
      path.join(__dirname, "final-rls-policies.sql"),
      "utf8"
    );

    const { error } = await supabase.sql(sql);

    if (error) {
      console.error("Error applying policies:", error);
      process.exit(1);
    }

    console.log("RLS policies applied successfully");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

applyFinalPolicies();
