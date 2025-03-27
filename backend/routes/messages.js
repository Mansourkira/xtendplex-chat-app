const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const supabase = require("../utils/supabase");

// Get private messages between users
router.get("/private/:userId", verifyToken, (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  req.db.all(
    `SELECT m.*, u.username as sender_name 
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
     ORDER BY m.created_at ASC`,
    [currentUserId, userId, userId, currentUserId],
    (err, messages) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: "Server error" });
      }

      res.json(messages);
    }
  );
});

// Get messages for a group
router.get("/group/:groupId", verifyToken, async (req, res) => {
  const { limit = 50, before } = req.query;

  try {
    // Check if user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", req.params.groupId)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError && membershipError.code !== "PGRST116") {
      // Code for "No rows returned"
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Build query for messages
    let query = supabase
      .from("messages")
      .select(
        `
        id,
        content,
        user_id,
        parent_id,
        is_edited,
        created_at,
        updated_at,
        users:user_id (id, username)
      `
      )
      .eq("group_id", req.params.groupId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    // Add before filter if provided
    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      return res.status(500).json({ message: messagesError.message });
    }

    // Format the response
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      content: message.content,
      user_id: message.user_id,
      parent_id: message.parent_id,
      is_edited: message.is_edited,
      created_at: message.created_at,
      updated_at: message.updated_at,
      user: message.users,
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Send private message
router.post("/private/:userId", verifyToken, (req, res) => {
  const { userId } = req.params;
  const { content } = req.body;
  const senderId = req.user.id;

  if (!content) {
    return res.status(400).json({ message: "Message content is required" });
  }

  req.db.run(
    "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
    [senderId, userId, content],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: "Server error" });
      }

      // Get the created message with sender info
      req.db.get(
        `SELECT m.*, u.username as sender_name 
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.id = ?`,
        [this.lastID],
        (err, message) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: "Server error" });
          }

          res.status(201).json(message);
        }
      );
    }
  );
});

// Create a new message
router.post("/", verifyToken, async (req, res) => {
  const { content, group_id, parent_id } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Message content is required" });
  }

  if (!group_id) {
    return res.status(400).json({ message: "Group ID is required" });
  }

  try {
    // Check if user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", group_id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        content,
        group_id,
        user_id: req.user.id,
        parent_id: parent_id || null,
        created_at: new Date(),
      })
      .select()
      .single();

    if (messageError) {
      return res.status(500).json({ message: messageError.message });
    }

    // Update group's updated_at timestamp
    await supabase
      .from("groups")
      .update({ updated_at: new Date() })
      .eq("id", group_id);

    // Get user details to return with message
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", req.user.id)
      .single();

    if (userError) {
      return res.status(500).json({ message: userError.message });
    }

    res.status(201).json({
      ...message,
      user,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a message
router.put("/:id", verifyToken, async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Message content is required" });
  }

  try {
    // Check if message exists and belongs to the user
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (messageError) {
      return res.status(500).json({ message: messageError.message });
    }

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this message" });
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from("messages")
      .update({
        content,
        is_edited: true,
        updated_at: new Date(),
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }

    // Get user details to return with message
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", req.user.id)
      .single();

    if (userError) {
      return res.status(500).json({ message: userError.message });
    }

    res.json({
      ...updatedMessage,
      user,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a message
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // Check if message exists and belongs to the user
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (messageError) {
      return res.status(500).json({ message: messageError.message });
    }

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.user_id !== req.user.id) {
      // Check if the user is an admin of the group
      const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", message.group_id)
        .eq("user_id", req.user.id)
        .single();

      if (membershipError || !membership || membership.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this message" });
      }
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", req.params.id);

    if (deleteError) {
      return res.status(500).json({ message: deleteError.message });
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a reaction to a message
router.post("/:id/reactions", verifyToken, async (req, res) => {
  const { reaction } = req.body;

  if (!reaction) {
    return res.status(400).json({ message: "Reaction is required" });
  }

  try {
    // Get the message to check group membership
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("group_id")
      .eq("id", req.params.id)
      .single();

    if (messageError) {
      return res.status(500).json({ message: messageError.message });
    }

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", message.group_id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Add the reaction (or update if it already exists)
    const { data: existingReaction } = await supabase
      .from("message_reactions")
      .select("*")
      .eq("message_id", req.params.id)
      .eq("user_id", req.user.id)
      .eq("reaction", reaction)
      .single();

    if (existingReaction) {
      // Reaction already exists, remove it (toggle behavior)
      const { error: deleteError } = await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (deleteError) {
        return res.status(500).json({ message: deleteError.message });
      }

      res.json({ message: "Reaction removed" });
    } else {
      // Add new reaction
      const { data: newReaction, error: addError } = await supabase
        .from("message_reactions")
        .insert({
          message_id: req.params.id,
          user_id: req.user.id,
          reaction,
        })
        .select()
        .single();

      if (addError) {
        return res.status(500).json({ message: addError.message });
      }

      res.status(201).json({
        message: "Reaction added",
        reaction: newReaction,
      });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get reactions for a message
router.get("/:id/reactions", verifyToken, async (req, res) => {
  try {
    // Get the message to check group membership
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("group_id")
      .eq("id", req.params.id)
      .single();

    if (messageError) {
      return res.status(500).json({ message: messageError.message });
    }

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", message.group_id)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError) {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Get all reactions for the message
    const { data: reactions, error: reactionsError } = await supabase
      .from("message_reactions")
      .select(
        `
        id,
        reaction,
        created_at,
        users:user_id (id, username)
      `
      )
      .eq("message_id", req.params.id);

    if (reactionsError) {
      return res.status(500).json({ message: reactionsError.message });
    }

    // Format the response
    const formattedReactions = reactions.map((reaction) => ({
      id: reaction.id,
      reaction: reaction.reaction,
      created_at: reaction.created_at,
      user: reaction.users,
    }));

    res.json(formattedReactions);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
