/*
  # Create Support User Migration

  This migration creates a support user account safely using Supabase's recommended approach.
  
  1. Creates a function to handle user creation via Auth API simulation
  2. Creates the profile record for the support user
  3. Ensures proper role assignment
  
  Note: The actual user creation should be done via Supabase Dashboard or Auth API.
  This migration only ensures the profile structure is ready.
*/

-- Create a function to safely create support user profile
CREATE OR REPLACE FUNCTION create_support_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    support_user_id uuid;
BEGIN
    -- Try to find existing user by email
    SELECT id INTO support_user_id 
    FROM auth.users 
    WHERE email = 'support@workplaceinterventions.com.au' 
    LIMIT 1;
    
    -- If user exists, create/update profile
    IF support_user_id IS NOT NULL THEN
        INSERT INTO profiles (id, email, name, role, created_at, updated_at)
        VALUES (
            support_user_id,
            'support@workplaceinterventions.com.au',
            'Support User',
            'support',
            now(),
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            updated_at = now();
        
        RAISE NOTICE 'Created/updated support profile for support@workplaceinterventions.com.au';
    ELSE
        RAISE NOTICE 'User support@workplaceinterventions.com.au not found in auth.users';
        RAISE NOTICE 'Please create this user via Supabase Dashboard:';
        RAISE NOTICE '1. Go to Authentication > Users';
        RAISE NOTICE '2. Click "Add user"';
        RAISE NOTICE '3. Email: support@workplaceinterventions.com.au';
        RAISE NOTICE '4. Password: Thiago77!';
        RAISE NOTICE '5. Check "Auto Confirm User" and "Email Confirm"';
        RAISE NOTICE '6. Click "Create user"';
        RAISE NOTICE 'The profile will be automatically created with support role.';
    END IF;
END;
$$;

-- Execute the function to create support user profile
SELECT create_support_user_profile();

-- Update the user creation trigger to handle support role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (id, email, name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@example.com' THEN 'admin'
            WHEN NEW.email = 'support@workplaceinterventions.com.au' THEN 'support'
            ELSE 'consultant'
        END,
        now(),
        now()
    );
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Clean up the function
DROP FUNCTION IF EXISTS create_support_user_profile();

-- Add a comment for future reference
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profiles with appropriate roles when new users are created via Supabase Auth';