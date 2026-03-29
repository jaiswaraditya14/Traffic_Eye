import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar, Image, Alert, ActivityIndicator, Modal, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import { rewardService, VIOLATION_POINTS_MAP, REDEEM_CATALOG } from '../../services';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ── Shared Design Tokens with CitizenHome.js ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    bluePrimary: '#0052CC',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    success: '#059669',
    successSurface: '#D1FAE5',
};

export default function Rewards() {
    const { profile, checkAuth } = useAuth();
    const userPoints = profile?.points_balance || 0;
    
    const [activeTab, setActiveTab] = useState('Gifts'); // 'Gifts', 'Earn Points', 'My Activity'
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [redeeming, setRedeeming] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const loadData = async () => {
        if (checkAuth) await checkAuth();
        const res = await rewardService.getUserReportHistory(10);
        if (res.success) setHistory(res.history);
        setLoadingHistory(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }, [])
    );

    const handleRedeem = (item) => {
        if (userPoints < item.pts) {
            Alert.alert("Locked", "Earn more points by reporting traffic violations to unlock this reward.");
            return;
        }
        Alert.alert("Confirm Redemption", `Redeem your points for: ${item.title}?`, [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Redeem Now", 
                onPress: async () => {
                    setRedeeming(true);
                    const res = await rewardService.redeemItem(item);
                    setRedeeming(false);
                    if (res.success) {
                        Alert.alert("Success!", "Your reward request has been submitted. Check your notifications for local pickup details.");
                        loadData();
                    }
                }
            }
        ]);
    };

    const renderHeader = () => (
        <View>
            <LinearGradient colors={[C.navy, C.navyMid]} style={styles.headerArea}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>My Rewards</Text>
                    <View style={styles.authorityShield}>
                        <Ionicons name="shield-checkmark" size={20} color={C.amber} />
                    </View>
                </View>

                {/* Balance Card - Matching CitizenHome Stats Bar style */}
                <View style={styles.balanceCard}>
                    <View style={styles.trophyOuter}>
                        <View style={styles.trophyInner}>
                            <Ionicons name="trophy" size={32} color={C.amberDark} />
                        </View>
                    </View>
                    <View style={styles.balanceInfo}>
                        <Text style={styles.balanceLabel}>MY POINTS BALANCE</Text>
                        <Text style={styles.balanceValue}>{userPoints.toLocaleString()}</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabBar}>
            {['Gifts', 'Earn Points', 'My Activity'].map((tab) => (
                <TouchableOpacity 
                    key={tab} 
                    style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                    onPress={() => setActiveTab(tab)}
                >
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navy} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {renderHeader()}
                    
                    <View style={{ marginTop: 50, paddingHorizontal: 20 }}>
                        {renderTabs()}
                        
                        <Animated.View style={{ opacity: fadeAnim, paddingBottom: 40 }}>
                            {activeTab === 'Gifts' && (
                                <View>
                                    <Text style={styles.sectionTitle}>Available Gifts</Text>
                                    <Text style={styles.sectionSub}>Use your points to get these items</Text>
                                    <View style={styles.grid}>
                                        {REDEEM_CATALOG.map((item) => {
                                            const isLocked = userPoints < item.pts;
                                            return (
                                                <TouchableOpacity 
                                                    key={item.id} 
                                                    style={styles.giftCard}
                                                    activeOpacity={0.9}
                                                    onPress={() => handleRedeem(item)}
                                                >
                                                    <View style={styles.imgContainer}>
                                                        <Image 
                                                            source={typeof item.image === 'number' ? item.image : { uri: item.image }} 
                                                            style={[styles.itemImg, isLocked && { opacity: 0.4 }]} 
                                                            resizeMode="contain"
                                                        />
                                                    </View>
                                                    <Text style={styles.itemTitle}>{item.title}</Text>
                                                    <Text style={styles.itemPts}>{item.pts} <Text style={{fontSize: 10}}>PTS</Text></Text>
                                                    <View style={[styles.btn, isLocked ? styles.btnLocked : styles.btnUnlocked]}>
                                                        <Text style={[styles.btnText, isLocked && { color: C.textTertiary }]}>
                                                            {isLocked ? 'LOCKED' : 'REDEEM'}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {activeTab === 'Earn Points' && (
                                <View>
                                    <Text style={styles.sectionTitle}>How to Earn Points</Text>
                                    <Text style={styles.sectionSub}>Get points by reporting these violations</Text>
                                    {Object.entries(VIOLATION_POINTS_MAP).filter(([k]) => k !== 'Default').map(([key, val]) => (
                                        <View key={key} style={styles.earnRow}>
                                            <View style={styles.earnIconBox}>
                                                <Ionicons name={key.includes('riding') ? 'people' : 'alert-circle'} size={20} color={C.navyMid} />
                                            </View>
                                            <Text style={styles.earnName}>{key}</Text>
                                            <Text style={styles.earnVal}>+{val} pts</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {activeTab === 'My Activity' && (
                                <View>
                                     {loadingHistory ? (
                                        <ActivityIndicator color={C.navyMid} style={{marginTop: 20}} />
                                    ) : history.length === 0 ? (
                                        <Text style={styles.emptyText}>No activity logs yet.</Text>
                                    ) : (
                                        history.map((item, idx) => (
                                            <View key={idx} style={styles.earnRow}>
                                                <View style={[styles.earnIconBox, { backgroundColor: C.successSurface }]}>
                                                    <Ionicons name="checkmark-done" size={20} color={C.success} />
                                                </View>
                                                <View style={{flex: 1}}>
                                                    <Text style={styles.earnName}>{item.ai_verdict || 'Violation Log'}</Text>
                                                    <Text style={{fontSize: 11, color: C.textTertiary}}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                                </View>
                                                <Text style={[styles.earnVal, { color: C.success }]}>+{rewardService.getPointsForViolation(item.ai_verdict)}</Text>
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}
                        </Animated.View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header matching Home.js
    headerArea: {
        paddingHorizontal: 22,
        paddingTop: 16,
        paddingBottom: 60,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    headerTitle: { fontSize: 22, fontFamily: 'Nunito-Bold', color: '#FFF' },
    authorityShield: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

    // Balance Card matching provided UI
    balanceCard: {
        position: 'absolute',
        bottom: -40,
        left: 20,
        right: 20,
        backgroundColor: '#FFF',
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    trophyOuter: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center' },
    trophyInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.amberSurface, justifyContent: 'center', alignItems: 'center' },
    balanceInfo: { marginLeft: 20 },
    balanceLabel: { fontSize: 10, fontFamily: 'Nunito-Bold', color: C.textTertiary, letterSpacing: 0.5 },
    balanceValue: { fontSize: 36, fontFamily: 'Nunito-Bold', color: C.navy, marginTop: 2 },

    // Tabs
    tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 26 },
    tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabItemActive: { backgroundColor: '#F0F3F8' },
    tabText: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textTertiary },
    tabTextActive: { color: C.navyMid, fontFamily: 'Nunito-Bold' },

    // Grid View
    sectionTitle: { fontSize: 17, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    sectionSub: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginTop: 4, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    giftCard: {
        width: (width - 60) / 2,
        backgroundColor: '#FFF',
        borderRadius: 22,
        padding: 14,
        marginBottom: 16,
        alignItems: 'center',
        elevation: 3,
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    imgContainer: { width: '100%', height: 110, backgroundColor: '#F8F9FB', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    itemImg: { width: '85%', height: '85%' },
    itemTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, textAlign: 'center' },
    itemPts: { fontSize: 17, fontFamily: 'Nunito-Bold', color: C.bluePrimary, marginTop: 8 },
    btn: { marginTop: 12, width: '100%', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    btnUnlocked: { backgroundColor: C.bluePrimary },
    btnLocked: { backgroundColor: '#F2F4F7' },
    btnText: { fontSize: 11, fontFamily: 'Nunito-ExtraBold', color: '#FFF' },

    // List View
    earnRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 18, marginBottom: 12, elevation: 2, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
    earnIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ECF1F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    earnName: { flex: 1, fontSize: 15, fontFamily: 'Nunito-SemiBold', color: C.textPrimary },
    earnVal: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.success },
    emptyText: { textAlign: 'center', marginTop: 40, color: C.textTertiary, fontFamily: 'Nunito-Medium' }
});
