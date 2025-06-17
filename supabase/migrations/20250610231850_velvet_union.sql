/*
  # Demo Users Setup Migration

  This migration creates a function to safely insert demo user profiles
  only if the corresponding auth users exist.
  
  IMPORTANT: Before running this migration, you must first create the demo users
  in your Supabase Dashboard:
  
  1. Go to Authentication > Users in your Supabase Dashboard
  2. Click "Add user" and create:
     - Email: john@example.com, Password: password123, Auto Confirm: Yes
     - Email: admin@example.com, Password: admin123, Auto Confirm: Yes
  3. Note down the UUIDs generated for these users
  4. Update this migration with the actual UUIDs if needed
  
  This migration will only succeed if the auth users already exist.
*/

-- Function to safely create demo profiles
CREATE OR REPLACE FUNCTION create_demo_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    john_user_id uuid;
    admin_user_id uuid;
BEGIN
    -- Try to find existing users by email
    SELECT id INTO john_user_id 
    FROM auth.users 
    WHERE email = 'john@example.com' 
    LIMIT 1;
    
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@example.com' 
    LIMIT 1;
    
    -- Create consultant profile if user exists
    IF john_user_id IS NOT NULL THEN
        INSERT INTO profiles (id, email, name, role, created_at, updated_at)
        VALUES (
            john_user_id,
            'john@example.com',
            'John Smith',
            'consultant',
            now(),
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            updated_at = now();
        
        RAISE NOTICE 'Created/updated consultant profile for john@example.com';
    ELSE
        RAISE NOTICE 'User john@example.com not found in auth.users - skipping profile creation';
    END IF;
    
    -- Create admin profile if user exists
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO profiles (id, email, name, role, created_at, updated_at)
        VALUES (
            admin_user_id,
            'admin@example.com',
            'Admin User',
            'admin',
            now(),
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            updated_at = now();
        
        RAISE NOTICE 'Created/updated admin profile for admin@example.com';
    ELSE
        RAISE NOTICE 'User admin@example.com not found in auth.users - skipping profile creation';
    END IF;
END;
$$;

-- Execute the function to create demo profiles
SELECT create_demo_profiles();

-- Clean up the function (optional)
DROP FUNCTION IF EXISTS create_demo_profiles();

-- Create a trigger to automatically create profiles for new users
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
            ELSE 'consultant'
        END,
        now(),
        now()
    );
    RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();