import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, StatusBar } from 'react-native';
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
    surfaceInput: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    primarySurface: '#D7E2FF',
    success: '#059669',
};

// Extracted for brevity, keeping the full list logically
const FINE_DATA = [
    { id: 1, offense: "Permit without authorization / without helmet", section: "Sec: 129/177 MV Act", fine: "Rs. 1,000 / Rs. 2,000" },
    { id: 2, offense: "Excess passengers – 2", section: "Sec: 194A", fine: "Rs. 400" },
    { id: 26, offense: "Dangerous driving", section: "Sec: 184 MV Act", fine: "Will be sent to court" },
    { id: 39, offense: "Driving without DL", section: "Sec: 3/181 MV Act", fine: "Will be sent to court" },
    { id: 64, offense: "Overspeeding", section: "Sec: 183(1) MV Act", fine: "Rs. 1,000 & then Rs. 2,000" },
    { id: 66, offense: "Drunk driving", section: "Sec: 185 MV Act", fine: "Rs. 10,000" },
];

export default function FineInformation({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState(FINE_DATA);

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredData(FINE_DATA);
        } else {
            const filtered = FINE_DATA.filter(item =>
                item.offense.toLowerCase().includes(text.toLowerCase()) ||
                item.section.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredData(filtered);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Navy Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Traffic Penalties</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <View style={styles.content}>
                    {/* ── Search Bar ── */}
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color={C.textTertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by offense or section..."
                            placeholderTextColor={C.textTertiary}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
                                <Ionicons name="close-circle" size={18} color={C.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── Results ── */}
                    <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                        {filteredData.map((item) => (
                            <View key={item.id} style={styles.fineCard}>
                                <View style={styles.fineTop}>
                                    <View style={styles.iconBg}>
                                        <Ionicons name="document-text" size={18} color={C.navyMid} />
                                    </View>
                                    <View style={styles.sectionBadge}>
                                        <Text style={styles.sectionText}>{item.section}</Text>
                                    </View>
                                </View>

                                <Text style={styles.offenseText}>{item.offense}</Text>

                                <View style={styles.fineFooter}>
                                    <Ionicons name="cash-outline" size={18} color={C.amber} />
                                    <Text style={styles.fineAmount}>{item.fine}</Text>
                                </View>
                            </View>
                        ))}

                        {filteredData.length === 0 && (
                            <View style={styles.emptyState}>
                                <Ionicons name="search" size={48} color={C.textTertiary} />
                                <Text style={styles.emptyTitle}>No penalties found</Text>
                                <Text style={styles.emptySub}>Try adjusting your search terms</Text>
                            </View>
                        )}
                        <View style={{height: 40}}/>
                    </ScrollView>
                </View>
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
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },

    content: { flex: 1 },

    // Search
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.surface, borderRadius: 16,
        marginHorizontal: 20, marginTop: 20, marginBottom: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
        borderWidth: 1, borderColor: '#F2F4F6',
    },
    searchInput: { flex: 1, fontSize: 15, color: C.textPrimary, marginLeft: 10 },
    clearBtn: { padding: 4 },

    // List
    list: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 8 },

    fineCard: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
        borderWidth: 1, borderColor: '#F2F4F6',
    },
    fineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    iconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primarySurface, justifyContent: 'center', alignItems: 'center' },
    sectionBadge: { backgroundColor: '#F2F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    sectionText: { fontSize: 11, fontFamily: 'Nunito-SemiBold', color: C.textSecondary },
    offenseText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.textPrimary, lineHeight: 22, marginBottom: 16 },
    fineFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F2F4F6' },
    fineAmount: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.success },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginTop: 16 },
    emptySub: { fontSize: 14, color: C.textSecondary, marginTop: 8 },
});
