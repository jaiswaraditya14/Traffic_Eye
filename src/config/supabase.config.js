// Supabase Configuration
// Centralized configuration for Supabase connection

export const SUPABASE_CONFIG = {
<<<<<<< Updated upstream
    url: 'https://dstincwwyddrimcfgzfs.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdGluY3d3eWRkcmltY2ZnemZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDg0MDUsImV4cCI6MjA4NTY4NDQwNX0.ulc_7KAzccIFsRyS5RxEY9MA1xR6ISRA4QI16ZIW8ps',
=======
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
>>>>>>> Stashed changes
};
