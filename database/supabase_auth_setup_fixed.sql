-- ============================================
-- TRAFFIC_EYE SUPABASE DATABASE SETUP (FIXED)
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'officer')),
    avatar_url TEXT,
    points_balance INTEGER DEFAULT 0,
    -- Officer specific fields
    badge_id TEXT UNIQUE,
    jurisdiction TEXT,
    department TEXT,
    -- Referral system
    referral_code TEXT UNIQUE DEFAULT SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    referred_by UUID REFERENCES profiles(id),
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_badge_id ON profiles(badge_id);

-- ============================================
-- 2. HELPER FUNCTION TO CHECK USER ROLE
-- This bypasses RLS to prevent infinite recursion
-- ============================================
CREATE OR REPLACE FUNCTION is_officer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'officer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. ROW-LEVEL SECURITY FOR PROFILES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Officers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Officers can view all profiles (using helper function to avoid recursion)
CREATE POLICY "Officers can view all profiles" ON profiles
    FOR SELECT USING (is_officer());

-- Allow inserting profile on signup (via trigger)
CREATE POLICY "Enable insert for authenticated users only" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. POINT TRANSACTIONS TABLE (MOVED BEFORE TRIGGER)
-- Tracks all point earnings and redemptions
-- ============================================
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'referral')),
    action TEXT NOT NULL, -- 'report_submitted', 'report_verified', 'first_report', 'referral_success'
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_action ON point_transactions(action);

-- RLS for point transactions
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON point_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON point_transactions;

CREATE POLICY "Users can view own transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON point_transactions
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. TRIGGER: AUTO-CREATE PROFILE ON SIGNUP (FIXED WITH ERROR HANDLING)
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_inserted BOOLEAN := false;
BEGIN
    -- Insert profile (this is the critical part that must succeed)
    BEGIN
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
        profile_inserted := true;
    EXCEPTION WHEN OTHERS THEN
        -- This is critical - if profile insert fails, the signup should fail
        RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 6. POINT RULES TABLE
-- Configurable point earning rules
-- ============================================
CREATE TABLE IF NOT EXISTS point_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type TEXT UNIQUE NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    is_one_time BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

-- Insert your point rules
INSERT INTO point_rules (action_type, points, description, is_one_time) VALUES
('report_submitted', 10, 'Points for submitting a violation report', false),
('report_verified', 50, 'Bonus when officer verifies your report', false),
('first_report', 30, 'One-time bonus for your first report', true),
('referral_success', 50, 'Points when your referred friend joins', false)
ON CONFLICT (action_type) DO NOTHING;

-- RLS for point rules (public read)
ALTER TABLE point_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active rules" ON point_rules;

CREATE POLICY "Anyone can view active rules" ON point_rules
    FOR SELECT USING (is_active = true);

-- ============================================
-- 7. FUNCTION: AWARD POINTS TO USER
-- Call this when awarding points
-- ============================================
CREATE OR REPLACE FUNCTION award_points(
    p_user_id UUID,
    p_action TEXT,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rule RECORD;
    v_existing_count INTEGER;
BEGIN
    -- Get the rule for this action
    SELECT * INTO v_rule FROM point_rules 
    WHERE action_type = p_action AND is_active = true;
    
    IF v_rule IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if one-time bonus already claimed
    IF v_rule.is_one_time THEN
        SELECT COUNT(*) INTO v_existing_count 
        FROM point_transactions 
        WHERE user_id = p_user_id AND action = p_action;
        
        IF v_existing_count > 0 THEN
            RETURN false; -- Already claimed
        END IF;
    END IF;
    
    -- Insert transaction
    INSERT INTO point_transactions (user_id, amount, type, action, reference_id, description)
    VALUES (p_user_id, v_rule.points, 'earned', p_action, p_reference_id, v_rule.description);
    
    -- Update user balance
    UPDATE profiles SET points_balance = points_balance + v_rule.points WHERE id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNCTION: UPDATE TIMESTAMP ON PROFILE CHANGE
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE! Your database is ready.
-- ============================================
