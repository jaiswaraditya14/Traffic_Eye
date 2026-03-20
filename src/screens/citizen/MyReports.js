// MyReports.js - Citizen Reports List
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

export default function MyReports({ navigation }) {
    const reports = [
        { id: 1, type: 'Speeding', status: 'verified', location: 'Main St & 5th Ave', date: '2024-01-20', points: 10 },
        { id: 2, type: 'Red Light', status: 'pending', location: 'Oak Rd & Elm St', date: '2024-01-19', points: 0 },
        { id: 3, type: 'Parking', status: 'rejected', location: 'Park Ave', date: '2024-01-18', points: 0 },
    ];

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
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {reports.map((report) => {
                        const config = getStatusConfig(report.status);
                        return (
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
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
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
