import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, authService } from '../services';
import { sendLocalNotification } from '../services/notifications';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        // Supabase v2 fires INITIAL_SESSION on startup (with persisted session or null).
        // This is the single source of truth — no need for a separate getSession() call.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted.current) return;
                try {
                    if (event === 'SIGNED_OUT' || !session) {
                        setUser(null);
                        setProfile(null);
                    } else if (session?.user) {
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                    }
                } catch (error) {
                    if (__DEV__) console.warn('[Auth] State change failed:', error?.message || 'Unknown error');
                    if (error?.message?.includes('Refresh Token') || error?.message?.includes('invalid_grant')) {
                        try {
                            await supabase.auth.signOut();
                        } catch (sErr) {}
                        if (isMounted.current) {
                            setUser(null);
                            setProfile(null);
                        }
                    }
                } finally {
                    if (isMounted.current) setLoading(false);
                }
            }
        );

        return () => {
            isMounted.current = false;
            subscription.unsubscribe();
        };
    }, []);


    const fetchProfile = async (userId) => {
        // Race against a 10-second timeout so Google Sign-In never leaves the user
        // stuck on a blank loading screen if the network or RLS fails.
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timed out')), 10000)
        );

        try {
            await Promise.race([
                (async () => {
                    const { data, error } = await authService.getProfile(userId);
                    if (error || !data) {
                        // Profile missing — attempt to create a default one for OAuth / edge cases.
                        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
                        if (userError || !currentUser) {
                            if (isMounted.current) { setUser(null); setProfile(null); }
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
                            if (isMounted.current) setProfile(newProfile);
                        } else {
                            if (isMounted.current) { setUser(null); setProfile(null); }
                            await supabase.auth.signOut();
                        }
                    } else {
                        if (isMounted.current) setProfile(data);
                    }
                })(),
                timeoutPromise,
            ]);
        } catch (err) {
            if (__DEV__) console.warn('[Auth] Profile fetch failed:', err?.message || 'Unknown error');
            if (isMounted.current) { setUser(null); setProfile(null); }
            await supabase.auth.signOut();
            // Only alert on timeout (not on normal sign-out during unmount)
            if (err?.message === 'Profile fetch timed out') {
                const { Alert } = require('react-native');
                Alert.alert(
                    'Connection Issue',
                    'Could not complete sign-in. Please check your connection and try again.',
                    [{ text: 'OK' }]
                );
            }
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

    // ── Realtime: fire OS notification when a new DB notification arrives ──────
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`notifications_push_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const notif = payload?.new;
                    if (!notif) return;

                    // Map notification type to a human-readable title
                    const titleMap = {
                        report_approved:  '✅ Report Approved',
                        report_rejected:  '❌ Report Rejected',
                        report_pending:   '⏳ Report Under Review',
                        points_awarded:   '🏆 Points Awarded!',
                        reward_redeemed:  '🎁 Reward Redeemed',
                        system:           '📢 Traffic Eye',
                    };

                    const title = titleMap[notif.type] || '📢 Traffic Eye';
                    const body  = notif.message || 'You have a new notification.';

                    // Fire local OS notification — respects phone mute/DND/ringtone
                    sendLocalNotification(title, body, {
                        screen:   notif.report_id ? 'ReportDetail' : 'Notifications',
                        reportId: notif.report_id ?? null,
                        notifId:  notif.id,
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

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
