// ReportSuccess.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MobileContainer } from '../components/MobileContainer';
import { Button } from '../components/Button';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

export default function ReportSuccess({ navigation }) {
    return (
        <MobileContainer>
            <View style={styles.container}>
                <View style={styles.content}>
                    <Ionicons name="checkmark-circle" size={100} color={COLORS.success} />
                    <Text style={styles.title}>Report Submitted!</Text>
                    <Text style={styles.subtitle}>Your report is under review. You'll be notified once it's verified.</Text>
                    <View style={styles.points}>
                        <Text style={styles.pointsText}>+10 Points Earned</Text>
                    </View>
                </View>
                <View style={styles.footer}>
                    <Button onPress={() => navigation.navigate('CitizenMain')} fullWidth>
                        Back to Home
                    </Button>
                    <Button onPress={() => navigation.navigate('CitizenMain', { screen: 'Reports' })} variant="secondary" fullWidth>
                        View My Reports
                    </Button>
                </View>
            </View>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'space-between', paddingVertical: SPACING.xxl },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg },
    title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginTop: SPACING.lg, textAlign: 'center' },
    subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
    points: { marginTop: SPACING.lg, backgroundColor: `${COLORS.accent}15`, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: 20 },
    pointsText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.accent },
    footer: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
});


