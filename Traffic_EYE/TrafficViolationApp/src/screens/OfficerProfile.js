// OfficerProfile.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { useAppContext } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function OfficerProfile() {
    const { setIsAuthenticated } = useAppContext();

    const stats = [
        { label: 'Verified', value: '156', icon: 'checkmark-circle' },
        { label: 'Rejected', value: '24', icon: 'close-circle' },
        { label: 'This Month', value: '45', icon: 'calendar' },
    ];

    const handleLogout = () => {
        setIsAuthenticated(false);
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Officer Profile</Text>
                </View>
                <ScrollView style={styles.content}>
                    <View style={styles.profileCard}>
                        <View style={styles.avatar}>
                            <Ionicons name="shield-checkmark" size={48} color={COLORS.white} />
                        </View>
                        <Text style={styles.name}>Officer Badge #1234</Text>
                        <Text style={styles.email}>officer@trafficeye.com</Text>
                    </View>

                    <View style={styles.statsContainer}>
                        {stats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <Ionicons name={stat.icon} size={32} color={COLORS.secondary} />
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>

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
    header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    profileCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.md },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
    name: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
    email: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    statsContainer: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
    statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm },
    statValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginTop: SPACING.sm },
    statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, textAlign: 'center' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, backgroundColor: `${COLORS.error}15`, borderRadius: BORDER_RADIUS.lg },
    logoutText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.error },
});


