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
DECLARE
    referrer_id UUID;
BEGIN
    -- Try to find referrer if referral code provided
    BEGIN
        IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL AND 
           NEW.raw_user_meta_data->>'referral_code' != '' THEN
            SELECT id INTO referrer_id 
            FROM profiles 
            WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
            LIMIT 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Referral lookup failed: %', SQLERRM;
        referrer_id := NULL;
    END;

    -- Insert profile (bypasses RLS because of SECURITY DEFINER)
    INSERT INTO profiles (
        id, 
        email, 
        full_name, 
        phone, 
        role, 
        badge_id, 
        department, 
        jurisdiction, 
        referred_by
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

    -- Award referral bonus if applicable
    IF referrer_id IS NOT NULL THEN
        BEGIN
            UPDATE profiles 
            SET points_balance = points_balance + 50 
            WHERE id = referrer_id;
            
            INSERT INTO point_transactions (
                user_id, 
                amount, 
                type, 
                action, 
                reference_id, 
                description
            )
            VALUES (
                referrer_id, 
                50, 
                'referral', 
                'referral_success', 
                NEW.id, 
                'Referral bonus for inviting a friend'
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to award referral bonus: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
