import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDER_RADIUS, SHADOWS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../utils';

// Import Screens from barrel
import {
    CitizenHome,
    MyReports,
    Rewards,
    Profile,
    EditProfile,
    NewReport,
    AIProcessing,
    AIResultsVerification,
    ReportSuccess,
    ReportDetail,
    Notifications,
    ContactUs,
    FineInformation,
    PermissionsRequest,
    TrafficSigns,
    SafetyTips,
    FineCalculator,
    SpeedLimits,
    EmergencyContacts,
    VerificationReports,
    ReferralProgram,
    VideoReport,
    VideoReportSuccess,
    VideoReportStatus,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_CONFIG = {
    Home: { icon: 'home', label: 'Home' },
    Reports: { icon: 'document-text', label: 'Reports' },
    Rewards: { icon: 'trophy', label: 'Rewards' },
    ProfileTab: { icon: 'person', label: 'Profile' },
};

function CitizenTabNavigator() {
    const insets = useSafeAreaInsets();
    const bottomTabHeight = Platform.OS === 'ios' ? 88 : 68;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color }) => {
                    const config = TAB_CONFIG[route.name];
                    const iconName = focused ? config.icon : `${config.icon}-outline`;
                    return (
                        <Ionicons name={iconName} size={24} color={color} />
                    );
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textTertiary,
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
            })}
        >
            <Tab.Screen name="Home" component={CitizenHome} />
            <Tab.Screen name="Reports" component={VerificationReports} />
            <Tab.Screen name="Rewards" component={Rewards} />
            <Tab.Screen name="ProfileTab" component={Profile} options={{ title: 'Profile' }} />
        </Tab.Navigator>
    );
}

export default function CitizenNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 250,
            }}
        >
            <Stack.Screen name="CitizenMain" component={CitizenTabNavigator} />
            <Stack.Screen name="PermissionsRequest" component={PermissionsRequest} />
            <Stack.Screen name="NewReport" component={NewReport} />
            <Stack.Screen name="AIProcessing" component={AIProcessing} />
            <Stack.Screen name="AIResultsVerification" component={AIResultsVerification} />
            <Stack.Screen name="ReportSuccess" component={ReportSuccess} />
            <Stack.Screen name="ReportDetail" component={ReportDetail} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="EditProfile" component={EditProfile} />
            <Stack.Screen name="ContactUs" component={ContactUs} />
            <Stack.Screen name="FineInformation" component={FineInformation} />
            <Stack.Screen name="TrafficSigns" component={TrafficSigns} />
            <Stack.Screen name="SafetyTips" component={SafetyTips} />
            <Stack.Screen name="FineCalculator" component={FineCalculator} />
            <Stack.Screen name="SpeedLimits" component={SpeedLimits} />
            <Stack.Screen name="EmergencyContacts" component={EmergencyContacts} />
            <Stack.Screen name="VerificationReports" component={VerificationReports} />
            <Stack.Screen name="ReferralProgram" component={ReferralProgram} />
            <Stack.Screen name="VideoReport" component={VideoReport} />
            <Stack.Screen name="VideoReportSuccess" component={VideoReportSuccess} />
            <Stack.Screen name="VideoReportStatus" component={VideoReportStatus} />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    tabLabel: {
        fontSize: 11,
        fontFamily: 'Nunito-SemiBold',
        marginBottom: Platform.OS === 'ios' ? 0 : 4,
    },
});
