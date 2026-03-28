// ReportVerification.js
import React, { useState } from 'react';
<<<<<<< Updated upstream
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
=======
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, TextInput, Alert } from 'react-native';
>>>>>>> Stashed changes
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { Button } from '../../components';
import { Input } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

import { useAppContext } from '../../context';
import { RewardService } from '../../services/rewards';

export default function ReportVerification({ route, navigation }) {
    const { reports } = useAppContext();
    const { reportId } = route.params || {};
    const [notes, setNotes] = useState('');

    const handleVerify = () => {
<<<<<<< Updated upstream
        navigation.goBack();
    };

    const handleReject = () => {
        navigation.goBack();
    };
=======
        const points = RewardService.calculatePoints(report?.priority, report?.type);
        
        Alert.alert(
            "Verified Successfully",
            `The report for ${report?.type} has been approved.\n\n+${points} verification points have been securely credited to the reporting Citizen.`,
            [{ text: "Proceed", onPress: () => navigation.goBack() }]
        );
    };
    const handleReject = () => navigation.goBack();
>>>>>>> Stashed changes

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Verify Report</Text>
                    <View style={{ width: 24 }} />
                </View>
                <ScrollView style={styles.content}>
                    <View style={styles.imagePlaceholder}>
                        <Image
                            source={require('../../../assets/images/background1.png')}
                            style={styles.backgroundImage}
                            resizeMode="cover"
                        />
                        <Ionicons name="image" size={64} color={COLORS.gray400} />
                    </View>

<<<<<<< Updated upstream
=======
                    {/* ── AI Insights Card ── */}
                    <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.aiCard}>
                        <View style={styles.aiCardHeader}>
                            <Ionicons name="sparkles" size={18} color={C.success} />
                            <Text style={styles.aiCardTitle}>AI Insights</Text>
                            <View style={styles.confidenceBadge}>
                                <Text style={styles.confidenceText}>95% Match</Text>
                            </View>
                        </View>
                        <View style={styles.aiRow}>
                            <Text style={styles.aiLabel}>Detected Plate</Text>
                            <Text style={styles.aiValuePlate}>{report?.vehicle || 'Unknown'}</Text>
                        </View>
                        <View style={styles.aiRow}>
                            <Text style={styles.aiLabel}>Violation Type</Text>
                            <Text style={styles.aiValue}>{report?.type || 'Unknown'}</Text>
                        </View>
                    </LinearGradient>

                    {/* ── Details ── */}
>>>>>>> Stashed changes
                    <View style={styles.detailCard}>
                        <Text style={styles.cardTitle}>Report Details</Text>
                        <View style={styles.detailRow}>
<<<<<<< Updated upstream
                            <Text style={styles.detailLabel}>Type:</Text>
                            <Text style={styles.detailValue}>Speeding</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Location:</Text>
                            <Text style={styles.detailValue}>Main St & 5th Ave</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Reported:</Text>
                            <Text style={styles.detailValue}>2 hours ago</Text>
=======
                            <Text style={styles.detailLabel}>Location</Text>
                            <Text style={styles.detailValue}>{report?.location || 'Unknown'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Date & Time</Text>
                            <Text style={styles.detailValue}>{report?.time || report?.date || 'Unknown'}</Text>
>>>>>>> Stashed changes
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Reporter:</Text>
                            <Text style={styles.detailValue}>John Doe</Text>
                        </View>
                    </View>

                    <View style={styles.aiCard}>
                        <View style={styles.aiHeader}>
                            <Ionicons name="sparkles" size={24} color={COLORS.secondary} />
                            <Text style={styles.aiTitle}>AI Analysis</Text>
                        </View>
                        <View style={styles.aiDetail}>
                            <Text style={styles.aiLabel}>License Plate:</Text>
                            <Text style={styles.aiValue}>ABC-1234</Text>
                        </View>
                        <View style={styles.aiDetail}>
                            <Text style={styles.aiLabel}>Confidence:</Text>
                            <Text style={styles.aiValue}>95%</Text>
                        </View>
                    </View>

                    <Input
                        label="Verification Notes"
                        placeholder="Add your notes..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                    />
                </ScrollView>

                <View style={styles.footer}>
                    <Button onPress={handleReject} variant="danger" style={styles.button}>
                        Reject
                    </Button>
                    <Button onPress={handleVerify} variant="success" style={styles.button}>
                        Verify
                    </Button>
                </View>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    title: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    imagePlaceholder: {
        width: '100%',
        height: 250,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.gray200
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.1,
    },
    detailCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
    cardTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
    detailLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    detailValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textPrimary },
    aiCard: { backgroundColor: `${COLORS.secondary}10`, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
    aiTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    aiDetail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
    aiLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    aiValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
    footer: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.gray200 },
    button: { flex: 1 },
});



