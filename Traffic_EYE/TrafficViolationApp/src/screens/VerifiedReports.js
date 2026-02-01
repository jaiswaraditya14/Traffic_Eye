// VerifiedReports.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

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
                </View>
                <ScrollView style={styles.content}>
                    {verifiedReports.map((report) => (
                        <View key={report.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.reportType}>{report.type}</Text>
                                <View style={styles.statusBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                    <Text style={styles.statusText}>Verified</Text>
                                </View>
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="location" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.infoText}>{report.location}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.infoText}>{report.date}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Ionicons name="shield-checkmark" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.infoText}>{report.officer}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
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
    card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    reportType: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.success}15`, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm },
    statusText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.success },
    cardContent: { gap: SPACING.xs },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    infoText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
});


