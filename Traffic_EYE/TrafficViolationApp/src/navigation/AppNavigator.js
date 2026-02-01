import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { COLORS } from '../utils/theme';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingCarousel from '../screens/OnboardingCarousel';
import RoleSelection from '../screens/RoleSelection';
import CitizenSignIn from '../screens/CitizenSignIn';
import CitizenSignUp from '../screens/CitizenSignUp';
import OfficerSignIn from '../screens/OfficerSignIn';
import PermissionsRequest from '../screens/PermissionsRequest';
import ForgotPassword from '../screens/ForgotPassword';

// Citizen screens
import CitizenHome from '../screens/CitizenHome';
import NewReport from '../screens/NewReport';
import AIProcessing from '../screens/AIProcessing';
import AIResultsVerification from '../screens/AIResultsVerification';
import ReportSuccess from '../screens/ReportSuccess';
import MyReports from '../screens/MyReports';
import ReportDetail from '../screens/ReportDetail';
import Rewards from '../screens/Rewards';
import Profile from '../screens/Profile';
import Notifications from '../screens/Notifications';

// Officer screens
import OfficerDashboard from '../screens/OfficerDashboard';
import PendingQueue from '../screens/PendingQueue';
import ReportVerification from '../screens/ReportVerification';
import VerifiedReports from '../screens/VerifiedReports';
import OfficerProfile from '../screens/OfficerProfile';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Citizen Tab Navigator
function CitizenTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Reports') {
                        iconName = focused ? 'document-text' : 'document-text-outline';
                    } else if (route.name === 'Rewards') {
                        iconName = focused ? 'trophy' : 'trophy-outline';
                    } else if (route.name === 'ProfileTab') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.gray500,
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={CitizenHome} />
            <Tab.Screen name="Reports" component={MyReports} />
            <Tab.Screen name="Rewards" component={Rewards} />
            <Tab.Screen name="ProfileTab" component={Profile} options={{ title: 'Profile' }} />
        </Tab.Navigator>
    );
}

// Officer Tab Navigator
function OfficerTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'grid' : 'grid-outline';
                    } else if (route.name === 'Pending') {
                        iconName = focused ? 'time' : 'time-outline';
                    } else if (route.name === 'Verified') {
                        iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
                    } else if (route.name === 'OfficerProfileTab') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.secondary,
                tabBarInactiveTintColor: COLORS.gray500,
                headerShown: false,
            })}
        >
            <Tab.Screen name="Dashboard" component={OfficerDashboard} />
            <Tab.Screen name="Pending" component={PendingQueue} />
            <Tab.Screen name="Verified" component={VerifiedReports} />
            <Tab.Screen name="OfficerProfileTab" component={OfficerProfile} options={{ title: 'Profile' }} />
        </Tab.Navigator>
    );
}

// Main App Navigator
export default function AppNavigator() {
    const { showSplash, hasSeenOnboarding, isAuthenticated, userRole } = useAppContext();

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {showSplash ? (
                    <Stack.Screen name="Splash" component={SplashScreen} />
                ) : !hasSeenOnboarding ? (
                    <Stack.Screen name="Onboarding" component={OnboardingCarousel} />
                ) : !isAuthenticated ? (
                    <>
                        <Stack.Screen name="RoleSelection" component={RoleSelection} />
                        <Stack.Screen name="CitizenSignIn" component={CitizenSignIn} />
                        <Stack.Screen name="CitizenSignUp" component={CitizenSignUp} />
                        <Stack.Screen name="OfficerSignIn" component={OfficerSignIn} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
                        <Stack.Screen name="PermissionsRequest" component={PermissionsRequest} />
                    </>
                ) : userRole === 'citizen' ? (
                    <>
                        <Stack.Screen name="CitizenMain" component={CitizenTabs} />
                        <Stack.Screen name="NewReport" component={NewReport} />
                        <Stack.Screen name="AIProcessing" component={AIProcessing} />
                        <Stack.Screen name="AIResultsVerification" component={AIResultsVerification} />
                        <Stack.Screen name="ReportSuccess" component={ReportSuccess} />
                        <Stack.Screen name="ReportDetail" component={ReportDetail} />
                        <Stack.Screen name="Notifications" component={Notifications} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="OfficerMain" component={OfficerTabs} />
                        <Stack.Screen name="ReportVerification" component={ReportVerification} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
