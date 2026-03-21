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
    ForgotPassword
} from '../screens';

const Stack = createNativeStackNavigator();

const prefix = Linking.createURL('/');

const linking = {
    prefixes: [prefix, 'trafficeye://'],
    config: {
        screens: {
            SignUpSuccess: 'signup-success',
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
                    /* 2. Authentication Loading State */
                    <Stack.Screen name="AuthLoading" component={SplashScreen} />
                ) : !hasSeenOnboarding ? (
                    /* 3. Onboarding Flow */
                    <Stack.Screen 
                        name="Onboarding" 
                        component={OnboardingCarousel}
                        options={{ animation: 'fade' }}
                    />
                ) : !isAuthenticated ? (
                    /* 4. Auth Stack */
                    <>
                        <Stack.Screen
                            name="RoleSelection"
                            component={RoleSelection}
                            options={{ animation: 'fade' }}
                        />
                        <Stack.Screen name="CitizenSignIn" component={CitizenSignIn} />
                        <Stack.Screen name="CitizenSignUp" component={CitizenSignUp} />
                        <Stack.Screen name="SignUpSuccess" component={SignUpSuccess} />
                        <Stack.Screen name="OfficerSignIn" component={OfficerSignIn} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
                    </>
                ) : !profile ? (
                    /* 5. Profile Loading State */
                    <Stack.Screen name="ProfileLoading" component={ProfileLoadingScreen} />
                ) : profile.role === 'citizen' ? (
                    /* 6. Citizen Flow */
                    <Stack.Screen
                        name="Citizen"
                        component={CitizenNavigator}
                        options={{ animation: 'fade' }}
                    />
                ) : (
                    /* 7. Officer Flow */
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
