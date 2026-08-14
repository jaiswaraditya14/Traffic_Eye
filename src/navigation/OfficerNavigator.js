import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDER_RADIUS, SHADOWS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../utils';

// Import Screens from barrel
import {
    OfficerDashboard,
    PendingQueue,
    VerifiedReports,
    OfficerProfile,
    ReportVerification,
    ImageReportReview,
    OfficerSettings,
    PermissionsRequest,
    VerifiedReportDetail,
    ViolationHeatmap,
    OfficerReportExport,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_CONFIG = {
    Dashboard: { icon: 'grid', label: 'Dashboard' },
    Pending: { icon: 'time', label: 'Pending' },
    LiveMap: { icon: 'map', label: 'Live Map' },
    Verified: { icon: 'checkmark-circle', label: 'Verified' },
    OfficerProfileTab: { icon: 'person', label: 'Profile' },
};

function OfficerTabNavigator() {
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
            <Tab.Screen name="Dashboard" component={OfficerDashboard} />
            <Tab.Screen name="Pending" component={PendingQueue} />
            <Tab.Screen name="LiveMap" component={ViolationHeatmap} />
            <Tab.Screen name="Verified" component={VerifiedReports} />
            <Tab.Screen name="OfficerProfileTab" component={OfficerProfile} options={{ title: 'Profile' }} />
        </Tab.Navigator>
    );
}

export default function OfficerNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 250,
            }}
        >
            <Stack.Screen name="OfficerMain" component={OfficerTabNavigator} />
            <Stack.Screen name="PermissionsRequest" component={PermissionsRequest} />
            <Stack.Screen name="ReportVerification" component={ReportVerification} />
            <Stack.Screen name="ImageReportReview" component={ImageReportReview} />
            <Stack.Screen name="VerifiedReportDetail" component={VerifiedReportDetail} />
            <Stack.Screen name="OfficerSettings" component={OfficerSettings} />
            <Stack.Screen name="OfficerReportExport" component={OfficerReportExport} />
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
        fontSize: 11,
        fontFamily: 'Nunito-Bold',
        marginTop: 2,
    },
    activeTabIconContainer: {
        borderBottomWidth: 2,
        borderBottomColor: COLORS.secondary,
        paddingBottom: 2,
    },
});
