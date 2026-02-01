// ReportDetail.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function ReportDetail({ navigation, route }) {
    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Report Details</Text>
                    <View style={{ width: 24 }} />
                </View>
                <ScrollView style={styles.content}>
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="image" size={64} color={COLORS.gray400} />
                    </View>
                    <View style={styles.statusCard}>
                        <Text style={styles.statusLabel}>Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${COLORS.success}15` }]}>
                            <Text style={styles.statusText}>Verified</Text>
                        </View>
                    </View>
                    <View style={styles.detailCard}>
                        <Text style={styles.cardTitle}>Violation Details</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Type:</Text>
                            <Text style={styles.detailValue}>Speeding</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Location:</Text>
                            <Text style={styles.detailValue}>Main St & 5th Ave</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date:</Text>
                            <Text style={styles.detailValue}>Jan 20, 2024</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Points Earned:</Text>
                            <Text style={styles.detailValue}>+10</Text>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    title: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    imagePlaceholder: { width: '100%', height: 250, backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.xl, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
    statusCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
    statusLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md },
    statusText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold },
    detailCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
    cardTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
    detailLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    detailValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textPrimary },
});


