// OfficerDashboard.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { useAuth } from '../../context';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../../utils/theme';

export default function OfficerDashboard({ navigation }) {
    const { profile } = useAuth();
    const officerName = profile?.full_name?.split(' ')[0] || 'Officer';

    const stats = [
        { label: 'Pending', value: '24', icon: 'time', gradient: GRADIENTS.warning, color: COLORS.warning },
        { label: 'Verified', value: '156', icon: 'checkmark-circle', gradient: GRADIENTS.success, color: COLORS.success },
        { label: 'Today', value: '12', icon: 'calendar', gradient: GRADIENTS.info, color: COLORS.info },
    ];

    const recentReports = [
        { id: 1, type: 'Speeding', location: 'Main St & 5th Ave', time: '15 min ago', priority: 'high' },
        { id: 2, type: 'Red Light', location: 'Oak Rd & Elm St', time: '1h ago', priority: 'medium' },
        { id: 3, type: 'No Helmet', location: 'Park Avenue', time: '2h ago', priority: 'low' },
    ];

    const getPriorityConfig = (priority) => ({
        high: { color: COLORS.error, bg: COLORS.errorSurface, label: 'HIGH' },
        medium: { color: COLORS.warning, bg: COLORS.warningSurface, label: 'MED' },
        low: { color: COLORS.textTertiary, bg: COLORS.gray100, label: 'LOW' },
    }[priority]);

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.greeting}>Hello, {officerName}</Text>
                            <Text style={styles.subtitle}>Manage violation reports</Text>
                        </View>
                        <TouchableOpacity style={styles.notificationBtn}>
                            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        {stats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <LinearGradient
                                    colors={stat.gradient}
                                    style={styles.statGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.statIconBg}>
                                        <Ionicons name={stat.icon} size={24} color={COLORS.white} />
                                    </View>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </LinearGradient>
                            </View>
                        ))}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('Pending')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: COLORS.warningSurface }]}>
                                <Ionicons name="time" size={26} color={COLORS.warning} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Review Pending Reports</Text>
                                <Text style={styles.actionDesc}>24 reports waiting for verification</Text>
                            </View>
                            <View style={styles.actionChevron}>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('Verified')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: COLORS.successSurface }]}>
                                <Ionicons name="checkmark-circle" size={26} color={COLORS.success} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>Verified Reports</Text>
                                <Text style={styles.actionDesc}>View all verified violations</Text>
                            </View>
                            <View style={styles.actionChevron}>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Recent Reports Section with Images */}
                    <View style={[styles.section, { marginBottom: SPACING.xxl }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Reports</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Pending')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {recentReports.map((report) => {
                            const priorityConfig = getPriorityConfig(report.priority);
                            return (
                                <TouchableOpacity
                                    key={report.id}
                                    style={styles.reportCard}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.getParent()?.navigate('ReportVerification', { reportId: report.id }) ?? navigation.navigate('ReportVerification', { reportId: report.id })}
                                >
                                    <Image
                                        source={require('../../../assets/images/traffic_violation.jpg')}
                                        style={styles.reportThumbnail}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.reportContent}>
                                        <View style={styles.reportTopRow}>
                                            <Text style={styles.reportType}>{report.type}</Text>
                                            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bg }]}>
                                                <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                                                    {priorityConfig.label}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.reportInfoRow}>
                                            <Ionicons name="location" size={14} color={COLORS.textTertiary} />
                                            <Text style={styles.reportInfoText}>{report.location}</Text>
                                        </View>
                                        <View style={styles.reportInfoRow}>
                                            <Ionicons name="time" size={14} color={COLORS.textTertiary} />
                                            <Text style={styles.reportInfoText}>{report.time}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
    },
    greeting: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xxs,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    statGradient: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
    },
    statIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.white,
    },
    statLabel: {
        fontSize: FONT_SIZES.xxs,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: FONT_WEIGHTS.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    section: {
        paddingHorizontal: SPACING.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        letterSpacing: -0.2,
    },
    seeAll: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.secondary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    actionIcon: {
        width: 52,
        height: 52,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.lg,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        marginBottom: 2,
        letterSpacing: -0.1,
    },
    actionDesc: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    actionChevron: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.gray50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ── Report Cards ──
    reportCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        ...SHADOWS.xs,
    },
    reportThumbnail: {
        width: 80,
        height: '100%',
        minHeight: 90,
    },
    reportContent: {
        flex: 1,
        padding: SPACING.lg,
    },
    reportTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    reportType: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    priorityBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
    },
    priorityText: {
        fontSize: FONT_SIZES.xxs,
        fontWeight: FONT_WEIGHTS.bold,
        letterSpacing: 0.5,
    },
    reportInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: 3,
    },
    reportInfoText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
});
