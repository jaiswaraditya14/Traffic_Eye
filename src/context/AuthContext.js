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
        if (!error) setProfile(data);
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
