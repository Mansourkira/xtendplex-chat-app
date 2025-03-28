const supabase = require("./utils/supabase");

async function setupDatabase() {
  try {
    console.log("Starting database setup...");

    // Create users table if not exists
    const { error: usersError } = await supabase.rpc(
      "create_users_table_if_not_exists",
      {
        sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY REFERENCES auth.users(id),
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          avatar TEXT,
          status TEXT DEFAULT 'offline',
          role TEXT DEFAULT 'user',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          last_seen TIMESTAMPTZ
        );
      `,
      }
    );

    if (usersError) {
      console.error("Error creating users table:", usersError);

      // Alternative approach if RPC fails
      const { error: altUsersError } = await supabase
        .from("users")
        .select("id")
        .limit(1);
      if (altUsersError) {
        console.log(
          "Could not verify users table. If it doesn't exist, please create it manually."
        );
      } else {
        console.log("Users table exists");
      }
    } else {
      console.log("Users table created or already exists");
    }

    // Create groups table if not exists
    const { error: groupsError } = await supabase.rpc(
      "create_groups_table_if_not_exists",
      {
        sql: `
        CREATE TABLE IF NOT EXISTS groups (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          avatar TEXT,
          created_by UUID REFERENCES users(id),
          is_direct_message BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          last_message JSONB
        );
      `,
      }
    );

    if (groupsError) {
      console.error("Error creating groups table:", groupsError);

      // Try to verify if the table exists
      const { error: altGroupsError } = await supabase
        .from("groups")
        .select("id")
        .limit(1);
      if (altGroupsError) {
        console.log(
          "Could not verify groups table. If it doesn't exist, please create it manually."
        );
      } else {
        console.log("Groups table exists");
      }
    } else {
      console.log("Groups table created or already exists");
    }

    // Create group_members table if not exists
    const { error: groupMembersError } = await supabase.rpc(
      "create_group_members_table_if_not_exists",
      {
        sql: `
        CREATE TABLE IF NOT EXISTS group_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(group_id, user_id)
        );
      `,
      }
    );

    if (groupMembersError) {
      console.error("Error creating group_members table:", groupMembersError);

      // Try to verify if the table exists
      const { error: altGroupMembersError } = await supabase
        .from("group_members")
        .select("id")
        .limit(1);
      if (altGroupMembersError) {
        console.log(
          "Could not verify group_members table. If it doesn't exist, please create it manually."
        );
      } else {
        console.log("Group members table exists");
      }
    } else {
      console.log("Group members table created or already exists");
    }

    // Create messages table if not exists
    const { error: messagesError } = await supabase.rpc(
      "create_messages_table_if_not_exists",
      {
        sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          content TEXT NOT NULL,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
          parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
          is_edited BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      }
    );

    if (messagesError) {
      console.error("Error creating messages table:", messagesError);

      // Try to verify if the table exists
      const { error: altMessagesError } = await supabase
        .from("messages")
        .select("id")
        .limit(1);
      if (altMessagesError) {
        console.log(
          "Could not verify messages table. If it doesn't exist, please create it manually."
        );
      } else {
        console.log("Messages table exists");
      }
    } else {
      console.log("Messages table created or already exists");
    }

    // Create message_attachments table if not exists
    const { error: attachmentsError } = await supabase.rpc(
      "create_message_attachments_table_if_not_exists",
      {
        sql: `
        CREATE TABLE IF NOT EXISTS message_attachments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
          file_path TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      }
    );

    if (attachmentsError) {
      console.error(
        "Error creating message_attachments table:",
        attachmentsError
      );

      // Try to verify if the table exists
      const { error: altAttachmentsError } = await supabase
        .from("message_attachments")
        .select("id")
        .limit(1);
      if (altAttachmentsError) {
        console.log(
          "Could not verify message_attachments table. If it doesn't exist, please create it manually."
        );
      } else {
        console.log("Message attachments table exists");
      }
    } else {
      console.log("Message attachments table created or already exists");
    }

    // Create message_reactions table if not exists
    const { error: reactionsError } = await supabase.rpc(
      "create_message_reactions_table_if_not_exists",
      {
        sql: `
        CREATE TABLE IF NOT EXISTS message_reactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          reaction TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(message_id, user_id, reaction)
        );
      `,
      }
    );

    if (reactionsError) {
      console.error("Error creating message_reactions table:", reactionsError);

      // Try to verify if the table exists
      const { error: altReactionsError } = await supabase
        .from("message_reactions")
        .select("id")
        .limit(1);
      if (altReactionsError) {
        console.log(
          "Could not verify message_reactions table. If it doesn't exist, please create it manually."
        );
      } else {
        console.log("Message reactions table exists");
      }
    } else {
      console.log("Message reactions table created or already exists");
    }

    console.log("Database setup completed successfully");

    // Check if there are any groups
    const { data: groups, error: groupsFetchError } = await supabase
      .from("groups")
      .select("*");

    if (groupsFetchError) {
      console.error("Error fetching groups:", groupsFetchError);
    } else {
      console.log(`Found ${groups.length} groups`);

      // Create a default group if none exist
      if (groups.length === 0) {
        console.log("No groups found, creating a default group...");

        // First, get the current logged in user or first user
        const { data: users, error: usersFetchError } = await supabase
          .from("users")
          .select("id")
          .limit(1);

        if (usersFetchError || !users || users.length === 0) {
          console.error(
            "Error fetching users or no users found:",
            usersFetchError
          );
        } else {
          const userId = users[0].id;

          // Create default group
          const { data: newGroup, error: createGroupError } = await supabase
            .from("groups")
            .insert({
              name: "General",
              description: "Default general discussion group",
              created_by: userId,
              is_direct_message: false,
            })
            .select()
            .single();

          if (createGroupError) {
            console.error("Error creating default group:", createGroupError);
          } else {
            console.log("Created default group:", newGroup);

            // Add creator as member with admin role
            const { error: addMemberError } = await supabase
              .from("group_members")
              .insert({
                group_id: newGroup.id,
                user_id: userId,
                role: "admin",
              });

            if (addMemberError) {
              console.error("Error adding user to group:", addMemberError);
            } else {
              console.log(`Added user ${userId} to group as admin`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Unexpected error during database setup:", error);
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log("Setup script completed");
  })
  .catch((err) => {
    console.error("Fatal error:", err);
  });
