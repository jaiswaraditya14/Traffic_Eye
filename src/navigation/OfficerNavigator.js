import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_WEIGHTS, SHADOWS } from '../utils';

// Import Screens from barrel
import {
    OfficerDashboard,
    PendingQueue,
    VerifiedReports,
    OfficerProfile,
    ReportVerification,
    OfficerSettings,
    PermissionsRequest
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_CONFIG = {
    Dashboard: { icon: 'grid', label: 'Dashboard' },
    Pending: { icon: 'time', label: 'Pending' },
    Verified: { icon: 'checkmark-circle', label: 'Verified' },
    OfficerProfileTab: { icon: 'person', label: 'Profile' },
};

function OfficerTabNavigator() {
    const insets = useSafeAreaInsets();
    const bottomTabHeight = Platform.OS === 'ios' ? 88 : 68;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
                    else if (route.name === 'Pending') iconName = focused ? 'time' : 'time-outline';
                    else if (route.name === 'Verified') iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
                    else if (route.name === 'OfficerProfileTab') iconName = focused ? 'person' : 'person-outline';
                    return (
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingTop: 2,
                        }}>
                            <Ionicons name={iconName} size={22} color={color} />
                            {focused && (
                                <View style={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: COLORS.secondary,
                                    marginTop: 4,
                                }} />
                            )}
                        </View>
                    );
                },
                tabBarActiveTintColor: COLORS.secondary,
                tabBarInactiveTintColor: COLORS.textTertiary,
                headerShown: false,
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: FONT_WEIGHTS.medium,
                    marginTop: -2,
                },
                tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopWidth: 0,
                    height: bottomTabHeight + Math.max(insets.bottom, 4),
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingTop: 10,
                    ...SHADOWS.md,
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={OfficerDashboard} />
            <Tab.Screen name="Pending" component={PendingQueue} />
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
            <Stack.Screen name="OfficerSettings" component={OfficerSettings} />
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
        fontWeight: '600',
        marginBottom: Platform.OS === 'ios' ? 0 : 4,
    },
});
