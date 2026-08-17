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
        // This is the ONLY auth state listener — single source of truth.
        // Events handled: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted.current) return;

                if (__DEV__) console.log(`[AUTH] AUTH_EVENT: ${event} | session exists: ${!!session}`);

                try {
                    if (event === 'SIGNED_OUT' || !session) {
                        // Supabase explicitly reported SIGNED_OUT — the session is gone.
                        // This is the authoritative signal to clear auth state.
                        if (isMounted.current) { setUser(null); setProfile(null); }
                    } else if (session?.user) {
                        // Session and user are valid — update user state and load profile.
                        // Profile fetch failure will NOT sign the user out (handled in fetchProfile).
                        if (isMounted.current) setUser(session.user);
                        await fetchProfile(session.user.id);
                    }
                } catch (error) {
                    // This catch only fires if fetchProfile itself throws uncaught —
                    // which should not happen as fetchProfile has its own error boundary.
                    // Do NOT sign out here — the session event (not profile) triggered this.
                    if (__DEV__) console.warn('[AUTH] onAuthStateChange outer error:', error?.message);
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
        if (__DEV__) console.log('[AUTH] PROFILE_FETCH_START | user exists: true');

        // Race against a 15-second timeout.
        // On timeout: user stays authenticated — profile shown as null → ProfileLoadingScreen.
        // We do NOT sign out on timeout because the auth session is still valid.
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('PROFILE_TIMEOUT')), 15000)
        );

        try {
            await Promise.race([
                (async () => {
                    const { data, error } = await authService.getProfile(userId);

                    if (error || !data) {
                        if (__DEV__) console.log('[AUTH] PROFILE_NOT_FOUND — attempting upsert for new OAuth user');

                        // Profile row missing — this is expected for first-time Google Sign-In.
                        // Verify the Supabase session is still valid before attempting upsert.
                        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

                        if (userError || !currentUser) {
                            // supabase.auth.getUser() returned an error or null user.
                            // This means Supabase itself reports no valid auth — safe to clear state.
                            if (__DEV__) console.log('[AUTH] getUser() returned no user — clearing state');
                            if (isMounted.current) { setUser(null); setProfile(null); }
                            // Do not call signOut() — Supabase already has no session.
                            return;
                        }

                        // Session confirmed valid — create profile row for new OAuth user.
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
                            if (__DEV__) console.log('[AUTH] PROFILE_FETCH_SUCCESS (newly created)');
                            if (isMounted.current) setProfile(newProfile);
                        } else {
                            // Profile upsert failed (DB/RLS error) — but the auth session IS valid.
                            // Keep user authenticated with profile=null → ProfileLoadingScreen.
                            // Do NOT sign out — this is a database failure, not an auth failure.
                            if (__DEV__) console.warn('[AUTH] PROFILE_UPSERT_FAILED | status:', insertError?.code, '| session remains valid');
                            if (isMounted.current) setProfile(null);
                        }
                    } else {
                        if (__DEV__) console.log('[AUTH] PROFILE_FETCH_SUCCESS | role:', data?.role);
                        if (isMounted.current) setProfile(data);
                    }
                })(),
                timeoutPromise,
            ]);
        } catch (err) {
            // Catches: network errors, DB errors, RLS violations, and PROFILE_TIMEOUT.
            // CRITICAL: Profile fetch failure MUST NOT sign the user out.
            // Verify session state via Supabase before deciding any action.
            if (__DEV__) console.warn('[AUTH] PROFILE_FETCH_FAILED | reason:', err?.message?.substring(0, 80));

            if (err?.message === 'PROFILE_TIMEOUT') {
                // Timeout: session is likely still valid. Keep user authenticated.
                // ProfileLoadingScreen will be shown (isAuthenticated=true, profile=null).
                if (__DEV__) console.warn('[AUTH] PROFILE_FETCH_FAILED — timeout, keeping session alive');
                if (isMounted.current) setProfile(null); // stay authenticated

                const { Alert } = require('react-native');
                Alert.alert(
                    'Connection Issue',
                    'Profile data could not be loaded. Please check your connection.',
                    [{ text: 'Retry', onPress: () => { if (user?.id) fetchProfile(user.id); } },
                     { text: 'OK' }]
                );
                return;
            }

            // For all other errors (network, DB, RLS): check whether the Supabase
            // session is actually still valid before considering any state change.
            // This is the authoritative check — not string matching on error messages.
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();

                if (currentSession) {
                    // Session is valid. Profile fetch failed for non-auth reasons (network/DB/RLS).
                    // Keep the user authenticated. Profile=null → ProfileLoadingScreen.
                    // DO NOT call signOut().
                    if (__DEV__) console.log('[AUTH] PROFILE_FETCH_FAILED | session still valid — keeping user authenticated');
                    if (isMounted.current) setProfile(null);
                } else {
                    // Supabase confirms there is no active session.
                    // Clear auth state — this is a genuine unauthenticated state.
                    if (__DEV__) console.log('[AUTH] PROFILE_FETCH_FAILED | no session confirmed — clearing auth state');
                    if (isMounted.current) { setUser(null); setProfile(null); }
                    // onAuthStateChange(SIGNED_OUT) will fire naturally from Supabase.
                }
            } catch (sessionCheckErr) {
                // getSession() itself failed (severe network issue).
                // Do not sign out — we cannot confirm session is invalid.
                // Keep current auth state unchanged. User remains on ProfileLoadingScreen.
                if (__DEV__) console.warn('[AUTH] getSession() check failed — preserving current state');
                if (isMounted.current) setProfile(null);
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
