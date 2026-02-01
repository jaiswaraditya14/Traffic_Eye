// Profile.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { useAppContext } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function Profile({ navigation }) {
    const { user, setIsAuthenticated } = useAppContext();

    const menuItems = [
        { icon: 'person', label: 'Edit Profile', screen: 'EditProfile' },
        { icon: 'notifications', label: 'Notifications', screen: 'Notifications' },
        { icon: 'help-circle', label: 'Help & FAQ', screen: 'Help' },
        { icon: 'shield-checkmark', label: 'Privacy Policy', screen: 'Privacy' },
        { icon: 'document-text', label: 'Terms of Service', screen: 'Terms' },
    ];

    const handleLogout = () => {
        setIsAuthenticated(false);
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <View style={styles.profileInfo}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={40} color={COLORS.white} />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user?.name || 'User Name'}</Text>
                            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                        </View>
                    </View>
                </View>

                <ScrollView style={styles.content}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={() => navigation.navigate(item.screen)}
                        >
                            <Ionicons name={item.icon} size={24} color={COLORS.primary} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out" size={24} color={COLORS.error} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, backgroundColor: COLORS.primary },
    profileInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryDark, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    userInfo: { flex: 1 },
    userName: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.white, marginBottom: SPACING.xs },
    userEmail: { fontSize: FONT_SIZES.sm, color: COLORS.white, opacity: 0.9 },
    content: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    menuLabel: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.textPrimary, marginLeft: SPACING.md },
    logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.sm },
    logoutText: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.error, marginLeft: SPACING.md, fontWeight: FONT_WEIGHTS.semibold },
});
