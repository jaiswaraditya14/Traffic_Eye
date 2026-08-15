/**
 * TrafficSigns.js — Indian Traffic Signs Guide
 * Based on IRC: SP-30 (Traffic Signs Manual) and Motor Vehicles Act, 1988.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TRAFFIC_SIGNS } from '../../data/trafficData';
import { FocusAwareStatusBar } from '../../components';

const C = {
    navy: '#002452', navyMid: '#1B3A6B',
    amber: '#F59E0B', white: '#FFFFFF', offWhite: '#F8F9FB', surface: '#FFFFFF',
    textPrimary: '#191C1E', textSecondary: '#44474F', textTertiary: '#747780',
    redSign: '#DC2626', redSignLight: '#FEE2E2',
    amberSign: '#D97706', amberSignLight: '#FEF3C7',
    blueSign: '#1D4ED8', blueSignLight: '#DBEAFE',
    border: '#EAECEF',
    actionBg: '#F0F9FF',
    actionColor: '#0369A1',
};

// Traffic sign shape renderers (IRC standard shapes)
const TrafficSignIcon = ({ shape, color, icon, size = 48 }) => {
    if (shape === 'circle') {
        return (
            <View style={[ts.iconBase, {
                width: size, height: size, borderRadius: size / 2,
                borderColor: color, borderWidth: 3.5, backgroundColor: color + '15',
            }]}>
                <Ionicons name={icon} size={size * 0.38} color={color} />
            </View>
        );
    }
    if (shape === 'triangle') {
        return (
            <View style={ts.triangleWrap}>
                <View style={[ts.triangle, {
                    borderBottomColor: color,
                    borderBottomWidth: size * 0.9,
                    borderLeftWidth: size * 0.5,
                    borderRightWidth: size * 0.5,
                }]} />
                <View style={ts.triangleIcon}>
                    <Ionicons name={icon} size={size * 0.32} color={color} />
                </View>
            </View>
        );
    }
    // rectangle (informational)
    return (
        <View style={[ts.iconBase, {
            width: size * 1.1, height: size * 0.75, borderRadius: 7,
            backgroundColor: color, justifyContent: 'center', alignItems: 'center',
        }]}>
            <Ionicons name={icon} size={size * 0.35} color={C.white} />
        </View>
    );
};

const TABS = TRAFFIC_SIGNS.map(s => s.category);
const totalSigns = TRAFFIC_SIGNS.reduce((acc, s) => acc + s.items.length, 0);

export default function TrafficSigns({ navigation }) {
    const [activeTab, setActiveTab] = useState(0);
    const [expandedIdx, setExpandedIdx] = useState(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const switchTab = (idx) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
        setActiveTab(idx);
        setExpandedIdx(null);
    };

    const section = TRAFFIC_SIGNS[activeTab];

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
                        <Text style={s.headerTitle}>Traffic Signs Guide</Text>
                        <Text style={s.headerSub}>IRC: SP-30 | {totalSigns} signs explained</Text>
                    </View>
                    <View style={s.headerCountBadge}>
                        <Text style={s.headerCountNum}>{section.items.length}</Text>
                        <Text style={s.headerCountSub}>in tab</Text>
                    </View>
                </LinearGradient>

                {/* Category Tabs */}
                <View style={s.tabBar}>
                    {TABS.map((tab, idx) => {
                        const sec = TRAFFIC_SIGNS[idx];
                        const active = idx === activeTab;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[s.tab, active && { borderBottomColor: sec.color, borderBottomWidth: 3 }]}
                                onPress={() => switchTab(idx)}
                                activeOpacity={0.8}
                            >
                                <View style={[s.tabShape, {
                                    backgroundColor: active ? sec.color : C.border,
                                    borderRadius: sec.shape === 'circle' ? 10 : (sec.shape === 'rectangle' ? 3 : 10),
                                }]} />
                                <Text style={[s.tabText, active && { color: sec.color, fontFamily: 'Nunito-Bold' }]}>
                                    {tab.replace(' Signs', '')}
                                </Text>
                                <View style={[s.tabCount, { backgroundColor: active ? sec.color + '20' : C.offWhite }]}>
                                    <Text style={[s.tabCountText, { color: active ? sec.color : C.textTertiary }]}>
                                        {sec.items.length}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Legend banner */}
                <Animated.View style={[s.legendBanner, { backgroundColor: section.color + '12', opacity: fadeAnim }]}>
                    <View style={[s.legendDot, { backgroundColor: section.color }]} />
                    <Text style={[s.legendText, { color: section.color }]}>{section.description}</Text>
                </Animated.View>

                {/* Signs List */}
                <Animated.ScrollView
                    style={{ opacity: fadeAnim }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.listContent}
                >
                    {section.items.map((item, idx) => {
                        const isExpanded = expandedIdx === idx;
                        return (
                            <TouchableOpacity
                                key={`${activeTab}-${idx}`}
                                style={s.signCard}
                                activeOpacity={0.85}
                                onPress={() => setExpandedIdx(isExpanded ? null : idx)}
                            >
                                {/* Sign visual + name row */}
                                <View style={s.signMainRow}>
                                    <View style={s.signLeft}>
                                        <TrafficSignIcon
                                            shape={section.shape}
                                            color={section.color}
                                            icon={item.icon}
                                            size={50}
                                        />
                                    </View>

                                    <View style={s.signRight}>
                                        <View style={s.signTitleRow}>
                                            <Text style={s.signName}>{item.name}</Text>
                                            <View style={[s.usageBadge, { backgroundColor: section.color + '15' }]}>
                                                <Text style={[s.usageText, { color: section.color }]}>{item.usage}</Text>
                                            </View>
                                        </View>
                                        <Text style={s.signMeaning}>{item.meaning}</Text>
                                    </View>

                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color={C.textTertiary}
                                        style={{ marginLeft: 4 }}
                                    />
                                </View>

                                {/* Driver Action — shown when expanded */}
                                {isExpanded && item.driverAction && (
                                    <View style={s.actionBox}>
                                        <View style={s.actionHeader}>
                                            <Ionicons name="car" size={13} color={C.actionColor} />
                                            <Text style={s.actionLabel}>DRIVER ACTION</Text>
                                        </View>
                                        <Text style={s.actionText}>{item.driverAction}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {/* Source note */}
                    <View style={s.sourceNote}>
                        <Ionicons name="information-circle-outline" size={13} color={C.textTertiary} />
                        <Text style={s.sourceText}>
                            Source: IRC SP-30 (Manual on Traffic Signs), MoRTH. Tap any sign to see the required driver action.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}

const ts = StyleSheet.create({
    iconBase: { justifyContent: 'center', alignItems: 'center' },
    triangleWrap: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    triangle: {
        width: 0, height: 0,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderStyle: 'solid',
        position: 'absolute', bottom: 0,
    },
    triangleIcon: { position: 'absolute', bottom: 8, alignSelf: 'center' },
});

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.offWhite },
    safe: { flex: 1 },

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
    headerCountBadge: {
        alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    },
    headerCountNum: { fontSize: 16, fontFamily: 'Nunito-ExtraBold', color: C.amber },
    headerCountSub: { fontSize: 9, fontFamily: 'Nunito-SemiBold', color: 'rgba(255,255,255,0.6)' },

    tabBar: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    tab: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, gap: 4,
        borderBottomWidth: 3, borderBottomColor: 'transparent',
    },
    tabShape: { width: 20, height: 12 },
    tabText: { fontSize: 10, fontFamily: 'Nunito-SemiBold', color: C.textTertiary, textAlign: 'center' },
    tabCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
    tabCountText: { fontSize: 9, fontFamily: 'Nunito-ExtraBold' },

    legendBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginTop: 12, marginBottom: 2,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { flex: 1, fontSize: 11, fontFamily: 'Nunito-SemiBold', lineHeight: 16 },

    listContent: { paddingHorizontal: 16, paddingTop: 10 },

    signCard: {
        backgroundColor: C.surface, borderRadius: 18, padding: 14, marginBottom: 10,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    signMainRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    signLeft: { width: 60, alignItems: 'center', justifyContent: 'center' },
    signRight: { flex: 1 },
    signTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    signName: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, flex: 1 },
    usageBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
    usageText: { fontSize: 9, fontFamily: 'Nunito-Bold' },
    signMeaning: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary, lineHeight: 17 },

    actionBox: {
        marginTop: 12, padding: 12, backgroundColor: C.actionBg,
        borderRadius: 12, borderLeftWidth: 3, borderLeftColor: C.actionColor,
    },
    actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
    actionLabel: { fontSize: 9, fontFamily: 'Nunito-ExtraBold', color: C.actionColor, letterSpacing: 0.6 },
    actionText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: '#0C4A6E', lineHeight: 18 },

    sourceNote: {
        flexDirection: 'row', gap: 6, alignItems: 'flex-start',
        marginTop: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10,
    },
    sourceText: { flex: 1, fontSize: 10, fontFamily: 'Nunito-Medium', color: C.textTertiary, lineHeight: 15 },
});
