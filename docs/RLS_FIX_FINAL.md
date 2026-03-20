# 🔴 CRITICAL FIX: Row-Level Security Blocking Signup

## 🎯 Root Cause Found!
The error `"Database error saving new user", status: 500, code: "unexpected_failure"` is caused by **Row-Level Security (RLS) policies blocking the trigger** from inserting profiles.

---

## ✅ SOLUTION: Run This SQL (Choose ONE)

### **OPTION 1: Simple Trigger Fix (RECOMMENDED)** ⭐

This recreates the trigger with proper security settings to bypass RLS.

**File**: `database/supabase_trigger_fix.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `database/supabase_trigger_fix.sql`
3. Paste and click **RUN**
4. Test signup again

---

### **OPTION 2: Update RLS Policy**

This updates the RLS policy to allow trigger inserts.

**File**: `database/supabase_rls_fix.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `database/supabase_rls_fix.sql`
3. Paste and click **RUN**
4. Test signup again

---

## 🚀 Quick Copy-Paste Fix (Fastest)

Just copy this and run it in Supabase SQL Editor:

```sql
-- Recreate trigger with proper security settings
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
    referrer_id UUID;
BEGIN
    -- Try to find referrer
    BEGIN
        IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL AND 
           NEW.raw_user_meta_data->>'referral_code' != '' THEN
            SELECT id INTO referrer_id 
            FROM profiles 
            WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
            LIMIT 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        referrer_id := NULL;
    END;

    -- Insert profile (bypasses RLS)
    INSERT INTO profiles (
        id, email, full_name, phone, role, 
        badge_id, department, jurisdiction, referred_by
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'),
        NEW.raw_user_meta_data->>'badge_id',
        NEW.raw_user_meta_data->>'department',
        NEW.raw_user_meta_data->>'jurisdiction',
        referrer_id
    );

    -- Award referral bonus
    IF referrer_id IS NOT NULL THEN
        BEGIN
            UPDATE profiles 
            SET points_balance = points_balance + 50 
            WHERE id = referrer_id;
            
            INSERT INTO point_transactions (
                user_id, amount, type, action, 
                reference_id, description
            )
            VALUES (
                referrer_id, 50, 'referral', 'referral_success', 
                NEW.id, 'Referral bonus for inviting a friend'
            );
        EXCEPTION WHEN OTHERS THEN
            -- Ignore referral bonus errors
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 📝 What Changed?

| Issue | Fix |
|-------|-----|
| Trigger couldn't bypass RLS | Added `SECURITY DEFINER` |
| Search path ambiguity | Added `SET search_path = public` |
| RLS blocking profile insert | Function now runs with elevated privileges |

---

## ✅ After Running the SQL:

1. Go back to your app
2. Try signing up with a **NEW email**
3. Watch the console - you should see:
   ```
   🚀 Starting signup process for: test@example.com
   ✅ Signup successful
   ✅ Profile exists
   ```
4. Success screen should appear! 🎉

---

## 🆘 If It STILL Fails:

Run this diagnostic in Supabase SQL Editor:

```sql
-- Check if trigger was recreated
SELECT tgname, tgenabled, proname, prosecdef
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';
```

Send me the results!

---

## 🎯 Expected Result

After running the SQL fix:
- ✅ Trigger recreated with `SECURITY DEFINER`
- ✅ Trigger can bypass RLS policies
- ✅ Profile creation succeeds
- ✅ Signup works! 🚀

**Copy the SQL above, run it in Supabase, then test signup!**
