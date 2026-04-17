import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
    navy: '#002452', navyMid: '#1B3A6B',
    amber: '#F59E0B', amberDark: '#D97706',
    white: '#FFFFFF', offWhite: '#F8F9FB', surface: '#FFFFFF', surfaceLow: '#F2F4F6',
    textPrimary: '#191C1E', textSecondary: '#44474F', textTertiary: '#747780',
    success: '#059669', successSurface: '#D1FAE5', primarySurface: '#D7E2FF', border: '#C4C6D0',
};

export default function VideoReportSuccess({ navigation, route }) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    // Real report data passed from VideoReport.js after successful DB insert
    const {
        reportId,
        displayId,
        violationType,
        location,
        submittedAt,
    } = route.params ?? {};

    // Fallback display ID if params are missing (e.g. dev/test navigation)
    const shownId = displayId ?? `VR-${Date.now().toString().slice(-6)}`;

    useEffect(() => {
        Animated.sequence([
            Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        const onBackPress = () => {
            navigation.reset({ index: 0, routes: [{ name: 'CitizenMain' }] });
            return true;
        };
        const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backSub.remove();
    }, [navigation]);

    const steps = [
        { icon: 'cloud-upload', label: 'Report Submitted', desc: 'Your video has been uploaded successfully', done: true },
        { icon: 'eye', label: 'Under Review', desc: 'Officer will review within 48 hours', done: false },
        { icon: 'shield-checkmark', label: 'Action Taken', desc: 'Fine issued or case will be closed', done: false },
    ];

    // Build the new report object to inject into the status list
    const newReportEntry = reportId ? {
        id: reportId,
        displayId: shownId,
        type: violationType || 'Video Report',
        location: location || 'Location not specified',
        date: submittedAt || new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'pending',
        points: 0,
        isNew: true, // flag for the status screen to highlight
    } : null;

    const handleTrackStatus = () => {
        // Go straight to the detail screen for this specific report
        if (reportId) {
            navigation.navigate('ReportDetail', { reportId });
        } else {
            // Failsafe in case reportId is missing
            navigation.navigate('VideoReportStatus');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <LinearGradient colors={[C.navy, C.navyMid]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
                    <Text style={styles.headerTitle}>Report Submitted</Text>
                </LinearGradient>
                <View style={styles.content}>
                    <Animated.View style={[styles.circleOuter, { transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.circleInner}>
                            <Ionicons name="checkmark" size={52} color={C.white} />
                        </View>
                    </Animated.View>
                    <Animated.View style={[styles.textBlock, { opacity: fadeAnim }]}>
                        <Text style={styles.title}>Report Submitted!</Text>
                        <Text style={styles.sub}>Your video report is now in the review queue. A certified officer will review it within 48 hours.</Text>
                        <View style={styles.idRow}>
                            <Ionicons name="barcode-outline" size={16} color={C.navyMid} />
                            <Text style={styles.idText}>Report ID: <Text style={styles.idVal}>{shownId}</Text></Text>
                        </View>
                    </Animated.View>
                    <Animated.View style={[styles.timelineCard, { opacity: fadeAnim }]}>
                        <Text style={styles.timelineTitle}>What happens next?</Text>
                        {steps.map((s, idx) => (
                            <View key={s.label} style={styles.timelineRow}>
                                <View style={styles.timelineLeft}>
                                    <View style={[styles.dot, s.done && styles.dotDone]}>
                                        <Ionicons name={s.icon} size={14} color={s.done ? C.white : C.textTertiary} />
                                    </View>
                                    {idx < steps.length - 1 && <View style={[styles.vline, s.done && styles.vlineDone]} />}
                                </View>
                                <View style={styles.timelineBody}>
                                    <Text style={[styles.stepLabel, s.done && { color: C.success }]}>{s.label}</Text>
                                    <Text style={styles.stepDesc}>{s.desc}</Text>
                                </View>
                                {s.done && (
                                    <View style={styles.doneBadge}><Text style={styles.doneBadgeText}>Done</Text></View>
                                )}
                            </View>
                        ))}
                    </Animated.View>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleTrackStatus} activeOpacity={0.88}>
                        <LinearGradient colors={[C.amberDark, C.amber]} style={styles.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Ionicons name="list" size={18} color={C.navy} />
                            <Text style={styles.primaryBtnText}>Track Report Status</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'CitizenMain' }] })} style={styles.ghostBtn}>
                        <Text style={styles.ghostBtnText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 28, alignItems: 'center', gap: 20 },
    circleOuter: { width: 120, height: 120, borderRadius: 60, backgroundColor: `${C.success}22`, justifyContent: 'center', alignItems: 'center' },
    circleInner: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.success, justifyContent: 'center', alignItems: 'center' },
    textBlock: { alignItems: 'center', gap: 8 },
    title: { fontSize: 26, fontFamily: 'Nunito-Bold', color: C.textPrimary, letterSpacing: -0.5 },
    sub: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
    idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primarySurface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    idText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.navyMid },
    idVal: { fontFamily: 'Nunito-Bold', color: C.navy },
    timelineCard: { width: '100%', backgroundColor: C.surface, borderRadius: 20, padding: 18, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
    timelineTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 14 },
    timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 54 },
    timelineLeft: { alignItems: 'center', width: 32 },
    dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceLow, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    dotDone: { backgroundColor: C.success, borderColor: C.success },
    vline: { width: 2, flex: 1, backgroundColor: C.border, marginTop: 4 },
    vlineDone: { backgroundColor: C.success },
    timelineBody: { flex: 1, paddingTop: 4 },
    stepLabel: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    stepDesc: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginTop: 2 },
    doneBadge: { backgroundColor: C.successSurface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'center' },
    doneBadgeText: { fontSize: 10, fontFamily: 'Nunito-Bold', color: C.success },
    actions: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
    primaryBtn: { borderRadius: 18, overflow: 'hidden', shadowColor: C.amberDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    primaryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    primaryBtnText: { fontSize: 16, fontFamily: 'Nunito-ExtraBold', color: C.navy },
    ghostBtn: { alignItems: 'center', paddingVertical: 10 },
    ghostBtnText: { fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textTertiary },
});
