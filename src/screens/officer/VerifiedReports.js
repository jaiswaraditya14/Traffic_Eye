// VerifiedReports.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

export default function VerifiedReports() {
    const verifiedReports = [
        { id: 1, type: 'Speeding', location: 'Main St & 5th Ave', date: '2024-01-20', officer: 'Badge #1234' },
        { id: 2, type: 'Red Light', location: 'Oak Rd & Elm St', date: '2024-01-19', officer: 'Badge #1234' },
        { id: 3, type: 'Parking', location: 'Park Ave', date: '2024-01-18', officer: 'Badge #5678' },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Verified Reports</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{verifiedReports.length}</Text>
                    </View>
                </View>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {verifiedReports.map((report) => (
                        <View key={report.id} style={styles.card}>
                            <Image
                                source={require('../../../assets/images/traffic_violation.jpg')}
                                style={styles.thumbnail}
                                resizeMode="cover"
                            />
                            <View style={styles.cardBody}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.reportType}>{report.type}</Text>
                                    <View style={styles.statusBadge}>
                                        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                                        <Text style={styles.statusText}>Verified</Text>
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
                                    <View style={styles.infoRow}>
                                        <Ionicons name="shield-checkmark" size={14} color={COLORS.secondary} />
                                        <Text style={[styles.infoText, { color: COLORS.secondary }]}>{report.officer}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
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
    badge: {
        backgroundColor: COLORS.successSurface,
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xxs,
    },
    badgeText: {
        color: COLORS.success,
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
    reportType: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.successSurface,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    statusText: {
        fontSize: FONT_SIZES.xxs,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.success,
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
