import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../supabase';

// Ensure WebBrowser session clears
WebBrowser.maybeCompleteAuthSession();

export const authService = {
    /**
     * Sign up a new citizen
     */
    signUpCitizen: async (email, password, fullName, phone, referralCode = null) => {
        try {
            console.log('🚀 Starting signup process for:', email);
            console.log('📋 User data:', { fullName, phone, referralCode });

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: Linking.createURL('signup-success'), // Redirects back to app -> signup-success
                    data: {
                        full_name: fullName,
                        phone: phone,
                        role: 'citizen',
                        referral_code: referralCode,
                    },
                },
            });

            if (error) {
                console.error('❌ Supabase signup error:', error);
                console.error('Error details:', {
                    message: error.message,
                    status: error.status,
                    code: error.code,
                });
                return { data: null, error };
            }

            console.log('✅ Signup successful:', data);

            // If user was created but profile might not exist, wait and check
            if (data?.user) {
                console.log('👤 User created with ID:', data.user.id);

                // Give trigger time to execute
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Verify profile was created
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, email, role')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError) {
                        console.error('⚠️ Profile check failed:', profileError);
                        console.error('Creating profile manually as fallback...');

                        // Manual profile creation as fallback
                        const { error: insertError } = await supabase
                            .from('profiles')
                            .insert({
                                id: data.user.id,
                                email: email,
                                full_name: fullName,
                                phone: phone,
                                role: 'citizen',
                            });

                        if (insertError) {
                            console.error('❌ Manual profile creation failed:', insertError);
                            return {
                                data: null,
                                error: {
                                    message: 'Database error saving new user',
                                    details: insertError
                                }
                            };
                        } else {
                            console.log('✅ Profile created manually');
                        }
                    } else {
                        console.log('✅ Profile exists:', profile);
                    }
                } catch (checkError) {
                    console.error('❌ Error checking/creating profile:', checkError);
                }
            }

            return { data, error: null };
        } catch (err) {
            console.error('❌ Unexpected error during signup:', err);
            return {
                data: null,
                error: { message: err.message || 'An unexpected error occurred' }
            };
        }
    },

    /**
     * Sign up a new officer
     */
    signUpOfficer: async (email, password, fullName, badgeId, department, jurisdiction) => {
        return await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'officer',
                    badge_id: badgeId,
                    department: department,
                    jurisdiction: jurisdiction,
                },
            },
        });
    },

    /**
     * Sign in with email and password
     */
    signIn: async (email, password) => {
        return await supabase.auth.signInWithPassword({
            email,
            password,
        });
    },

    /**
     * Sign in with Google using OAuth
     */
    signInWithGoogle: async () => {
        try {
            const redirectUrl = AuthSession.makeRedirectUri({
                scheme: 'trafficeye',
                path: 'auth-callback',
                preferNative: true
            });
            console.log('Redirecting to:', redirectUrl);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (!data?.url) throw new Error('No auth URL returned');

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

            if (result.type === 'success' && result.url) {
                // Robust parsing for custom scheme URIs
                const hash = result.url.split('#')[1];
                if (!hash) {
                    return { data: null, error: new Error('Authentication parameters not found in redirect URL') };
                }

                const params = Object.fromEntries(
                    hash.split('&').map(pair => pair.split('='))
                );

                const access_token = params.access_token;
                const refresh_token = params.refresh_token;

                if (access_token && refresh_token) {
                    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    });
                    if (sessionError) throw sessionError;
                    return { data: sessionData, error: null };
                }
            }
            
            return { data: null, error: new Error('Sign in was cancelled or failed') };
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            return { data: null, error };
        }
    },

    /**
     * Sign in with badge ID (for officers)
     */
    signInWithBadge: async (badgeId, password) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('badge_id', badgeId)
            .single();

        if (error || !data) {
            throw new Error('Invalid Badge ID');
        }

        return await authService.signIn(data.email, password);
    },

    /**
     * Sign out
     */
    signOut: async () => {
        return await supabase.auth.signOut();
    },

    /**
     * Reset password
     */
    resetPassword: async (email) => {
        return await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'trafficeye://reset-password',
        });
    },

    /**
     * Sign in with Google OAuth
     */
    signInWithGoogle: async (redirectTo) => {
        return await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                skipBrowserRedirect: true,
            },
        });
    },

    /**
     * Get user profile
     */
    getProfile: async (userId) => {
        return await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
    },

    /**
     * Update user profile
     */
    updateProfile: async (userId, updates) => {
        return await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);
    }
};

export default authService;
