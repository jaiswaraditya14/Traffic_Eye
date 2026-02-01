// PendingQueue.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function PendingQueue({ navigation }) {
    const pendingReports = [
        { id: 1, type: 'Speeding', location: 'Main St & 5th Ave', time: '2h ago', priority: 'high' },
        { id: 2, type: 'Red Light', location: 'Oak Rd & Elm St', time: '3h ago', priority: 'medium' },
        { id: 3, type: 'Parking', location: 'Park Ave', time: '5h ago', priority: 'low' },
    ];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Pending Queue</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingReports.length}</Text>
                    </View>
                </View>
                <ScrollView style={styles.content}>
                    {pendingReports.map((report) => (
                        <TouchableOpacity
                            key={report.id}
                            style={styles.card}
                            onPress={() => navigation.navigate('ReportVerification', { reportId: report.id })}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.reportType}>{report.type}</Text>
                                <View style={[styles.priorityBadge, { backgroundColor: report.priority === 'high' ? `${COLORS.error}15` : report.priority === 'medium' ? `${COLORS.warning}15` : `${COLORS.gray300}` }]}>
                                    <Text style={[styles.priorityText, { color: report.priority === 'high' ? COLORS.error : report.priority === 'medium' ? COLORS.warning : COLORS.gray600 }]}>
                                        {report.priority.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="location" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.infoText}>{report.location}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.infoText}>{report.time}</Text>
                                </View>
                            </View>
                            <View style={styles.cardFooter}>
                                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                                <Text style={styles.reviewText}>Review</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: SPACING.sm },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    badge: { backgroundColor: COLORS.warning, borderRadius: 12, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
    badgeText: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    reportType: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    priorityBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm },
    priorityText: { fontSize: 10, fontWeight: FONT_WEIGHTS.bold },
    cardContent: { gap: SPACING.xs, marginBottom: SPACING.sm },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    infoText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    reviewText: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },
});


