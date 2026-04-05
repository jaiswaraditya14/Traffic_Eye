-- ============================================
-- SIMPLE FIX: Disable RLS Check for Trigger
-- This makes the trigger bypass RLS completely
-- ============================================

-- Recreate the trigger function with SECURITY DEFINER
-- This allows it to bypass RLS policies
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- This is critical - allows bypassing RLS
SET search_path = public
AS $$
    -- Insert profile (bypasses RLS because of SECURITY DEFINER)
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        phone, 
        role, 
        badge_id, 
        department, 
        jurisdiction
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'),
        NEW.raw_user_meta_data->>'badge_id',
        NEW.raw_user_meta_data->>'department',
        NEW.raw_user_meta_data->>'jurisdiction'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
