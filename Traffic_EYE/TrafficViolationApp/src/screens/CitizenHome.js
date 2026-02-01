import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { useAppContext } from '../context/AppContext';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function CitizenHome({ navigation }) {
    const { user, userPoints } = useAppContext();
    const quickStats = [
        { label: 'Reports', value: '12', icon: 'document-text', color: COLORS.primary },
        { label: 'Verified', value: '8', icon: 'checkmark-circle', color: COLORS.success },
        { label: 'Points', value: userPoints, icon: 'trophy', color: COLORS.accent },
    ];

    const recentActivity = [
        { id: 1, type: 'Verified', desc: 'Speeding violation verified', time: '2h ago', status: 'success' },
        { id: 2, type: 'Pending', desc: 'Red light violation under review', time: '5h ago', status: 'pending' },
        { id: 3, type: 'Rejected', desc: 'Parking violation rejected', time: '1d ago', status: 'rejected' },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.greeting}>Hello, {user.name.split(' ')[0]}! 👋</Text>
                            <Text style={styles.subtitle}>Let's make roads safer today</Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                            <View style={styles.notificationBadge}>
                                <Ionicons name="notifications" size={24} color={COLORS.textPrimary} />
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>3</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsContainer}>
                        {quickStats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                                    <Ionicons name={stat.icon} size={24} color={stat.color} />
                                </View>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Report Button */}
                    <View style={styles.reportSection}>
                        <Button
                            onPress={() => navigation.navigate('NewReport')}
                            fullWidth
                            style={styles.reportButton}
                        >
                            <View style={styles.reportButtonContent}>
                                <Ionicons name="camera" size={24} color={COLORS.white} />
                                <Text style={styles.reportButtonText}>Report New Violation</Text>
                            </View>
                        </Button>
                    </View>

                    {/* Recent Activity */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Activity</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {recentActivity.map((activity) => (
                            <TouchableOpacity key={activity.id} style={styles.activityCard}>
                                <View style={[
                                    styles.activityIcon,
                                    { backgroundColor: activity.status === 'success' ? `${COLORS.success}15` : activity.status === 'pending' ? `${COLORS.warning}15` : `${COLORS.error}15` }
                                ]}>
                                    <Ionicons
                                        name={activity.status === 'success' ? 'checkmark-circle' : activity.status === 'pending' ? 'time' : 'close-circle'}
                                        size={24}
                                        color={activity.status === 'success' ? COLORS.success : activity.status === 'pending' ? COLORS.warning : COLORS.error}
                                    />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityType}>{activity.type}</Text>
                                    <Text style={styles.activityDesc}>{activity.desc}</Text>
                                </View>
                                <Text style={styles.activityTime}>{activity.time}</Text>
                            </TouchableOpacity>
                        ))}
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
    notificationBadge: { position: 'relative' },
    badge: { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.error, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: FONT_WEIGHTS.bold },
    statsContainer: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md, marginBottom: SPACING.lg },
    statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm },
    statIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
    statValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    reportSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
    reportButton: { paddingVertical: SPACING.lg },
    reportButtonContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    reportButtonText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: '#FFFFFF' },
    section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    seeAll: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.medium },
    activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    activityIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    activityContent: { flex: 1 },
    activityType: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
    activityDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    activityTime: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
});



