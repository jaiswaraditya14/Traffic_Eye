// AIProcessing.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MobileContainer } from '../components/MobileContainer';

import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../utils/theme';

export default function AIProcessing({ navigation }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            // Simulate AI detection results
            const aiResults = {
                vehicleNumber: 'ABC-1234',
                violationType: 'Speeding',
                confidence: '95'
            };

            // Navigate to AI Results Verification screen
            navigation.replace('AIResultsVerification', { aiResults });
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <MobileContainer>
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.title}>Analyzing Violation...</Text>
                <Text style={styles.subtitle}>Our AI is processing your report</Text>
                <Text style={styles.detail}>• Detecting vehicle number plate</Text>
                <Text style={styles.detail}>• Identifying violation type</Text>
                <Text style={styles.detail}>• Calculating confidence level</Text>
            </View>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg },
    title: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, marginTop: SPACING.lg },
    subtitle: { fontSize: FONT_SIZES.md, marginTop: SPACING.sm, marginBottom: SPACING.lg },
    detail: { fontSize: FONT_SIZES.sm, marginTop: SPACING.xs },
});



