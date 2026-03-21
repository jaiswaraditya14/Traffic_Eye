import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    border: '#E5E7EB',
};

const TIPS_DATA = {
    helmet: {
        title: 'Helmet Safety',
        icon: 'bicycle',
        image: require('../../../assets/images/helmet.png'),
        sections: [
            { title: 'Always Wear a Helmet', content: 'A helmet is the single most effective way to reduce head injuries and fatalities from crashes.' },
            { title: 'Basic Construction', content: '• Rigid outer shell\n• Impact absorbing liner\n• Comfort/fit padding\n• Retention strap' },
            { title: 'Certification Standards', content: 'Ensure your helmet meets ISI standards. High-quality materials like polycarbonate provide better protection.' }
        ]
    },
    seatbelt: {
        title: 'Seat Belt Safety',
        icon: 'shield-checkmark',
        image: require('../../../assets/images/seatbelt.png'),
        sections: [
            { title: 'Latching the Seat Belt', content: '1. Adjust seat to proper position.\n2. Pull belt across body without twisting.\n3. Insert latch until it clicks.' },
            { title: 'Safety Benefits', content: 'Seat belts keep you inside the vehicle and prevent you from being thrown against the interior during a crash.' }
        ]
    },
    speeding: {
        title: 'Speed Management',
        icon: 'speedometer',
        image: require('../../../assets/images/crosspath.png'),
        sections: [
            { title: 'Defensive Driving', content: '• Predict hazards before they happen.\n• Do not change lanes abruptly.\n• Maintain smooth speed control.' },
            { title: 'Impact of Speed', content: 'Higher speeds drastically reduce your reaction time and exponentially increase the severity of any impact.' }
        ]
    }
};

export default function SafetyTips({ navigation }) {
    const [activeTab, setActiveTab] = useState('helmet');
    const data = TIPS_DATA[activeTab];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Safety Guide</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                {/* ── Tabs ── */}
                <View style={styles.tabContainer}>
                    {Object.keys(TIPS_DATA).map((key) => {
                        const tab = TIPS_DATA[key];
                        const isActive = activeTab === key;
                        return (
                            <TouchableOpacity
                                key={key}
                                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                                onPress={() => setActiveTab(key)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={tab.icon} size={18} color={isActive ? C.amber : C.textTertiary} />
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                    {tab.title.split(' ')[0]}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Content ── */}
                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Hero Image */}
                    <View style={styles.imageCard}>
                        <Image source={data.image} style={styles.mainImage} resizeMode="cover" />
                    </View>

                    <Text style={styles.screenTitle}>{data.title}</Text>

                    {/* Info Columns */}
                    {data.sections.map((section, index) => (
                        <View key={index} style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.bulletBox} />
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </View>
                            <Text style={styles.sectionContent}>{section.content}</Text>
                        </View>
                    ))}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.white },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: C.white,
        paddingHorizontal: 20,
        paddingTop: 4,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4,
        zIndex: 10,
    },
    tabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 14,
        borderBottomWidth: 3, borderBottomColor: 'transparent',
    },
    tabBtnActive: { borderBottomColor: C.amber },
    tabText: { fontSize: 13, fontWeight: '600', color: C.textTertiary },
    tabTextActive: { color: C.navyMid, fontWeight: '800' },

    // Content
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

    imageCard: {
        width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 24,
        backgroundColor: C.surface, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    mainImage: { width: '100%', height: '100%' },

    screenTitle: { fontSize: 22, fontWeight: '800', color: C.navyMid, marginBottom: 16, letterSpacing: -0.5 },

    sectionCard: {
        backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 16,
        borderWidth: 1, borderColor: C.border,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    bulletBox: { width: 6, height: 16, backgroundColor: C.amber, borderRadius: 3 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
    sectionContent: { fontSize: 14, color: C.textSecondary, lineHeight: 22, paddingLeft: 16 },
});
