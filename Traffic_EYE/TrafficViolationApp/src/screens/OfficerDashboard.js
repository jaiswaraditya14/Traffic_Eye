// OfficerDashboard.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../components/MobileContainer';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function OfficerDashboard({ navigation }) {
    const stats = [
        { label: 'Pending', value: '24', icon: 'time', color: COLORS.warning },
        { label: 'Verified', value: '156', icon: 'checkmark-circle', color: COLORS.success },
        { label: 'Today', value: '12', icon: 'calendar', color: COLORS.info },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.greeting}>Officer Dashboard</Text>
                            <Text style={styles.subtitle}>Manage violation reports</Text>
                        </View>
                        <TouchableOpacity>
                            <Ionicons name="notifications" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statsContainer}>
                        {stats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <LinearGradient colors={[stat.color, `${stat.color}CC`]} style={styles.statGradient}>
                                    <Ionicons name={stat.icon} size={32} color={COLORS.white} />
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </LinearGradient>
                            </View>
                        ))}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Pending')}>
                            <View style={[styles.actionIcon, { backgroundColor: `${COLORS.warning}15` }]}>
                                <Ionicons name="time" size={32} color={COLORS.warning} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Review Pending Reports</Text>
                                <Text style={styles.actionDesc}>24 reports waiting for verification</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Verified')}>
                            <View style={[styles.actionIcon, { backgroundColor: `${COLORS.success}15` }]}>
                                <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Verified Reports</Text>
                                <Text style={styles.actionDesc}>View all verified violations</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
    greeting: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
    statsContainer: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md, marginBottom: SPACING.xl },
    statCard: { flex: 1 },
    statGradient: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOWS.md },
    statValue: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.white, marginTop: SPACING.sm },
    statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.white, opacity: 0.9 },
    section: { paddingHorizontal: SPACING.lg },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
    actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
    actionIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    actionContent: { flex: 1 },
    actionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: 4 },
    actionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
});


