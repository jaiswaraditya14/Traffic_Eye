// ReportDetail.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../../utils/theme';

export default function ReportDetail({ navigation, route }) {
    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Report Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Evidence Image */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={require('../../../assets/images/traffic_violation.jpg')}
                            style={styles.evidenceImage}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.4)']}
                            style={styles.imageOverlay}
                        >
                            <View style={styles.imageTag}>
                                <Ionicons name="camera" size={14} color={COLORS.white} />
                                <Text style={styles.imageTagText}>Evidence Photo</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Status Card */}
                    <View style={styles.statusCard}>
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Status</Text>
                            <View style={[styles.statusBadge, { backgroundColor: COLORS.successSurface }]}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                <Text style={[styles.statusText, { color: COLORS.success }]}>Verified</Text>
                            </View>
                        </View>
                    </View>

                    {/* Details Card */}
                    <View style={styles.detailCard}>
                        <Text style={styles.cardTitle}>Violation Details</Text>
                        <View style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="alert-circle" size={18} color={COLORS.textTertiary} />
                                <Text style={styles.detailLabel}>Type</Text>
                            </View>
                            <Text style={styles.detailValue}>Speeding</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="location" size={18} color={COLORS.textTertiary} />
                                <Text style={styles.detailLabel}>Location</Text>
                            </View>
                            <Text style={styles.detailValue}>Main St & 5th Ave</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="calendar" size={18} color={COLORS.textTertiary} />
                                <Text style={styles.detailLabel}>Date</Text>
                            </View>
                            <Text style={styles.detailValue}>Jan 20, 2024</Text>
                        </View>
                        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                            <View style={styles.detailLeft}>
                                <Ionicons name="trophy" size={18} color={COLORS.accent} />
                                <Text style={styles.detailLabel}>Points Earned</Text>
                            </View>
                            <View style={styles.pointsBadge}>
                                <Text style={styles.pointsValue}>+10</Text>
                            </View>
                        </View>
                    </View>

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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: -0.2,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.lg,
    },
    // ── Image ──
    imageContainer: {
        width: '100%',
        height: 240,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
        ...SHADOWS.md,
    },
    evidenceImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
        flexDirection: 'row',
    },
    imageTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
    },
    imageTagText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.white,
        fontWeight: FONT_WEIGHTS.medium,
    },
    // ── Status ──
    statusCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.full,
    },
    statusText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    // ── Details ──
    detailCard: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.xs,
    },
    cardTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        letterSpacing: -0.1,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    detailLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    detailLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    detailValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
    },
    pointsBadge: {
        backgroundColor: COLORS.accentSurface,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
    },
    pointsValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.accent,
    },
});
