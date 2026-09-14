import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, PressableScale, FeedbackToast, GlassCard, StatusPill } from '../../components';
import { useAppContext } from '../../context';
import { COLORS, TYPOGRAPHY, SPACING } from '../../utils/theme';

export default function About({ navigation }) {
    const mounted = useRef(true);
    const { demoMode, setDemoMode, demoLoading } = useAppContext();
    const taps = useRef({ count: 0, at: 0 });
    const busy = useRef(false);
    const [toast, setToast] = useState(null);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    const toggle = async () => {
        if (busy.current || demoLoading) return;
        const now = Date.now();
        taps.current.count = now - taps.current.at > 2500 ? 1 : taps.current.count + 1;
        taps.current.at = now;
        if (taps.current.count < 5) return;
        taps.current.count = 0; busy.current = true;
        try {
            await setDemoMode(!demoMode);
            if (mounted.current) setToast({ variant: 'info', message: 'Demo mode ' + (demoMode ? 'disabled' : 'enabled') });
        } catch { if (mounted.current) setToast({ variant: 'error', message: 'Could not save demo preference. Please retry.' }); }
        finally { busy.current = false; }
    };
    return <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ScreenHeader title="About Traffic Eye" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content}>
            <Image source={require('../../../assets/images/icon.png')} style={styles.icon} accessibilityLabel="Traffic Eye app icon" />
            <Text style={styles.title}>{Constants.expoConfig?.name || 'Traffic Eye'}</Text>
            <Text style={styles.subtitle}>Safer streets start with you.</Text>
            <PressableScale onPress={toggle} accessibilityLabel={'Version ' + (Constants.expoConfig?.version || 'Unknown')} style={styles.version}>
                <Text style={styles.subtitle}>Version {Constants.expoConfig?.version || 'Unknown'}</Text>
            </PressableScale>
            {demoMode && <StatusPill status="pending" label="Demo Mode — reports are not saved" />}
            <GlassCard style={styles.card}>
                <Text style={styles.section}>Built for safer streets</Text>
                <Text style={styles.body}>Capture evidence safely. AI assists with analysis; authorized officers review reports and decide the outcome.</Text>
                <View style={styles.badges}>{['React Native', 'Expo', 'Supabase', 'MapLibre'].map(name => <StatusPill key={name} status="processing" label={name} />)}</View>
                <Text style={styles.subtitle}>Made for {Constants.expoConfig?.extra?.eventName || 'Academic Project'}</Text>
            </GlassCard>
        </ScrollView>
        <FeedbackToast visible={!!toast} {...toast} onDismiss={() => setToast(null)} />
    </SafeAreaView>;
}
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.xl, alignItems: 'center', gap: SPACING.md },
    icon: { width: 108, height: 108, borderRadius: 24, marginTop: SPACING.xl },
    title: { ...TYPOGRAPHY.h1, color: COLORS.text }, subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },
    version: { minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACING.lg },
    card: { width: '100%' }, section: { ...TYPOGRAPHY.h2, color: COLORS.text },
    body: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginVertical: SPACING.md },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
});
