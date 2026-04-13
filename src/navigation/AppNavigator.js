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
<<<<<<< HEAD
    const { isAuthenticated, loading, profile } = useAuth();
    const [hasConfirmedRole, setHasConfirmedRole] = React.useState(false);

    console.log('Navigation State:', { showSplash, loading, isAuthenticated, hasProfile: !!profile, hasSeenOnboarding });

    // We enforce a strict funnel on every launch. User must flow through:
    // Splash -> Onboarding -> Role Selection -> Login OR User Dashboard.
    // hasSeenOnboarding is always false on app start now (AppContext modification).
    // hasConfirmedRole is always false until they click a role on the RoleSelection screen.
    // If they click the correct role, and have an active session, they see the Dashboard.

=======
    const { isAuthenticated, loading, profile, signOut } = useAuth();
    const [hasConfirmedRole, setHasConfirmedRole] = React.useState(false);

    // We enforce a strict funnel on every launch. User must flow through:
    // Splash -> Onboarding -> Role Selection -> Login OR User Dashboard.
    // hasSeenOnboarding is always false on app start now (AppContext modification).
    // hasConfirmedRole is always false until they click a role on the RoleSelection screen.
    // If they click the correct role, and have an active session, they see the Dashboard.

>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a
    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    animationDuration: 250,
                }}
            >
                {/* 1. Initial App Splash (Mandatory) */}
                {showSplash ? (
                    <Stack.Screen name="Splash" component={SplashScreen} />
                ) : loading ? (
                    /* 2. Authentication Loading State */
                    <Stack.Screen name="AuthLoading" component={SplashScreen} />
                ) : !hasSeenOnboarding ? (
                    /* 3. Onboarding Flow (Must see first time) */
                    <Stack.Screen 
                        name="Onboarding" 
                        component={OnboardingCarousel}
                        options={{ animation: 'fade' }}
                    />
                ) : (!isAuthenticated || !hasConfirmedRole) ? (
                    /* 4. Auth Stack Gate (Must pass Role Selection) */
                    <>
                        <Stack.Screen
                            name="RoleSelection"
                        >
                            {(props) => <RoleSelection {...props} onConfirm={() => setHasConfirmedRole(true)} />}
                        </Stack.Screen>
                        <Stack.Screen name="CitizenSignIn" component={CitizenSignIn} />
                        <Stack.Screen name="CitizenSignUp" component={CitizenSignUp} />
                        <Stack.Screen name="SignUpSuccess" component={SignUpSuccess} />
                        <Stack.Screen name="OfficerSignIn" component={OfficerSignIn} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
                        <Stack.Screen name="OtpVerification" component={OtpVerification} />
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

                {/* ── New Password Screen (Accessible during auth / deep linking) ── */}
                <Stack.Screen name="NewPassword" component={NewPassword} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
