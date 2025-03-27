const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const supabase = require("../utils/supabase");

// Get all groups
router.get("/", verifyToken, async (req, res) => {
  try {
    // Get all groups where the user is a member
    const { data: memberships, error: membershipError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", req.user.id);

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!memberships || memberships.length === 0) {
      return res.json([]);
    }

    const groupIds = memberships.map((membership) => membership.group_id);

    // Get the group details
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds)
      .order("updated_at", { ascending: false });

    if (groupsError) {
      return res.status(500).json({ message: groupsError.message });
    }

    res.json(groups);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's groups
router.get("/my-groups", verifyToken, (req, res) => {
  const userId = req.user.id;

  req.db.all(
    `SELECT g.* 
     FROM groups g
     JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = ?`,
    [userId],
    (err, groups) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: "Server error" });
      }

      res.json(groups);
    }
  );
});

// Get group by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    // Check if user is member of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError && membershipError.code !== "PGRST116") {
      // Code for "No rows returned"
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (groupError) {
      return res.status(500).json({ message: groupError.message });
    }

    // Get all members of the group
    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select(
        `
        role,
        users:user_id (
          id, username, email
        ),
        joined_at
      `
      )
      .eq("group_id", req.params.id);

    if (membersError) {
      return res.status(500).json({ message: membersError.message });
    }

    // Format the response
    const formattedMembers = members.map((member) => ({
      id: member.users.id,
      username: member.users.username,
      email: member.users.email,
      role: member.role,
      joined_at: member.joined_at,
    }));

    res.json({
      ...group,
      members: formattedMembers,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Create group
router.post("/", verifyToken, async (req, res) => {
  const { name, description, is_direct_message, member_ids } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Group name is required" });
  }

  try {
    // Create the group
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name,
        description,
        is_direct_message: is_direct_message || false,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (groupError) {
      return res.status(500).json({ message: groupError.message });
    }

    // Add the creator as a member with role 'admin'
    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: req.user.id,
      role: "admin",
    });

    if (memberError) {
      return res.status(500).json({ message: memberError.message });
    }

    // Add additional members if provided
    if (member_ids && member_ids.length > 0) {
      const members = member_ids.map((userId) => ({
        group_id: group.id,
        user_id: userId,
        role: "member",
      }));

      const { error: addMembersError } = await supabase
        .from("group_members")
        .insert(members);

      if (addMembersError) {
        return res.status(500).json({ message: addMembersError.message });
      }
    }

    res.status(201).json({
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update group
router.put("/:id", verifyToken, async (req, res) => {
  const { name, description } = req.body;
  const updates = {};

  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  updates.updated_at = new Date();

  try {
    // Check if user is admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership || membership.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to update this group" });
    }

    // Update the group
    const { data: updatedGroup, error: updateError } = await supabase
      .from("groups")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }

    res.json({
      message: "Group updated successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete group
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // Check if user is admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership || membership.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this group" });
    }

    // Delete the group (cascade will handle deleting members, messages, etc.)
    const { error: deleteError } = await supabase
      .from("groups")
      .delete()
      .eq("id", req.params.id);

    if (deleteError) {
      return res.status(500).json({ message: deleteError.message });
    }

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Add member to group
router.post("/:id/members", verifyToken, async (req, res) => {
  const { user_id, role } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Check if user is admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership || membership.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to add members" });
    }

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", req.params.id)
      .eq("user_id", user_id)
      .single();

    if (existingMember) {
      return res
        .status(400)
        .json({ message: "User is already a member of this group" });
    }

    // Add the user to the group
    const { data: newMember, error: addError } = await supabase
      .from("group_members")
      .insert({
        group_id: req.params.id,
        user_id,
        role: role || "member",
      })
      .select()
      .single();

    if (addError) {
      return res.status(500).json({ message: addError.message });
    }

    res.status(201).json({
      message: "Member added successfully",
      member: newMember,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove member from group
router.delete("/:id/members/:userId", verifyToken, async (req, res) => {
  try {
    // Check if current user is admin or the user being removed
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    const isAdmin = membership && membership.role === "admin";
    const isSelfRemoval = req.user.id === req.params.userId;

    if (!isAdmin && !isSelfRemoval) {
      return res
        .status(403)
        .json({ message: "Not authorized to remove this member" });
    }

    // Remove the member
    const { error: removeError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", req.params.id)
      .eq("user_id", req.params.userId);

    if (removeError) {
      return res.status(500).json({ message: removeError.message });
    }

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update member role
router.put("/:id/members/:userId", verifyToken, async (req, res) => {
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: "Role is required" });
  }

  try {
    // Check if user is admin of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership || membership.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to update member roles" });
    }

    // Update the member's role
    const { data: updatedMember, error: updateError } = await supabase
      .from("group_members")
      .update({ role })
      .eq("group_id", req.params.id)
      .eq("user_id", req.params.userId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }

    res.json({
      message: "Member role updated successfully",
      member: updatedMember,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Create direct message group
router.post("/direct", verifyToken, async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Check if DM group already exists between these users
    const { data: existingGroups, error: existingError } = await supabase
      .from("groups")
      .select("id")
      .eq("is_direct_message", true);

    if (existingError) {
      return res.status(500).json({ message: existingError.message });
    }

    // If there are existing DM groups, check if both users are members
    if (existingGroups && existingGroups.length > 0) {
      for (const group of existingGroups) {
        const { data: members, error: membersError } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", group.id);

        if (membersError) {
          return res.status(500).json({ message: membersError.message });
        }

        if (members.length === 2) {
          const userIds = members.map((m) => m.user_id);
          if (userIds.includes(req.user.id) && userIds.includes(user_id)) {
            // DM group already exists, get details
            const { data: existingGroup, error: groupError } = await supabase
              .from("groups")
              .select("*")
              .eq("id", group.id)
              .single();

            if (groupError) {
              return res.status(500).json({ message: groupError.message });
            }

            return res.json({
              message: "Direct message group already exists",
              group: existingGroup,
            });
          }
        }
      }
    }

    // Get the other user's details to create a proper name
    const { data: otherUser, error: userError } = await supabase
      .from("users")
      .select("username")
      .eq("id", user_id)
      .single();

    if (userError) {
      return res.status(500).json({ message: userError.message });
    }

    // Create new DM group
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: `DM with ${otherUser.username}`,
        is_direct_message: true,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (groupError) {
      return res.status(500).json({ message: groupError.message });
    }

    // Add both users as members
    const members = [
      { group_id: group.id, user_id: req.user.id, role: "admin" },
      { group_id: group.id, user_id: user_id, role: "member" },
    ];

    const { error: membersError } = await supabase
      .from("group_members")
      .insert(members);

    if (membersError) {
      return res.status(500).json({ message: membersError.message });
    }

    res.status(201).json({
      message: "Direct message group created successfully",
      group,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
