import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, SHADOWS, BORDER_RADIUS } from '../utils';

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
    SafetyTips,
    TrafficSigns,
    PermissionsRequest
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
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Reports') iconName = focused ? 'document-text' : 'document-text-outline';
                    else if (route.name === 'Rewards') iconName = focused ? 'trophy' : 'trophy-outline';
                    else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
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
                                    backgroundColor: COLORS.primary,
                                    marginTop: 4,
                                }} />
                            )}
                        </View>
                    );
                },
                tabBarActiveTintColor: COLORS.primary,
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
            <Stack.Screen name="SafetyTips" component={SafetyTips} />
            <Stack.Screen name="TrafficSigns" component={TrafficSigns} />
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
