# Traffic Eye - Sign Up Fix Guide

## Problem Summary
New users cannot sign up due to a "Database error saving new user" error.

## Root Causes Identified

### 1. **Database Trigger Errors**
The `handle_new_user()` trigger function lacks error handling, causing the entire signup process to fail if any part of the trigger encounters an issue.

### 2. **Table Creation Order Issue**
The `point_transactions` table is created AFTER the trigger that references it, which can cause dependency issues.

### 3. **No Graceful Degradation**
If the referral bonus system fails, the entire signup fails instead of just logging a warning and continuing.

### 4. **Missing NULL Checks**
Insufficient validation of metadata fields before insertion.

---

## Solutions to Fix

### Option 1: Update Database Schema (RECOMMENDED)

#### Step 1: Run the Fixed SQL Script
1. Open your Supabase Dashboard: https://dstincwwyddrimcfgzfs.supabase.co
2. Navigate to **SQL Editor**
3. Open the file: `database/supabase_auth_setup_fixed.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click **Run** to execute

This will:
- ✅ Add proper error handling to the trigger
- ✅ Move `point_transactions` table creation before the trigger
- ✅ Add TRY-CATCH blocks to prevent signup failures
- ✅ Make referral bonus non-critical (won't fail signup if it errors)
- ✅ Add proper NULL checks and validation

#### Step 2: Test Sign Up
After running the SQL, try signing up with a new account to verify it works.

---

### Option 2: Add Client-Side Fallback (ADDITIONAL)

If the trigger still fails, add a fallback profile creation on the client:

**Update: `src/services/auth/index.js`**

Replace the `signUpCitizen` function with:

```javascript
signUpCitizen: async (email, password, fullName, phone, referralCode = null) => {
    try {
        // Attempt to sign up
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone,
                    role: 'citizen',
                    referral_code: referralCode,
                },
            },
        });

        if (error) {
            return { data: null, error };
        }

        // If signup succeeded but profile wasn't created by trigger, create it manually
        if (data?.user) {
            // Wait a bit for trigger to execute
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if profile exists
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .single();
            
            // If profile doesn't exist, create it manually
            if (profileError || !profile) {
                console.log('Trigger failed, creating profile manually...');
                
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        email: email,
                        full_name: fullName,
                        phone: phone,
                        role: 'citizen',
                        referral_code: SUBSTRING(MD5(RANDOM()::TEXT), 1, 8), // Generate unique code
                    });
                
                if (insertError) {
                    console.error('Manual profile creation failed:', insertError);
                    return { 
                        data: null, 
                        error: { message: 'Database error saving new user' } 
                    };
                }
            }
        }

        return { data, error: null };
    } catch (err) {
        console.error('Sign up error:', err);
        return { 
            data: null, 
            error: { message: err.message || 'An unexpected error occurred' } 
        };
    }
},
```

---

## Quick Fix Checklist

- [ ] **Step 1**: Run `supabase_auth_setup_fixed.sql` in Supabase SQL Editor
- [ ] **Step 2**: Test signup with a new email address
- [ ] **Step 3**: If still failing, check Supabase Logs for detailed errors
- [ ] **Step 4**: (Optional) Implement client-side fallback if needed

---

## Debugging Steps

If signup still fails after applying the fix:

### 1. Check Supabase Logs
- Go to Supabase Dashboard → Logs → Postgres Logs
- Look for errors during signup attempts
- Check what exactly is failing

### 2. Verify Database Setup
Run this query in SQL Editor to check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- `profiles`
- `point_transactions`
- `point_rules`

### 3. Test Trigger Manually
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

### 4. Check RLS Policies
```sql
-- View all policies on profiles table
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## Expected Behavior After Fix

✅ **New users can sign up without errors**
✅ **Profile is automatically created in `profiles` table**
✅ **If referral code is valid, referrer gets 50 points**
✅ **If referral fails, signup still succeeds (graceful degradation)**
✅ **Proper error messages are logged but don't block signup**

---

## Additional Notes

- The fixed SQL script is **idempotent** - you can run it multiple times safely
- Existing data will NOT be affected
- Only the trigger function and table creation order are changed
- All existing policies and indexes are preserved

---

## Need More Help?

If signup still fails after these fixes:
1. Check Supabase Logs for the specific error
2. Verify your Supabase connection is working (in `src/config/supabase.config.js`)
3. Ensure your Supabase project has the correct permissions set
