# Xtendplex Chat RLS Policies Setup

This guide explains how to set up Row-Level Security (RLS) policies for the Xtendplex Chat application in Supabase.

## What is Row-Level Security?

Row-Level Security (RLS) is a feature in PostgreSQL that allows you to control access to rows in a table based on a user's identity. This ensures that users can only access the data they're supposed to see, even when they're using the same database connection.

## Why You Need This

Without proper RLS policies, you may encounter errors like:

```
new row violates row-level security policy for table "messages"
```

This happens because Supabase enforces RLS by default, blocking operations unless explicit policies allow them.

## How to Apply These Policies

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Create a new query
4. Paste the entire contents of `complete-rls-setup.sql` into the editor
5. Run the query
6. Restart your application server

## What These Policies Do

The policies in `complete-rls-setup.sql` implement the following security rules:

### Groups Table

- Anyone can create groups
- Users can only view groups they are members of
- Only group admins can update or delete groups

### Group Members Table

- Anyone can add members to groups (for invites)
- Users can see who's in their groups
- Users can update their own membership details
- Group admins can update any membership in their groups
- Users can leave groups (delete their own membership)

### Messages Table

- Users can only send messages to groups they belong to
- Users can only see messages in groups they belong to
- Users can only edit their own messages
- Users can only delete their own messages
- Group admins can delete any message in their groups

### Message Attachments Table

- Users can add attachments to their own messages
- Users can see attachments on messages they can see
- Users can only delete their own attachments
- Users can add attachments with pending messages (upload-first workflow)

### Message Reactions Table

- Users can add reactions to any message they can see
- Users can see reactions on messages they can see
- Users can only delete their own reactions

### Storage Bucket Policies

- Users can upload files to their own user folder
- Users can only view files from messages in groups they belong to
- Users can only delete their own files

## Setting Up File Attachments

For file attachments to work properly:

1. Create a storage bucket called `chat-attachments` in Supabase Storage
2. Ensure the bucket has RLS enabled
3. Use the following pattern for uploading files:
   - Upload to path: `{user_id}/{timestamp}_{filename}`
   - Store the full path in the `file_path` field of `message_attachments`

### Uploading Files (Frontend Code)

```javascript
// Example function to upload a file
async function uploadAttachment(file, userId) {
  const timestamp = new Date().getTime();
  const filePath = `${userId}/${timestamp}_${file.name}`;

  const { data, error } = await supabaseClient.storage
    .from("chat-attachments")
    .upload(filePath, file);

  if (error) throw error;

  return {
    filePath,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };
}

// Example function to send a message with attachments
async function sendMessageWithAttachments(content, groupId, files) {
  // 1. Upload files first
  const attachments = [];
  for (const file of files) {
    const attachment = await uploadAttachment(file, currentUserId);
    attachments.push(attachment);
  }

  // 2. Send message with attachments through socket
  socket.emit("send_message", {
    content,
    groupId,
    attachments,
  });
}
```

### Downloading Files

```javascript
// Example function to get a downloadable URL
async function getDownloadUrl(attachment) {
  const { data, error } = await supabaseClient.storage
    .from("chat-attachments")
    .createSignedUrl(attachment.filePath, 3600);

  if (error) throw error;

  return data.signedUrl;
}
```

## Direct Message Helper Function

The file also includes a helper function `create_direct_message_group` that handles creating direct message groups between users. This function runs with admin privileges to bypass RLS restrictions.

## Performance Optimizations

The file also adds database indexes to improve query performance for common operations.

## Troubleshooting

If you still encounter RLS issues after applying these policies:

1. Verify that the SQL script ran without errors
2. Check if you're using the correct Supabase client with proper authentication
3. Restart your application server to ensure it's using the new policies
4. Verify the JWT token used by your application is valid and not expired

### Common Attachment Issues

If you're having issues with file attachments:

1. **Upload fails**: Check that the user is authenticated and the path follows the format `{user_id}/{filename}`
2. **Download fails**: Verify that the user is a member of the group where the attachment was sent
3. **Permission denied**: Make sure you're using the authenticated Supabase client for operations
