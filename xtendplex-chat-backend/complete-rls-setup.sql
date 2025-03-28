-- COMPLETE RLS POLICY SETUP FOR XTENDPLEX CHAT APPLICATION
-- Execute this file in Supabase SQL Editor to fix all permission issues

-- =======================================
-- GROUPS TABLE POLICIES
-- =======================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;

-- Create policies for groups table
CREATE POLICY "Enable insert for authenticated users" 
ON public.groups FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can view groups they are members of" 
ON public.groups FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = id 
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update groups" 
ON public.groups FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = id 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

CREATE POLICY "Admins can delete groups" 
ON public.groups FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = id 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- =======================================
-- GROUP_MEMBERS TABLE POLICIES
-- =======================================
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.group_members;
DROP POLICY IF EXISTS "Allow select for members" ON public.group_members;
DROP POLICY IF EXISTS "Allow update own membership" ON public.group_members;
DROP POLICY IF EXISTS "Allow admins to update memberships" ON public.group_members;
DROP POLICY IF EXISTS "Allow delete own membership" ON public.group_members;

-- Create policies for group_members table
CREATE POLICY "Enable insert for authenticated users" 
ON public.group_members FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow select for members" 
ON public.group_members FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_id 
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Allow update own membership" 
ON public.group_members FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow admins to update memberships" 
ON public.group_members FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_id 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

CREATE POLICY "Allow delete own membership" 
ON public.group_members FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- =======================================
-- MESSAGES TABLE POLICIES
-- =======================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert messages to groups they belong to" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in groups they belong to" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can delete any message in their groups" ON public.messages;

-- Create policies for messages table
CREATE POLICY "Users can insert messages to groups they belong to" 
ON public.messages FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_id 
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages in groups they belong to" 
ON public.messages FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_id 
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" 
ON public.messages FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete any message in their groups" 
ON public.messages FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = group_id 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- =======================================
-- MESSAGE_ATTACHMENTS TABLE POLICIES
-- =======================================
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert attachments to their messages" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can view attachments of messages they can see" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.message_attachments;

-- Create policies for message_attachments table
CREATE POLICY "Users can insert attachments to their messages" 
ON public.message_attachments FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages 
    WHERE messages.id = message_id 
    AND messages.user_id = auth.uid()
  )
);

-- Enhanced policy to ensure users can insert attachments with or without an existing message
-- This allows for the pattern where attachments are uploaded first, then linked to a message
CREATE POLICY "Users can insert attachments with pending messages" 
ON public.message_attachments FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can view attachments of messages they can see" 
ON public.message_attachments FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.group_members gm ON m.group_id = gm.group_id
    WHERE m.id = message_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own attachments" 
ON public.message_attachments FOR DELETE 
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.messages 
    WHERE messages.id = message_id 
    AND messages.user_id = auth.uid()
  )
);

-- =======================================
-- MESSAGE_REACTIONS TABLE POLICIES
-- =======================================
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can add reactions to messages they can see" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.message_reactions;

-- Create policies for message_reactions table
CREATE POLICY "Users can add reactions to messages they can see" 
ON public.message_reactions FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.group_members gm ON m.group_id = gm.group_id
    WHERE m.id = message_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view reactions on messages they can see" 
ON public.message_reactions FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.group_members gm ON m.group_id = gm.group_id
    WHERE m.id = message_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own reactions" 
ON public.message_reactions FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- =======================================
-- STORAGE BUCKET POLICIES
-- =======================================

-- Make sure to create the bucket first if it doesn't exist
-- This assumes you have a bucket named 'chat-attachments'
-- Uncomment and modify if your bucket has a different name
-- INSERT INTO storage.buckets (id, name) VALUES ('chat-attachments', 'chat-attachments')
-- ON CONFLICT (id) DO NOTHING;

-- Message attachments storage policies
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments in their groups" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to download attachments from messages in groups they belong to
CREATE POLICY "Users can view attachments in their groups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 FROM public.message_attachments ma
    JOIN public.messages m ON ma.message_id = m.id
    JOIN public.group_members gm ON m.group_id = gm.group_id
    WHERE gm.user_id = auth.uid()
    AND ma.file_path = name
  )
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =======================================
-- DIRECT MESSAGE HELPER FUNCTION
-- =======================================
CREATE OR REPLACE FUNCTION create_direct_message_group(
  current_user_id UUID,
  target_user_id UUID
) RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the privileges of the function creator (admin)
AS $$
DECLARE
  new_group_id UUID;
  result JSONB;
BEGIN
  -- First, check if a DM group already exists between these users
  FOR new_group_id IN 
    SELECT g.id 
    FROM public.groups g
    JOIN public.group_members gm1 ON g.id = gm1.group_id AND gm1.user_id = current_user_id
    JOIN public.group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = target_user_id
    WHERE g.is_direct_message = true
    AND (SELECT COUNT(*) FROM public.group_members WHERE group_id = g.id) = 2
  LOOP
    -- Found existing DM group
    result := jsonb_build_object(
      'success', true,
      'group_id', new_group_id,
      'message', 'Using existing direct message group',
      'is_new', false
    );
    RETURN result;
  END LOOP;

  -- No existing DM group found, create a new one
  INSERT INTO public.groups (
    name,
    is_direct_message,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'Direct Message', -- Name will be updated by frontend
    true,
    current_user_id,
    NOW(),
    NOW()
  ) RETURNING id INTO new_group_id;

  -- Add both users to the group
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES
    (new_group_id, current_user_id, 'member'),
    (new_group_id, target_user_id, 'member');

  result := jsonb_build_object(
    'success', true,
    'group_id', new_group_id,
    'message', 'Created new direct message group',
    'is_new', true
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error creating direct message group: ' || SQLERRM
  );
END;
$$;

-- =======================================
-- FILE ATTACHMENT HELPER FUNCTIONS
-- =======================================

-- Helper function to get downloadable URL for a message attachment
CREATE OR REPLACE FUNCTION get_attachment_url(message_id UUID, file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  can_access BOOLEAN;
  download_url TEXT;
BEGIN
  -- Check if the requesting user has access to this file
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.group_members gm ON m.group_id = gm.group_id
    JOIN public.message_attachments ma ON ma.message_id = m.id
    WHERE m.id = message_id
    AND ma.file_path = file_path
    AND gm.user_id = auth.uid()
  ) INTO can_access;
  
  IF NOT can_access THEN
    RETURN NULL;
  END IF;
  
  -- Generate download URL using storage.create_download_url function
  -- Note: This requires the Supabase storage extension to be enabled
  SELECT storage.create_download_url('chat-attachments', file_path, 3600) 
  INTO download_url;
  
  RETURN download_url;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Enable tracking for all changes
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_attachments REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id); 