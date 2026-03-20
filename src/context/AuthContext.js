import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, authService } from '../services';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }
                setLoading(false);
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
        const { data, error } = await authService.getProfile(userId);
        if (error || !data) {
            // If profile doesn't exist, check if user is logged in and create a default one
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const newProfile = {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                    email: user.email,
                    role: 'citizen', // Default to citizen for OAuth
                    points_balance: 0,
                    created_at: new Date().toISOString(),
                };
                const { error: insertError } = await authService.updateProfile(user.id, newProfile);
                if (!insertError) {
                    setProfile(newProfile);
                } else {
                    console.error('Failed to create profile:', insertError);
                }
            }
        } else {
            setProfile(data);
        }
    };

    const signUpCitizen = async (...args) => authService.signUpCitizen(...args);
    const signUpOfficer = async (...args) => authService.signUpOfficer(...args);
    const signIn = async (...args) => authService.signIn(...args);
    const signInWithBadge = async (...args) => authService.signInWithBadge(...args);
    const signInWithGoogle = async () => authService.signInWithGoogle();
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
        signIn: async (...args) => authService.signIn(...args),
        signInWithBadge: async (...args) => authService.signInWithBadge(...args),
        signInWithGoogle: async () => authService.signInWithGoogle(),
        signOut,
        resetPassword,
        refreshProfile,
        isAuthenticated: !!user,
        isCitizen: profile?.role === 'citizen',
        isOfficer: profile?.role === 'officer',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
