import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useAppContext, useAuth } from '../context';

// Navigators
import CitizenNavigator from './CitizenNavigator';
import OfficerNavigator from './OfficerNavigator';

// Screens
import {
    OnboardingCarousel,
    RoleSelection,
    CitizenSignIn,
    CitizenSignUp,
    SignUpSuccess,
    OfficerSignIn,
    ForgotPassword,
    OtpVerification,
    NewPassword,
} from '../screens';

const Stack = createNativeStackNavigator();

const prefix = Linking.createURL('/');

const linking = {
    prefixes: [prefix, 'trafficeye://'],
    config: {
        screens: {
            SignUpSuccess: 'signup-success',
            OtpVerification: 'auth/callback',
            NewPassword: 'reset-password',
        }
    }
};

function ProfileLoadingScreen() {
    const { signOut } = useAuth();
    const [showCancel, setShowCancel] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in the main content
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        // Show cancel button after 8 seconds
        const timer = setTimeout(() => setShowCancel(true), 8000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[profileLoadingStyles.container, { opacity: fadeAnim }]}>
            <View style={profileLoadingStyles.iconWrap}>
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
            <Text style={profileLoadingStyles.title}>Setting up your account…</Text>
            <Text style={profileLoadingStyles.subtitle}>This usually takes a few seconds</Text>
            {showCancel && (
                <TouchableOpacity
                    style={profileLoadingStyles.cancelBtn}
                    onPress={() => signOut()}
                    activeOpacity={0.8}
                >
                    <Text style={profileLoadingStyles.cancelText}>Cancel &amp; Sign In Again</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const profileLoadingStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A1E3F',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(245,158,11,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Nunito-Bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Nunito-Medium',
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
        marginBottom: 40,
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.5)',
    },
    cancelText: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        color: '#F59E0B',
    },
});

export default function AppNavigator({ navigationRef }) {
    const { hasSeenOnboarding, onboardingLoading } = useAppContext();
    const { isAuthenticated, loading, profile } = useAuth();
    const hasHiddenSplashRef = useRef(false);

    // App is initializing while:
    //  - auth session is being restored from AsyncStorage / Supabase (loading), OR
    //  - onboarding flag is being read from AsyncStorage (onboardingLoading).
    // Both must resolve before the initial route is committed.
    // This prevents sign-in flash AND onboarding flash on cold start.
    const isAppInitializing = loading || onboardingLoading;

    const handleNavigationReady = useCallback(() => {
        if (!hasHiddenSplashRef.current) {
            hasHiddenSplashRef.current = true;
            SplashScreen.hideAsync().catch(() => {});
        }
    }, []);

    useEffect(() => {
        if (!isAppInitializing) {
            handleNavigationReady();
        }
    }, [isAppInitializing, handleNavigationReady]);

    // While auth and onboarding states are resolving, render plain background view
    // while native splash remains visible via preventAutoHideAsync.
    if (isAppInitializing) {
        return <View style={{ flex: 1, backgroundColor: '#0A1E3F' }} />;
    }

    // Navigation funnel:
    //  1. If authenticated + profile exists → go directly to role dashboard
    //  2. If authenticated + profile still fetching → ProfileLoading screen with retry
    //  3. First launch → Onboarding
    //  4. Auth stack → RoleSelection → Citizen/Officer Sign In
    return (
        <NavigationContainer linking={linking} ref={navigationRef} onReady={handleNavigationReady}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    animationDuration: 250,
                }}
            >
                {isAuthenticated && profile ? (
                    /* 1. Authenticated — go directly to role dashboard */
                    profile.role === 'citizen' ? (
                        <Stack.Screen
                            name="Citizen"
                            component={CitizenNavigator}
                            options={{ animation: 'fade' }}
                        />
                    ) : (
                        <Stack.Screen
                            name="Officer"
                            component={OfficerNavigator}
                            options={{ animation: 'fade' }}
                        />
                    )
                ) : isAuthenticated && !profile ? (
                    /* 2. Authenticated but profile still loading */
                    <Stack.Screen name="ProfileLoading" component={ProfileLoadingScreen} />
                ) : !hasSeenOnboarding ? (
                    /* 3. First launch — show onboarding */
                    <Stack.Screen
                        name="Onboarding"
                        component={OnboardingCarousel}
                        options={{ animation: 'fade' }}
                    />
                ) : (
                    /* 4. Unauthenticated — Auth stack */
                    <>
                        <Stack.Screen name="RoleSelection" component={RoleSelection} />
                        <Stack.Screen name="CitizenSignIn" component={CitizenSignIn} />
                        <Stack.Screen name="CitizenSignUp" component={CitizenSignUp} />
                        <Stack.Screen name="SignUpSuccess" component={SignUpSuccess} />
                        <Stack.Screen name="OfficerSignIn" component={OfficerSignIn} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
                        <Stack.Screen name="OtpVerification" component={OtpVerification} />
                        <Stack.Screen name="NewPassword" component={NewPassword} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

