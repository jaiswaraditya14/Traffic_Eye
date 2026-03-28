// PendingQueue.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

import { useAppContext } from '../../context';

export default function PendingQueue({ navigation }) {
<<<<<<< Updated upstream
    const pendingReports = [
        { id: 1, type: 'Speeding', location: 'Main St & 5th Ave', time: '2h ago', priority: 'high' },
        { id: 2, type: 'Red Light', location: 'Oak Rd & Elm St', time: '3h ago', priority: 'medium' },
        { id: 3, type: 'Parking', location: 'Park Ave', time: '5h ago', priority: 'low' },
    ];
=======
    const { reports } = useAppContext();
    const pendingReports = reports?.filter(r => r.status === 'pending') || [];
>>>>>>> Stashed changes

    const getPriorityConfig = (priority) => ({
        high: { color: COLORS.error, bg: COLORS.errorSurface, label: 'HIGH' },
        medium: { color: COLORS.warning, bg: COLORS.warningSurface, label: 'MED' },
        low: { color: COLORS.textTertiary, bg: COLORS.gray100, label: 'LOW' },
    }[priority]);

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Pending Queue</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingReports.length}</Text>
                    </View>
<<<<<<< Updated upstream
                </View>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {pendingReports.map((report) => {
                        const config = getPriorityConfig(report.priority);
                        return (
=======

                    {/* Priority summary */}
                    <View style={styles.prioritySummary}>
                        {[
                            { label: 'Critical', count: pendingReports.filter(r => r.priority === 'critical').length, color: C.critical },
                            { label: 'High', count: pendingReports.filter(r => r.priority === 'high').length, color: C.error },
                            { label: 'Medium', count: pendingReports.filter(r => r.priority === 'medium').length, color: C.amber },
                            { label: 'Low', count: pendingReports.filter(r => r.priority === 'low').length, color: 'rgba(255,255,255,0.4)' },
                        ].map((p, idx) => (
                            <View key={idx} style={styles.priorityStat}>
                                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                                <Text style={styles.priorityStatCount}>{p.count}</Text>
                                <Text style={styles.priorityStatLabel}>{p.label}</Text>
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                {/* Report list */}
                {pendingReports.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-done-circle-outline" size={48} color={C.success} />
                        <Text style={styles.emptyText}>All caught up!</Text>
                        <Text style={styles.emptySubText}>No pending reports to review.</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {pendingReports.map((report) => {
                            const config = getPriorityConfig(report.priority);
                            return (
>>>>>>> Stashed changes
                            <TouchableOpacity
                                key={report.id}
                                style={styles.card}
                                onPress={() => navigation.getParent()?.navigate('ReportVerification', { reportId: report.id }) ?? navigation.navigate('ReportVerification', { reportId: report.id })}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={require('../../../assets/images/traffic_violation.jpg')}
                                    style={styles.thumbnail}
                                    resizeMode="cover"
                                />
                                <View style={styles.cardBody}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.reportType}>{report.type}</Text>
                                        <View style={[styles.priorityBadge, { backgroundColor: config.bg }]}>
                                            <Text style={[styles.priorityText, { color: config.color }]}>
                                                {config.label}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.cardContent}>
                                        <View style={styles.infoRow}>
                                            <Ionicons name="location" size={14} color={COLORS.textTertiary} />
                                            <Text style={styles.infoText}>{report.location}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Ionicons name="time" size={14} color={COLORS.textTertiary} />
                                            <Text style={styles.infoText}>{report.time}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.cardFooter}>
                                        <View style={styles.reviewBtn}>
                                            <Text style={styles.reviewText}>Review</Text>
                                            <Ionicons name="chevron-forward" size={16} color={COLORS.secondary} />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    <View style={{ height: SPACING.xxl }} />
                </ScrollView>
                )}
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
<<<<<<< Updated upstream
    header: {
=======
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    priorityStatCount: {
        fontSize: 16,
        fontFamily: 'Nunito-Bold',
        color: C.white,
    },
    priorityStatLabel: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'Nunito-SemiBold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.navyMid,
    },
    emptySubText: {
        marginTop: 4,
        fontSize: 14,
        fontFamily: 'Nunito-Medium',
        color: C.textTertiary,
    },

    // List
    list: { flex: 1 },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    reportCard: {
>>>>>>> Stashed changes
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        gap: SPACING.md,
    },
    title: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    badge: {
        backgroundColor: COLORS.warning,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xxs,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xs,
        fontWeight: FONT_WEIGHTS.bold,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        ...SHADOWS.xs,
    },
    thumbnail: {
        width: 80,
        height: '100%',
        minHeight: 110,
    },
    cardBody: {
        flex: 1,
        padding: SPACING.lg,
    },
    cardHeader: {
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
    cardContent: {
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    infoText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    reviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.secondary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
});
