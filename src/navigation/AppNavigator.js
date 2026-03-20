import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
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
    OfficerSignIn,
    ForgotPassword
} from '../screens';

const Stack = createNativeStackNavigator();

const ProfileLoadingScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#050309', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
    </View>
);

export default function AppNavigator() {
    const { hasSeenOnboarding, showSplash } = useAppContext();
    const { isAuthenticated, loading, profile } = useAuth();

    // 1. Splash Screen — always shows first on app start for 8 seconds
    if (showSplash) {
        return (
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Splash" component={SplashScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        );
    }

    // 2. Loading (auth check)
    if (loading) {
        return (
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Loading" component={SplashScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        );
    }

    // 2. Onboarding Flow
    if (!hasSeenOnboarding) {
        return (
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Onboarding" component={OnboardingCarousel} />
                </Stack.Navigator>
            </NavigationContainer>
        );
    }

    // 3. Main Navigation
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    animationDuration: 250,
                }}
            >
                {!isAuthenticated ? (
                    // Auth Stack
                    <>
                        <Stack.Screen
                            name="RoleSelection"
                            component={RoleSelection}
                            options={{ animation: 'fade' }}
                        />
                        <Stack.Screen name="CitizenSignIn" component={CitizenSignIn} />
                        <Stack.Screen name="CitizenSignUp" component={CitizenSignUp} />
                        <Stack.Screen name="OfficerSignIn" component={OfficerSignIn} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
                    </>
                ) : !profile ? (
                    // Profile loading state
                    <Stack.Screen name="Loading" component={ProfileLoadingScreen} />
                ) : profile.role === 'citizen' ? (
                    // Citizen Flow
                    <Stack.Screen
                        name="Citizen"
                        component={CitizenNavigator}
                        options={{ animation: 'fade' }}
                    />
                ) : (
                    // Officer Flow
                    <Stack.Screen
                        name="Officer"
                        component={OfficerNavigator}
                        options={{ animation: 'fade' }}
                    />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
