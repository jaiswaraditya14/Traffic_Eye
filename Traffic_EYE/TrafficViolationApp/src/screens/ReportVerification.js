// ReportVerification.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../utils/theme';

export default function ReportVerification({ navigation }) {
    const [notes, setNotes] = useState('');

    const handleVerify = () => {
        navigation.goBack();
    };

    const handleReject = () => {
        navigation.goBack();
    };

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
                        <Ionicons name="image" size={64} color={COLORS.gray400} />
                    </View>

                    <View style={styles.detailCard}>
                        <Text style={styles.cardTitle}>Report Details</Text>
                        <View style={styles.detailRow}>
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
    imagePlaceholder: { width: '100%', height: 250, backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.xl, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
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


