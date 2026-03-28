// MyReports.js - Citizen Reports List
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

<<<<<<< Updated upstream
export default function MyReports({ navigation }) {
    const reports = [
        { id: 1, type: 'Speeding', status: 'verified', location: 'Main St & 5th Ave', date: '2024-01-20', points: 10 },
        { id: 2, type: 'Red Light', status: 'pending', location: 'Oak Rd & Elm St', date: '2024-01-19', points: 0 },
        { id: 3, type: 'Parking', status: 'rejected', location: 'Park Ave', date: '2024-01-18', points: 0 },
    ];

=======
import { useAppContext } from '../../context';

export default function MyReports({ navigation }) {
    const { reports } = useAppContext();
    const filters = ['All', 'Pending', 'Verified', 'Rejected'];
    const [active, setActive] = React.useState('All');

>>>>>>> Stashed changes
    const getStatusConfig = (status) => ({
        verified: { icon: 'checkmark-circle', color: COLORS.success, bg: COLORS.successSurface, label: 'Verified' },
        pending: { icon: 'time', color: COLORS.warning, bg: COLORS.warningSurface, label: 'Pending' },
        rejected: { icon: 'close-circle', color: COLORS.error, bg: COLORS.errorSurface, label: 'Rejected' },
    }[status]);

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Reports</Text>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>{reports.length}</Text>
                    </View>
                </View>
<<<<<<< Updated upstream
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {reports.map((report) => {
                        const config = getStatusConfig(report.status);
                        return (
=======

                {/* Report count */}
                <Text style={styles.showingText}>Showing {filtered.length} reports</Text>

                {/* Report list */}
                {filtered.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={48} color={C.border} />
                        <Text style={styles.emptyText}>No reports found</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {filtered.map((report) => {
                            const config = getStatusConfig(report.status);
                            return (
>>>>>>> Stashed changes
                            <TouchableOpacity
                                key={report.id}
                                style={styles.reportCard}
                                onPress={() => navigation.getParent()?.navigate('ReportDetail', { reportId: report.id }) ?? navigation.navigate('ReportDetail', { reportId: report.id })}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={require('../../../assets/images/traffic_violation.jpg')}
                                    style={styles.thumbnail}
                                    resizeMode="cover"
                                />
                                <View style={styles.cardBody}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.reportTitle}>{report.type}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                                            <Ionicons name={config.icon} size={12} color={config.color} />
                                            <Text style={[styles.statusText, { color: config.color }]}>
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
                                            <Ionicons name="calendar" size={14} color={COLORS.textTertiary} />
                                            <Text style={styles.infoText}>{report.date}</Text>
                                        </View>
                                        {report.points > 0 && (
                                            <View style={styles.infoRow}>
                                                <Ionicons name="trophy" size={14} color={COLORS.accent} />
                                                <Text style={[styles.infoText, { color: COLORS.accent, fontWeight: FONT_WEIGHTS.semibold }]}>
                                                    +{report.points} points
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    <View style={{ height: SPACING.xxl }} />
                </ScrollView>
<<<<<<< Updated upstream
=======
                )}

                {/* FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() =>
                        navigation.getParent()?.navigate('NewReport') ??
                        navigation.navigate('NewReport')
                    }
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={[C.amberDark, C.amber]}
                        style={styles.fabGradient}
                    >
                        <Ionicons name="add" size={28} color={C.navy} />
                    </LinearGradient>
                </TouchableOpacity>
>>>>>>> Stashed changes
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
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
    headerBadge: {
        backgroundColor: COLORS.primarySurface,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xxs,
    },
    headerBadgeText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
    },
<<<<<<< Updated upstream
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
=======

    // Filters
    filterRow: {
        paddingTop: 14,
    },
    filterScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: C.surfaceLow,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: C.primarySurface,
        borderColor: C.navyMid,
    },
    filterChipText: {
        fontSize: 13,
        fontFamily: 'Nunito-Medium',
        color: C.textTertiary,
    },
    filterChipTextActive: {
        color: C.navyMid,
        fontFamily: 'Nunito-Bold',
    },
    showingText: {
        fontSize: 12,
        color: C.textTertiary,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 6,
        fontFamily: 'Nunito-Medium',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 15,
        fontFamily: 'Nunito-Medium',
        color: C.textTertiary,
    },

    // Report list
    list: { flex: 1 },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
>>>>>>> Stashed changes
    },
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
    thumbnail: {
        width: 80,
        height: '100%',
        minHeight: 100,
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
    reportTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    statusText: {
        fontSize: FONT_SIZES.xxs,
        fontWeight: FONT_WEIGHTS.bold,
    },
    cardContent: {
        gap: SPACING.xs,
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
});
