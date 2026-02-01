// MyReports.js - Citizen Reports List
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function MyReports({ navigation }) {
    const reports = [
        { id: 1, type: 'Speeding', status: 'verified', location: 'Main St & 5th Ave', date: '2024-01-20', points: 10 },
        { id: 2, type: 'Red Light', status: 'pending', location: 'Oak Rd & Elm St', date: '2024-01-19', points: 0 },
        { id: 3, type: 'Parking', status: 'rejected', location: 'Park Ave', date: '2024-01-18', points: 0 },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'verified': return COLORS.success;
            case 'pending': return COLORS.warning;
            case 'rejected': return COLORS.error;
            default: return COLORS.gray500;
        }
    };

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Reports</Text>
                </View>
                <ScrollView style={styles.content}>
                    {reports.map((report) => (
                        <TouchableOpacity
                            key={report.id}
                            style={[styles.reportCard, { backgroundColor: COLORS.white, borderColor: COLORS.gray200 }]}
                            onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.reportTitle}>{report.type}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(report.status)}15` }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                    </Text>
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
                                {report.points > 0 && (
                                    <View style={styles.infoRow}>
                                        <Ionicons name="trophy" size={16} color={COLORS.accent} />
                                        <Text style={styles.infoText}>+{report.points} points</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    reportCard: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, ...SHADOWS.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    reportTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold },
    reportDate: { fontSize: FONT_SIZES.xs, marginTop: SPACING.xs },
    statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm },
    statusText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold },
    cardContent: { gap: SPACING.xs },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    infoText: { fontSize: FONT_SIZES.sm },
});



