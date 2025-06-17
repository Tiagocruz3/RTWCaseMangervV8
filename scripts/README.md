# User Creation Scripts

This directory contains scripts to create users for the RTW Case Management system.

## Option 1: SQL Script (Recommended for Development)

Use `create-support-user.sql` to create the support user directly in the database:

1. Copy the contents of `create-support-user.sql`
2. Go to your Supabase Dashboard
3. Navigate to SQL Editor
4. Paste and run the script
5. The user will be created with email confirmation enabled

## Option 2: Admin API Script (Recommended for Production)

Use `create-user-via-api.js` for a more robust approach:

1. Install dependencies: `npm install @supabase/supabase-js`
2. Set environment variables:
   - `VITE_SUPABASE_URL` (your Supabase project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (your service role key from Supabase Dashboard > Settings > API)
3. Run: `node scripts/create-user-via-api.js`

## Option 3: Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add user"
4. Fill in:
   - Email: `support@workplaceinterventions.com.au`
   - Password: `Thiago77!`
   - Auto Confirm User: ✅ (Check this)
   - Email Confirm: ✅ (Check this)
5. Click "Create user"
6. The profile will be automatically created via the database trigger

## User Details

- **Email**: support@workplaceinterventions.com.au
- **Password**: Thiago77!
- **Role**: support
- **Name**: Support User

## Troubleshooting

If you encounter issues:

1. Check that the `handle_new_user()` trigger is properly set up
2. Verify RLS policies allow the user creation
3. Check Supabase logs for detailed error messages
4. Ensure your service role key has the necessary permissions

## Security Note

In production environments:
- Use strong, unique passwords
- Consider implementing password policies
- Use the Admin API approach rather than direct SQL manipulation
- Regularly rotate service role keys