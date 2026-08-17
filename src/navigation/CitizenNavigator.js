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
    VideoReport,
    VideoReportSuccess,
    VideoReportStatus,
    ImageReportStatus,
} from '../screens';
// Dev-only: MapLibre native runtime test screen
import MapLibreTestScreen from '../screens/dev/MapLibreTestScreen';

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

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color }) => {
                    const config = TAB_CONFIG[route.name];
                    const iconName = focused ? config.icon : `${config.icon}-outline`;
                    return (
                        <View style={focused ? styles.activeTabIconContainer : null}>
                            <Ionicons name={iconName} size={22} color={color} />
                        </View>
                    );
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textTertiary,
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    { height: Platform.OS === 'ios' ? 88 : 64 + insets.bottom, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8 }
                ],
                tabBarLabelStyle: styles.tabLabel,
            })}
        >
            <Tab.Screen name="Home" component={CitizenHome} />
            <Tab.Screen name="Reports" component={MyReports} />
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
            <Stack.Screen name="VideoReport" component={VideoReport} />
            <Stack.Screen name="VideoReportSuccess" component={VideoReportSuccess} />
            <Stack.Screen name="VideoReportStatus" component={VideoReportStatus} />
            <Stack.Screen name="ImageReportStatus" component={ImageReportStatus} />
            <Stack.Screen name="ImageReportDetail" component={ReportDetail} />
            <Stack.Screen name="MyReports" component={MyReports} />
            {/* Dev-only MapLibre native runtime test */}
            <Stack.Screen
                name="MapLibreTest"
                component={MapLibreTestScreen}
                options={{ headerShown: true, title: 'MapLibre Native Test' }}
            />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 1.5,
        borderTopColor: COLORS.borderLight,
        elevation: 6,
        shadowColor: '#0F2C59',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        paddingTop: 6,
    },
    tabLabel: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        marginTop: 2,
    },
    activeTabIconContainer: {
        borderBottomWidth: 2,
        borderBottomColor: COLORS.secondary,
        paddingBottom: 2,
    },
});
