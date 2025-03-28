-- Create function to create direct message groups that bypasses RLS
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