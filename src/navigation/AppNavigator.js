import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useAppContext, useAuth } from '../context';

// Navigators
import CitizenNavigator from './CitizenNavigator';
import OfficerNavigator from './OfficerNavigator';

// Screens
import {
    SplashScreen,
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
        }
    }
};

const ProfileLoadingScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#050309', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
    </View>
);

export default function AppNavigator() {
    const { hasSeenOnboarding, showSplash } = useAppContext();
    const { isAuthenticated, loading, profile } = useAuth();

    // Navigation funnel:
    //  1. SplashScreen  — always shown first on cold start
    //  2. Auth loading  — while session is being restored
    //  3. If authenticated + profile exists → go directly to role dashboard
    //     (skip Onboarding and RoleSelection for returning logged-in users)
    //  4. Onboarding    — only on very first launch (persisted via AsyncStorage)
    //  5. Auth stack    — RoleSelection → SignIn / SignUp
    //  6. Role dashboards (Citizen / Officer)

    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    animationDuration: 250,
                }}
            >
                {/* 1. Initial App Splash */}
                {showSplash ? (
                    <Stack.Screen name="Splash" component={SplashScreen} />
                ) : loading ? (
                    /* 2. Restoring session */
                    <Stack.Screen name="AuthLoading" component={SplashScreen} />
                ) : isAuthenticated && profile ? (
                    /* 3. Authenticated — go directly to role dashboard */
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
                    /* 4. Authenticated but profile still loading */
                    <Stack.Screen name="ProfileLoading" component={ProfileLoadingScreen} />
                ) : !hasSeenOnboarding ? (
                    /* 5. First launch — show onboarding */
                    <Stack.Screen
                        name="Onboarding"
                        component={OnboardingCarousel}
                        options={{ animation: 'fade' }}
                    />
                ) : (
                    /* 6. Unauthenticated — Auth stack */
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
