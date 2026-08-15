import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TRAFFIC_RULES, SAFETY_TIPS } from '../../data/trafficData';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy: '#0A1E3F', navyMid: '#0F2C59',
    amber: '#F59E0B', amberSurface: '#FEF3C7',
    white: '#FFFFFF', offWhite: '#F4F6F9', surface: '#FFFFFF',
    textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#64748B',
    border: '#E2E8F0',
    success: '#059669', successSurface: '#D1FAE5',
    error: '#B91C1C', errorSurface: '#FEF2F2',
};

const TABS = ['Traffic Rules', 'Safety Checklist'];

export default function SafetyTips({ navigation }) {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <View style={s.root}>
            <FocusAwareStatusBar barStyle="light-content" statusBgColor={C.navy} />
            <SafeAreaView style={s.safe} edges={['top']}>

                {/* Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Road Safety Guide</Text>
                        <Text style={s.headerSub}>MoRTH · MV Act 1988 · IRC Guidelines</Text>
                    </View>
                    <View style={s.headerIcon}>
                        <Ionicons name="shield-checkmark" size={22} color={C.amber} />
                    </View>
                </LinearGradient>

                {/* Tabs */}
                <View style={s.tabBar}>
                    {TABS.map((tab, idx) => {
                        const active = idx === activeTab;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[s.tab, active && s.tabActive]}
                                onPress={() => setActiveTab(idx)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={idx === 0 ? 'book-outline' : 'checkmark-circle-outline'}
                                    size={16}
                                    color={active ? C.navy : C.textTertiary}
                                />
                                <Text style={[s.tabText, active && s.tabTextActive]}>{tab}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
                    {activeTab === 0 ? (
                        // ── Traffic Rules Tab ──
                        <>
                            {TRAFFIC_RULES.map((category, cidx) => (
                                <View key={cidx} style={s.categoryBlock}>
                                    {/* Category header */}
                                    <View style={s.categoryHeader}>
                                        <View style={[s.catIconBox, { backgroundColor: category.color + '18' }]}>
                                            <Ionicons name={category.icon} size={18} color={category.color} />
                                        </View>
                                        <Text style={[s.categoryTitle, { color: category.color }]}>{category.category}</Text>
                                    </View>

                                    {/* Rules */}
                                    {category.rules.map((rule, ridx) => (
                                        <View key={ridx} style={[s.ruleCard, { borderLeftColor: category.color }]}>
                                            <View style={s.ruleTop}>
                                                <Text style={s.ruleTitle}>{rule.title}</Text>
                                                <View style={s.shieldBadge}>
                                                    <Ionicons name="shield-checkmark" size={14} color={C.success} />
                                                </View>
                                            </View>
                                            <Text style={s.ruleExp}>{rule.explanation}</Text>
                                            <View style={s.whyBox}>
                                                <Text style={s.whyLabel}>WHY IT MATTERS</Text>
                                                <Text style={s.whyText}>{rule.whyItMatters}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </>
                    ) : (
                        // ── Safety Checklist Tab ──
                        <View style={s.checklistCard}>
                            <View style={s.checklistHeader}>
                                <Ionicons name="checkmark-done-circle" size={22} color={C.success} />
                                <Text style={s.checklistTitle}>Daily Safety Checklist</Text>
                            </View>
                            <Text style={s.checklistSub}>Follow these every time you drive</Text>
                            {SAFETY_TIPS.map((tip, idx) => (
                                <View key={idx} style={s.tipRow}>
                                    <View style={s.tipNumber}>
                                        <Text style={s.tipNumberText}>{idx + 1}</Text>
                                    </View>
                                    <Text style={s.tipText}>{tip}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.offWhite },
    safe: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24, gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 19, fontFamily: 'Nunito-Bold', color: C.white, letterSpacing: -0.3 },
    headerSub: { fontSize: 11, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.65)', marginTop: 2 },
    headerIcon: {
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Tabs
    tabBar: {
        flexDirection: 'row', marginHorizontal: 18, marginTop: 16,
        backgroundColor: C.surface, borderRadius: 12, padding: 4,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, gap: 6, borderRadius: 10,
    },
    tabActive: { backgroundColor: C.offWhite },
    tabText: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textTertiary },
    tabTextActive: { color: C.navy, fontFamily: 'Nunito-Bold' },

    scrollContent: { paddingHorizontal: 18, paddingTop: 16 },

    // Category blocks (Rules tab)
    categoryBlock: { marginBottom: 24 },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    catIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    categoryTitle: { fontSize: 16, fontFamily: 'Nunito-Bold' },

    ruleCard: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 10,
        borderLeftWidth: 4,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    ruleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    ruleTitle: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textPrimary, flex: 1 },
    shieldBadge: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: C.successSurface, justifyContent: 'center', alignItems: 'center',
    },
    ruleExp: { fontSize: 13, color: C.textSecondary, fontFamily: 'Nunito-Medium', lineHeight: 19 },
    whyBox: {
        marginTop: 12, padding: 10,
        backgroundColor: C.amberSurface, borderRadius: 10,
    },
    whyLabel: { fontSize: 9, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary, letterSpacing: 0.5, marginBottom: 3 },
    whyText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textPrimary, lineHeight: 17 },

    // Checklist tab
    checklistCard: {
        backgroundColor: C.surface, borderRadius: 20, padding: 20,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
    },
    checklistHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    checklistTitle: { fontSize: 17, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    checklistSub: { fontSize: 12, color: C.textTertiary, fontFamily: 'Nunito-Medium', marginBottom: 18, marginLeft: 2 },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    tipNumber: {
        width: 26, height: 26, borderRadius: 8,
        backgroundColor: C.navy + '12', justifyContent: 'center', alignItems: 'center', marginTop: 1,
    },
    tipNumberText: { fontSize: 11, fontFamily: 'Nunito-ExtraBold', color: C.navy },
    tipText: { flex: 1, fontSize: 14, color: C.textSecondary, fontFamily: 'Nunito-Medium', lineHeight: 20 },
});
