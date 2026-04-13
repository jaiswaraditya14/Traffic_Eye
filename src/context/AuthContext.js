import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, authService } from '../services';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
<<<<<<< HEAD
<<<<<<< Updated upstream
        checkSession();
=======
        // Enterprise Security Requirement: Clear any cached session on app launch
        // to strictly enforce the "Sign In -> User Dashboard" flow every time.
        const enforceStrictAuth = async () => {
            await supabase.auth.signOut();
            setLoading(false);
        };
        
        enforceStrictAuth();
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a

=======
        // We simplified the strict auth enforcement to prevent startup hangs
        setLoading(false);
        
>>>>>>> Stashed changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                try {
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        await fetchProfile(session.user.id);
                    } else {
                        setProfile(null);
                    }
                } catch (error) {
                    console.error('Auth state change error:', error);
                } finally {
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            }
        } catch (error) {
            console.error('Session check error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await authService.getProfile(userId);
            if (error || !data) {
                // If profile doesn't exist, check if user is logged in and create a default one
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    console.error('User not found or session invalid', userError);
                    setUser(null);
                    setProfile(null);
                    await supabase.auth.signOut();
                    return;
                }
                
                const newProfile = {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                    email: user.email,
                    role: 'citizen', // Default to citizen for OAuth
                    points_balance: 0,
                    created_at: new Date().toISOString(),
                };
                
                // Use upsert to ensure it correctly creates the profile if missing
                const { error: insertError } = await supabase.from('profiles').upsert(newProfile);
                if (!insertError) {
                    setProfile(newProfile);
                } else {
                    console.error('Failed to create profile:', insertError);
                    setUser(null);
                    setProfile(null);
                    await supabase.auth.signOut();
                }
            } else {
                setProfile(data);
            }
        } catch (err) {
            console.error('Fatal error fetching profile:', err);
            setUser(null);
            setProfile(null);
            await supabase.auth.signOut();
        }
    };

    const signUpCitizen = async (...args) => authService.signUpCitizen(...args);
    const signUpOfficer = async (...args) => authService.signUpOfficer(...args);
    const signIn = async (...args) => authService.signIn(...args);
    const signInWithBadge = async (...args) => authService.signInWithBadge(...args);
    const signInWithGoogle = async (...args) => authService.signInWithGoogle(...args);
    const signOut = async () => authService.signOut();
    const resetPassword = async (email) => authService.resetPassword(email);

    const refreshProfile = async () => {
        if (user?.id) await fetchProfile(user.id);
    };

    const value = {
        user,
        profile,
        loading,
        signUpCitizen,
        signUpOfficer,
        signIn,
        signInWithBadge,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshProfile,
        isAuthenticated: !!user,
        isCitizen: profile?.role === 'citizen',
        isOfficer: profile?.role === 'officer',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
