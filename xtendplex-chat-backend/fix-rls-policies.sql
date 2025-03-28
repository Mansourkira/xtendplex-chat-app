-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow insert for authenticated users
CREATE POLICY "Enable insert for authenticated users" 
ON public.groups FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create a policy to allow select for users who are members of the group
CREATE POLICY "Users can view groups they are members of" 
ON public.groups FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = id 
    AND group_members.user_id = auth.uid()
  )
);

-- Create a policy to allow update for admin members
CREATE POLICY "Admins can update groups" 
ON public.groups FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = id 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- Create a policy to allow delete for admin members
CREATE POLICY "Admins can delete groups" 
ON public.groups FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_members.group_id = id 
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- Add policy for group_members table as well
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Allow insert for authenticated users 
CREATE POLICY "Enable insert for authenticated users" 
ON public.group_members FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow select for members
CREATE POLICY "Allow select for members" 
ON public.group_members FOR SELECT 
USING (user_id = auth.uid() OR 
       EXISTS (
         SELECT 1 FROM public.group_members 
         WHERE group_members.group_id = group_id 
         AND group_members.user_id = auth.uid()
       )
     ); 