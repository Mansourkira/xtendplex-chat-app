const supabase = require("./utils/supabase");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

// Test users to create
const testUsers = [
  {
    email: "admin@example.com",
    password: "admin123",
    username: "admin",
    role: "admin",
    avatar: "https://i.pravatar.cc/150?u=admin",
  },
  {
    email: "user1@example.com",
    password: "user123",
    username: "user1",
    role: "user",
    avatar: "https://i.pravatar.cc/150?u=user1",
  },
  {
    email: "user2@example.com",
    password: "user123",
    username: "user2",
    role: "user",
    avatar: "https://i.pravatar.cc/150?u=user2",
  },
];

async function createTestData() {
  try {
    console.log("Creating test data...");
    const createdUsers = [];

    // Create each test user
    for (const user of testUsers) {
      // Create user in auth.users
      const { data: authUser, error: signUpError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          status: "offline",
          last_seen: new Date(),
          // use bcrypt to hash the password
          password: await bcrypt.hash(user.password, 10),
          email_confirm: true, // Auto-confirm email
        });

      if (signUpError) {
        console.error(`Error creating auth user ${user.email}:`, signUpError);
        continue;
      }

      console.log(
        `Created auth user: ${user.email} with ID: ${authUser.user.id}`
      );

      // Insert user profile data
      const { error: profileError } = await supabase.from("users").insert({
        id: authUser.user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        status: "offline",
        last_seen: new Date(),
      });

      if (profileError) {
        console.error(
          `Error creating user profile for ${user.email}:`,
          profileError
        );
        continue;
      }

      console.log(`Created user profile for: ${user.email}`);
      createdUsers.push({
        id: authUser.user.id,
        ...user,
      });
    }

    if (createdUsers.length === 0) {
      console.log("No users were created. Exiting.");
      return;
    }

    // Create test groups
    const groups = [
      {
        name: "General",
        description: "Public channel for everyone",
        created_by: createdUsers[0].id,
        is_direct_message: false,
      },
      {
        name: "Random",
        description: "Random discussions",
        created_by: createdUsers[0].id,
        is_direct_message: false,
      },
      {
        name: "Direct Message",
        description: null,
        created_by: createdUsers[0].id,
        is_direct_message: true,
      },
    ];

    const createdGroups = [];
    for (const group of groups) {
      const { data: newGroup, error: createGroupError } = await supabase
        .from("groups")
        .insert(group)
        .select()
        .single();

      if (createGroupError) {
        console.error(`Error creating group ${group.name}:`, createGroupError);
        continue;
      }

      console.log(`Created group: ${group.name} with ID: ${newGroup.id}`);
      createdGroups.push(newGroup);

      // Add members to the group
      for (const user of createdUsers) {
        const role = user.id === group.created_by ? "admin" : "member";

        const { error: memberError } = await supabase
          .from("group_members")
          .insert({
            group_id: newGroup.id,
            user_id: user.id,
            role,
          });

        if (memberError) {
          console.error(
            `Error adding user ${user.username} to group ${group.name}:`,
            memberError
          );
        } else {
          console.log(
            `Added user ${user.username} to group ${group.name} as ${role}`
          );
        }
      }
    }

    // Create some test messages
    if (createdGroups.length > 0 && createdUsers.length > 0) {
      const messages = [
        {
          content: "Welcome to the General channel!",
          user_id: createdUsers[0].id,
          group_id: createdGroups[0].id,
        },
        {
          content: "Hey, how's everyone doing?",
          user_id: createdUsers[1].id,
          group_id: createdGroups[0].id,
        },
        {
          content: "This is a random message in the Random channel",
          user_id: createdUsers[2].id,
          group_id: createdGroups[1].id,
        },
        {
          content: "Hey, this is a direct message!",
          user_id: createdUsers[0].id,
          group_id: createdGroups[2].id,
        },
      ];

      for (const message of messages) {
        const { data: newMessage, error: messageError } = await supabase
          .from("messages")
          .insert(message)
          .select()
          .single();

        if (messageError) {
          console.error(`Error creating message:`, messageError);
        } else {
          console.log(
            `Created message: ${message.content.substring(0, 20)}...`
          );

          // Update the last_message in the group
          const { error: updateGroupError } = await supabase
            .from("groups")
            .update({
              last_message: {
                id: newMessage.id,
                content: newMessage.content,
                created_at: newMessage.created_at,
                user_id: newMessage.user_id,
              },
            })
            .eq("id", message.group_id);

          if (updateGroupError) {
            console.error(
              `Error updating last_message in group:`,
              updateGroupError
            );
          }
        }
      }
    }

    console.log("Test data creation completed!");
    console.log("\nTest User Credentials:");
    testUsers.forEach((user) => {
      console.log(
        `- Email: ${user.email}, Password: ${user.password}, Role: ${user.role}`
      );
    });
  } catch (error) {
    console.error("Unexpected error during test data creation:", error);
  }
}

// Run the setup
createTestData()
  .then(() => {
    console.log("Test data creation script completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
