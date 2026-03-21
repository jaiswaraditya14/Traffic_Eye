// Supabase Configuration
// Centralized configuration for Supabase connection

export const SUPABASE_CONFIG = {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};
