# RTW Case Management Setup Instructions

## Supabase Authentication Setup

To resolve the authentication error and set up demo users, follow these steps:

### Step 1: Create Demo Users in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** and create the following users:

#### Consultant User
- **Email**: `john@example.com`
- **Password**: `password123`
- **Auto Confirm User**: ✅ (Check this box)
- **Email Confirm**: ✅ (Check this box)

#### Admin User
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Auto Confirm User**: ✅ (Check this box)
- **Email Confirm**: ✅ (Check this box)

### Step 2: Run the Migration

After creating the users in the dashboard:

1. The migration will automatically detect the created users
2. It will create corresponding profiles in the `profiles` table
3. A trigger is set up to automatically create profiles for any new users

### Step 3: Verify Setup

1. Go to **Database** → **Table Editor** → **profiles**
2. You should see two profile records created
3. Try logging in with the demo credentials:
   - Consultant: `john@example.com` / `password123`
   - Admin: `admin@example.com` / `admin123`

### Troubleshooting

If you still get authentication errors:

1. **Check User Status**: In Authentication → Users, ensure both users show as "Confirmed"
2. **Check Profiles**: In Database → profiles table, verify the profile records exist
3. **Check Email Confirmation**: Make sure "Auto Confirm User" was checked when creating users
4. **Re-run Migration**: If profiles weren't created, you can re-run the migration

### Production Setup

For production deployment:

1. Remove or disable the demo users
2. Set up proper user registration flow
3. Configure email templates and SMTP settings
4. Set up proper role-based access control
5. Configure RLS policies for your specific needs

### Environment Variables

Make sure your `.env` file contains:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Next Steps

Once authentication is working:

1. Test the login functionality
2. Explore the case management features
3. Set up additional users as needed
4. Configure any additional Supabase features (Storage, Edge Functions, etc.)