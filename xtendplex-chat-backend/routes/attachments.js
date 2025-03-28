const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const supabase = require("../utils/supabase");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Upload a file attachment to a message
router.post("/:messageId", verifyToken, async (req, res) => {
  const { file_path, file_type, file_name, file_size } = req.body;

  if (!file_path || !file_type || !file_name || !file_size) {
    return res.status(400).json({ message: "All file de/tails are required" });
  }

  try {
    // Check if message exists and user is authorized
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("group_id, user_id")
      .eq("id", req.params.messageId)
      .single();

    if (messageError) {
      return res.status(500).json({ message: messageError.message });
    }

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Verify user is the message sender or a group admin
    let authorized = message.user_id === req.user.id;

    if (!authorized) {
      // Check if user is a group admin
      const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", message.group_id)
        .eq("user_id", req.user.id)
        .single();

      if (membershipError && membershipError.code !== "PGRST116") {
        return res.status(500).json({ message: membershipError.message });
      }

      authorized = membership && membership.role === "admin";
    }

    if (!authorized) {
      return res
        .status(403)
        .json({ message: "Not authorized to attach files to this message" });
    }

    // Add the attachment
    const { data: attachment, error: attachmentError } = await supabase
      .from("message_attachments")
      .insert({
        message_id: req.params.messageId,
        file_path,
        file_type,
        file_name,
        file_size,
      })
      .select()
      .single();

    if (attachmentError) {
      return res.status(500).json({ message: attachmentError.message });
    }

    res.status(201).json({
      message: "Attachment added successfully",
      attachment,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all attachments for a message
router.get("/message/:messageId", verifyToken, async (req, res) => {
  try {
    // Check if message exists
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("group_id")
      .eq("id", req.params.messageId)
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

    if (membershipError && membershipError.code !== "PGRST116") {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Get all attachments for the message
    const { data: attachments, error: attachmentsError } = await supabase
      .from("message_attachments")
      .select("*")
      .eq("message_id", req.params.messageId);

    if (attachmentsError) {
      return res.status(500).json({ message: attachmentsError.message });
    }

    res.json(attachments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all attachments for a group (paginated)
router.get("/group/:groupId", verifyToken, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  try {
    // Check if user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", req.params.groupId)
      .eq("user_id", req.user.id)
      .single();

    if (membershipError && membershipError.code !== "PGRST116") {
      return res.status(500).json({ message: membershipError.message });
    }

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Get all attachments for the group
    const { data: attachments, error: attachmentsError } = await supabase
      .from("message_attachments")
      .select(
        `
        id,
        file_path,
        file_type,
        file_name,
        file_size,
        created_at,
        messages:message_id (
          id,
          content,
          user_id,
          users:user_id (
            id,
            username
          )
        )
      `
      )
      .eq("messages.group_id", req.params.groupId)
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (attachmentsError) {
      return res.status(500).json({ message: attachmentsError.message });
    }

    // Format the response
    const formattedAttachments = attachments.map((attachment) => ({
      id: attachment.id,
      file_path: attachment.file_path,
      file_type: attachment.file_type,
      file_name: attachment.file_name,
      file_size: attachment.file_size,
      created_at: attachment.created_at,
      message: {
        id: attachment.messages.id,
        content: attachment.messages.content,
        user: attachment.messages.users,
      },
    }));

    res.json(formattedAttachments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete an attachment
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // Get the attachment to check message ownership
    const { data: attachment, error: attachmentError } = await supabase
      .from("message_attachments")
      .select("message_id")
      .eq("id", req.params.id)
      .single();

    if (attachmentError) {
      return res.status(500).json({ message: attachmentError.message });
    }

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // Get the message to check ownership
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("user_id, group_id")
      .eq("id", attachment.message_id)
      .single();

    if (messageError) {
      return res.status(500).json({ message: messageError.message });
    }

    // Check if user is the message owner or a group admin
    let authorized = message.user_id === req.user.id;

    if (!authorized) {
      // Check if user is a group admin
      const { data: membership, error: membershipError } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", message.group_id)
        .eq("user_id", req.user.id)
        .single();

      if (membershipError && membershipError.code !== "PGRST116") {
        return res.status(500).json({ message: membershipError.message });
      }

      authorized = membership && membership.role === "admin";
    }

    if (!authorized) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this attachment" });
    }

    // Delete the attachment
    const { error: deleteError } = await supabase
      .from("message_attachments")
      .delete()
      .eq("id", req.params.id);

    if (deleteError) {
      return res.status(500).json({ message: deleteError.message });
    }

    res.json({ message: "Attachment deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
