import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, authService } from '../services';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore session from storage on app launch — do NOT sign out.
        // The onAuthStateChange listener fires with the persisted session
        // automatically; we only need to set loading=false if there is none.
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                }
            } catch (error) {
                if (__DEV__) console.warn('[Auth] Session restore failed:', error?.message || 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        initAuth();

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
                    if (__DEV__) console.warn('[Auth] State change failed:', error?.message || 'Unknown error');
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
            if (__DEV__) console.warn('[Auth] Session check failed:', error?.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await authService.getProfile(userId);
            if (error || !data) {
                // Profile missing — attempt to create a default one for OAuth / edge cases.
                const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
                if (userError || !currentUser) {
                    setUser(null);
                    setProfile(null);
                    await supabase.auth.signOut();
                    return;
                }

                const newProfile = {
                    id: currentUser.id,
                    full_name: currentUser.user_metadata?.full_name ||
                               currentUser.email?.split('@')[0] || 'User',
                    email: currentUser.email,
                    role: 'citizen',
                    points_balance: 0,
                    created_at: new Date().toISOString(),
                };

                const { error: insertError } = await supabase.from('profiles').upsert(newProfile);
                if (!insertError) {
                    setProfile(newProfile);
                } else {
                    setUser(null);
                    setProfile(null);
                    await supabase.auth.signOut();
                }
            } else {
                setProfile(data);
            }
        } catch (err) {
            if (__DEV__) console.warn('[Auth] Profile fetch failed:', err?.message || 'Unknown error');
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
