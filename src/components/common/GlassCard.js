import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../utils/theme';

export default function GlassCard({ intensity = 35, tint = 'light', borderRadius = BORDER_RADIUS.xxxl, style, children }) {
    const supported = Platform.OS !== 'android' || Number(Platform.Version) >= 31;
    return (
        <View style={[styles.shell, { borderRadius }, style]}>
            {supported && <BlurView intensity={intensity} tint={tint} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />}
            <View style={styles.content}>{children}</View>
        </View>
    );
}
const styles = StyleSheet.create({
    shell: { backgroundColor: COLORS.glassLight, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.glassBorder, ...SHADOWS.sm },
    content: { padding: SPACING.lg },
});
