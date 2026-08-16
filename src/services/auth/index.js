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
    signUpCitizen: async (email, password, fullName, phone) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: Linking.createURL('signup-success'),
                    data: {
                        full_name: fullName,
                        phone: phone,
                        role: 'citizen',
                    },
                },
            });

            if (error) {
                return { data: null, error };
            }

            // Give trigger time to execute and create the profile row
            if (data?.user) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Verify profile was created
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, email, role')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError) {
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
                            return {
                                data: null,
                                error: { message: 'Database error saving new user', details: insertError }
                            };
                        }
                    }
                } catch (checkError) {
                    // Non-fatal — auth succeeded, profile may still be created by trigger
                }
            }

            return { data, error: null };
        } catch (err) {
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
     * Sign in with badge ID (for officers).
     * Uses a SECURITY DEFINER RPC to retrieve the officer's email without
     * exposing the profiles table to direct enumeration.
     */
    signInWithBadge: async (badgeId, password) => {
        const { data: email, error } = await supabase
            .rpc('get_officer_email_by_badge', { p_badge_id: badgeId });

        if (error || !email) {
            throw new Error('Invalid Badge ID');
        }

        return await authService.signIn(email, password);
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
