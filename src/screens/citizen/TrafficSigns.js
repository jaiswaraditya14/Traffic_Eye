import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TRAFFIC_SIGNS } from '../../data/trafficData';

const C = {
    navy: '#002452', navyMid: '#1B3A6B',
    amber: '#F59E0B', white: '#FFFFFF', offWhite: '#F8F9FB', surface: '#FFFFFF',
    textPrimary: '#191C1E', textSecondary: '#44474F', textTertiary: '#747780',
    redSign: '#DC2626', redSignLight: '#FEE2E2',
    amberSign: '#D97706', amberSignLight: '#FEF3C7',
    blueSign: '#1D4ED8', blueSignLight: '#DBEAFE',
    border: '#EAECEF',
};

// Custom drawn traffic sign shapes
const TrafficSignIcon = ({ shape, color, icon, size = 48 }) => {
    if (shape === 'circle') {
        return (
            <View style={[ts.iconBase, {
                width: size, height: size, borderRadius: size / 2,
                borderColor: color, borderWidth: 3, backgroundColor: color + '12',
            }]}>
                <Ionicons name={icon} size={size * 0.4} color={color} />
            </View>
        );
    }
    if (shape === 'triangle') {
        return (
            <View style={ts.triangleWrap}>
                {/* Triangle using View borders trick */}
                <View style={[ts.triangle, { 
                    borderBottomColor: color, 
                    borderBottomWidth: size * 0.9,
                    borderLeftWidth: size * 0.5,
                    borderRightWidth: size * 0.5,
                }]} />
                <View style={ts.triangleIcon}>
                    <Ionicons name={icon} size={size * 0.35} color={color} />
                </View>
            </View>
        );
    }
    // rectangle (informational)
    return (
        <View style={[ts.iconBase, {
            width: size * 1.1, height: size * 0.75, borderRadius: 6,
            backgroundColor: color, justifyContent: 'center', alignItems: 'center',
        }]}>
            <Ionicons name={icon} size={size * 0.37} color={C.white} />
        </View>
    );
};

const TABS = TRAFFIC_SIGNS.map(s => s.category);

export default function TrafficSigns({ navigation }) {
    const [activeTab, setActiveTab] = useState(0);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const switchTab = (idx) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setActiveTab(idx);
    };

    const section = TRAFFIC_SIGNS[activeTab];

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={s.safe} edges={['top']}>

                {/* Header */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Traffic Signs Guide</Text>
                        <Text style={s.headerSub}>Know your road signs</Text>
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
                                {/* Mini shape indicator */}
                                <View style={[s.tabShape, {
                                    backgroundColor: active ? sec.color : C.border,
                                    borderRadius: sec.shape === 'circle' ? 10 : (sec.shape === 'rectangle' ? 3 : 10),
                                }]} />
                                <Text style={[s.tabText, active && { color: sec.color, fontFamily: 'Nunito-Bold' }]}>
                                    {tab.replace(' Signs', '')}
                                </Text>
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
                    {section.items.map((item, idx) => (
                        <View key={idx} style={s.signCard}>
                            {/* Sign visual */}
                            <View style={s.signLeft}>
                                <TrafficSignIcon shape={section.shape} color={section.color} icon={item.icon} size={50} />
                            </View>

                            {/* Sign info */}
                            <View style={s.signRight}>
                                <View style={s.signTitleRow}>
                                    <Text style={s.signName}>{item.name}</Text>
                                    <View style={[s.usageBadge, { backgroundColor: section.color + '15' }]}>
                                        <Text style={[s.usageText, { color: section.color }]}>{item.usage}</Text>
                                    </View>
                                </View>
                                <Text style={s.signMeaning}>{item.meaning}</Text>
                            </View>
                        </View>
                    ))}
                    <View style={{ height: 40 }} />
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}

// Triangle icon helper styles
const ts = StyleSheet.create({
    iconBase: { justifyContent: 'center', alignItems: 'center' },
    triangleWrap: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    triangle: {
        width: 0, height: 0,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderStyle: 'solid',
        position: 'absolute', bottom: 0,
    },
    triangleIcon: { position: 'absolute', bottom: 10, alignSelf: 'center' },
});

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

    // Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderBottomWidth: 1, borderBottomColor: C.border,
        marginTop: 2,
    },
    tab: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, gap: 4,
        borderBottomWidth: 3, borderBottomColor: 'transparent',
    },
    tabShape: { width: 20, height: 12 },
    tabText: { fontSize: 11, fontFamily: 'Nunito-SemiBold', color: C.textTertiary, textAlign: 'center' },

    // Legend
    legendBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 18, marginTop: 14, marginBottom: 4,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { flex: 1, fontSize: 12, fontFamily: 'Nunito-SemiBold', lineHeight: 17 },

    // List
    listContent: { paddingHorizontal: 18, paddingTop: 12 },

    signCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 12,
        shadowColor: C.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    signLeft: { width: 60, alignItems: 'center', justifyContent: 'center' },
    signRight: { flex: 1 },
    signTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    signName: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    usageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    usageText: { fontSize: 10, fontFamily: 'Nunito-Bold' },
    signMeaning: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textSecondary, lineHeight: 18 },
});
