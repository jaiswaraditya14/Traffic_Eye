<<<<<<< HEAD
<<<<<<< Updated upstream
// Rewards.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
=======
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar, Image, Alert, ActivityIndicator, Modal, Dimensions, Platform
} from 'react-native';
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../context';
import { rewardService, VIOLATION_SEVERITY, REDEEM_CATALOG } from '../../services';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2;

// ── Shared Design Tokens (Civic Curator palette) ──
const C = {
    navy: '#002452',
    navyDeep: '#00102B',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    amberSurface: '#FEF3C7',
    secondary: '#855300',
    secondaryContainer: '#FEA619',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surfaceLow: '#F2F4F6',
    surfaceContainer: '#EDEEF0',
    bluePrimary: '#0052CC',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    outlineVariant: '#C4C6D0',
    success: '#059669',
    successSurface: '#D1FAE5',
    error: '#DC2626',
    errorSurface: '#FEE2E2',
};

// Tag color map
const TAG_COLORS = {
    'STARTER': { bg: '#EDE9FE', text: '#6366F1' },
    'POPULAR': { bg: '#CFFAFE', text: '#0891B2' },
    'ESSENTIAL': { bg: '#FEE2E2', text: '#DC2626' },
    'PREMIUM': { bg: '#FEF3C7', text: '#D97706' },
    'TOP TIER': { bg: '#DBEAFE', text: '#1D4ED8' },
    'ULTIMATE': { bg: '#D7E2FF', text: '#002452' },
};

export default function Rewards() {
    const { profile, checkAuth } = useAuth();
    const userPoints = profile?.points_balance || 0;
    
    const [activeTab, setActiveTab] = useState('Gifts');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [redeeming, setRedeeming] = useState(false);
    
    // Coupon Modal State
    const [couponModalVisible, setCouponModalVisible] = useState(false);
    const [currentCoupon, setCurrentCoupon] = useState(null);
    const [redeemedItemTitle, setRedeemedItemTitle] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const gridSlideAnim = useRef(new Animated.Value(30)).current;
    const headerScaleAnim = useRef(new Animated.Value(0.96)).current;
    const insets = useSafeAreaInsets();

    // Staggered card animations
    const cardAnims = useRef(REDEEM_CATALOG.map(() => new Animated.Value(0))).current;

    const loadData = async () => {
        if (checkAuth) await checkAuth();
        const res = await rewardService.getUserReportHistory(15);
        if (res.success) setHistory(res.history);
        setLoadingHistory(false);
    };

    const animateCardEntries = () => {
        cardAnims.forEach(a => a.setValue(0));
        const animations = cardAnims.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 350,
                delay: index * 60,
                useNativeDriver: true,
            })
        );
        Animated.stagger(40, animations).start();
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(gridSlideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
                Animated.spring(headerScaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true })
            ]).start();
            if (activeTab === 'Gifts') animateCardEntries();
            return () => {
                fadeAnim.setValue(0);
                gridSlideAnim.setValue(30);
                headerScaleAnim.setValue(0.96);
            };
        }, [])
    );

    const handleClearHistory = () => {
        Alert.alert(
            "Clear History",
            "Are you sure you want to clear all your activity records? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Clear All", 
                    style: "destructive",
                    onPress: async () => {
                        const res = await rewardService.clearUserHistory();
                        if (res.success) {
                            setHistory([]);
                            Alert.alert("Cleared", "Your activity record has been cleared successfully.");
                        } else {
                            Alert.alert("Error", res.error || "Failed to clear history.");
                        }
                    }
                }
            ]
        );
    };

    const handleRedeem = (item) => {
        if (userPoints < item.pts) {
            Alert.alert("Locked", `Earn ${item.pts - userPoints} more points to unlock this reward.`);
            return;
        }
        Alert.alert("Confirm Redemption", `Redeem ${item.pts} points for: ${item.title}?`, [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Redeem Now", 
                onPress: async () => {
                    setRedeeming(true);
                    const res = await rewardService.redeemItem(item);
                    setRedeeming(false);
                    if (res.success) {
                        setRedeemedItemTitle(item.title);
                        setCurrentCoupon(res.couponCode);
                        setCouponModalVisible(true);
                        loadData();
                    } else {
                        Alert.alert("Redemption Failed", res.error || "Please try again.");
                    }
                }
            }
        ]);
    };

    const copyCouponCode = async () => {
        if (currentCoupon) {
            await Clipboard.setStringAsync(currentCoupon);
            Alert.alert("Copied!", "Coupon code copied to clipboard.");
        }
    };

    // ── HEADER ──
    const renderHeader = () => (
        <Animated.View style={{ transform: [{ scale: headerScaleAnim }] }}>
            <LinearGradient 
                colors={[C.navyDeep, C.navy, C.navyMid]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }}
                style={[styles.headerArea, { paddingTop: insets.top + 18 }]}
            >
                {/* Decorative circles */}
                <View style={styles.headerDecor1} />
                <View style={styles.headerDecor2} />

                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerLabel}>TRAFFIC EYE</Text>
                        <Text style={styles.headerTitle}>My Rewards</Text>
                    </View>
                    <View style={styles.authorityShield}>
                        <Ionicons name="shield-checkmark" size={22} color={C.amber} />
                    </View>
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.trophyOuter}>
                        <LinearGradient 
                            colors={['#FFFBEB', C.amberSurface]} 
                            style={styles.trophyInner}
                        >
                            <Ionicons name="trophy" size={30} color={C.amberDark} />
                        </LinearGradient>
                    </View>
                    <View style={styles.balanceInfo}>
                        <Text style={styles.balanceLabel}>MY POINTS BALANCE</Text>
                        <Text style={styles.balanceValue}>{userPoints.toLocaleString()}</Text>
                        <View style={styles.balanceBadge}>
                            <Ionicons name="star" size={11} color={C.amberDark} />
                            <Text style={styles.balanceBadgeText}>
                                {userPoints > 1000 ? '🏆 Gold Member' : userPoints > 500 ? '🥈 Silver Member' : '🏅 Active Citizen'}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );

    // ── TABS ──
    const renderTabs = () => (
        <View style={styles.tabBar}>
            {['Gifts', 'Earn Points', 'My Activity'].map((tab) => (
                <TouchableOpacity 
                    key={tab} 
                    style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                    onPress={() => {
                        setActiveTab(tab);
                        gridSlideAnim.setValue(20);
                        fadeAnim.setValue(0.5);
                        Animated.parallel([
                            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                            Animated.spring(gridSlideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true })
                        ]).start();
                        if (tab === 'Gifts') animateCardEntries();
                    }}
                >
                    <Ionicons 
                        name={tab === 'Gifts' ? 'gift' : tab === 'Earn Points' ? 'trending-up' : 'time'} 
                        size={16} 
                        color={activeTab === tab ? C.navy : C.textTertiary} 
                        style={{ marginBottom: 2 }}
                    />
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                    {activeTab === tab && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
            ))}
        </View>
    );

    // ── GIFTS TAB ──
    const renderGifts = () => (
        <View>
            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>Available Gifts</Text>
                    <Text style={styles.sectionSub}>Unlock premium items using your points</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{REDEEM_CATALOG.length} items</Text>
                </View>
            </View>

            <View style={styles.grid}>
                {REDEEM_CATALOG.map((item, index) => {
                    const isLocked = userPoints < item.pts;
                    const animValue = cardAnims[index] || new Animated.Value(1);
                    
                    return (
                        <Animated.View
                            key={item.id}
                            style={{
                                opacity: animValue,
                                transform: [{
                                    translateY: animValue.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [40, 0],
                                    })
                                }, {
                                    scale: animValue.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.92, 1],
                                    })
                                }],
                            }}
                        >
                            <TouchableOpacity 
                                style={styles.giftCard}
                                activeOpacity={isLocked ? 0.9 : 0.7}
                                onPress={() => handleRedeem(item)}
                            >
                                {/* Card Image Area */}
                                <View style={styles.imgContainer}>
                                    {item.image ? (
                                        <Image 
                                            source={typeof item.image === 'number' ? item.image : { uri: item.image }} 
                                            style={styles.itemImg} 
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <LinearGradient
                                            colors={item.gradColors || [C.navy, C.navyMid]}
                                            style={styles.iconGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <View style={styles.iconCircle}>
                                                <Ionicons name={item.icon || 'gift'} size={36} color="#FFF" />
                                            </View>
                                        </LinearGradient>
                                    )}

                                    {/* Floating Points Badge */}
                                    <View style={styles.floatingPtsBadge}>
                                        <Ionicons name="star" size={10} color={C.amberDark} />
                                        <Text style={styles.floatingPtsText}>{item.pts}</Text>
                                    </View>

                                    {/* Tag Badge */}
                                    {item.tag && !isLocked && (
                                        <View style={[styles.tagBadge, { backgroundColor: TAG_COLORS[item.tag]?.bg || '#EDE9FE' }]}>
                                            <Text style={[styles.tagText, { color: TAG_COLORS[item.tag]?.text || '#6366F1' }]}>
                                                {item.tag}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Locked Overlay */}
                                    {isLocked && (
                                        <View style={StyleSheet.absoluteFill}>
                                            <BlurView intensity={40} tint="light" style={styles.blurLayer}>
                                                <View style={styles.lockBadge}>
                                                    <Ionicons name="lock-closed" size={18} color={C.textPrimary} />
                                                </View>
                                            </BlurView>
                                        </View>
                                    )}
                                </View>

                                {/* Card Content */}
                                <View style={styles.giftContent}>
                                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                                    
                                    {isLocked ? (
                                        <View style={styles.lockedFooter}>
                                            <View style={styles.lockedPtsRow}>
                                                <Ionicons name="lock-closed" size={10} color={C.textTertiary} />
                                                <Text style={styles.lockedPtsText}>{item.pts - userPoints} pts to go</Text>
                                            </View>
                                            {/* Progress Bar */}
                                            <View style={styles.progressBarBg}>
                                                <View style={[styles.progressBarFill, { width: `${Math.min((userPoints / item.pts) * 100, 100)}%` }]} />
                                            </View>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={styles.redeemBtn}
                                            onPress={() => handleRedeem(item)}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={[C.navy, C.navyDeep]}
                                                style={styles.redeemBtnGrad}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                            >
                                                <Ionicons name="gift-outline" size={12} color="#FFF" />
                                                <Text style={styles.redeemBtnText}>REDEEM</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </View>
    );

    // ── EARN POINTS TAB ──
    const renderEarnPoints = () => (
        <View>
            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>How You Earn Points</Text>
                    <Text style={styles.sectionSub}>Report violations correctly to earn civic points</Text>
                </View>
            </View>

            {/* How It Works */}
            <View style={styles.howItWorks}>
                <Text style={styles.subSectionTitle}>The Verification Process</Text>
                <View style={styles.workStep}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.stepTitle}>Capture & Submit</Text>
                        <Text style={styles.stepDesc}>Take a clear photo or video of the violation. Ensure the license plate is visible.</Text>
                    </View>
                </View>
                <View style={styles.workStep}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.stepTitle}>AI Verification</Text>
                        <Text style={styles.stepDesc}>Our AI immediately analyzes the media to detect the violation and plate number accurately.</Text>
                    </View>
                </View>
                <View style={styles.workStep}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.stepTitle}>Authority Approval</Text>
                        <Text style={styles.stepDesc}>Road safety officers review the AI-verified reports for final confirmation.</Text>
                    </View>
                </View>
                <View style={styles.workStep}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
                    <View style={{flex: 1}}>
                        <Text style={styles.stepTitle}>Points Credited</Text>
                        <Text style={styles.stepDesc}>Once approved, points are added to your balance. Check 'My Activity' for logs.</Text>
                    </View>
                </View>
            </View>

            {/* Points Basis (Violation Severity) */}
            <Text style={styles.subSectionTitle}>Violation Severity & Rewards</Text>
            {Object.entries(VIOLATION_SEVERITY).map(([key, tier]) => (
                <View key={key} style={styles.tierContainer}>
                    <View style={styles.tierHeader}>
                        <View style={[styles.tierIconBox, { backgroundColor: tier.surface }]}>
                            <Ionicons name={tier.icon} size={20} color={tier.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tierTitle}>{tier.label} Severity</Text>
                            <Text style={styles.tierSubtitle}>
                                {key === 'LOW' ? 'Minor infractions' : key === 'MEDIUM' ? 'Moderate offenses' : 'Serious violations'}
                            </Text>
                        </View>
                        <View style={[styles.tierPointsPill, { backgroundColor: tier.surface }]}>
                            <Text style={[styles.tierPointsPillText, { color: tier.color }]}>
                                Up to +{tier.items[0]?.points} pts
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.tierGrid}>
                        {tier.items.map((item, idx) => (
                            <View key={idx} style={styles.tierCard}>
                                <View style={[styles.tierCardIcon, { backgroundColor: tier.surface }]}>
                                    <Ionicons name={item.icon} size={26} color={tier.color} />
                                </View>
                                <Text style={styles.tierItemName}>{item.name}</Text>
                                <View style={[styles.tierPointsBadge, { backgroundColor: `${tier.color}12` }]}>
                                    <Ionicons name="add-circle" size={12} color={tier.color} />
                                    <Text style={[styles.tierPointsText, { color: tier.color }]}>{item.points} pts</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            ))}

            {/* Redemption Guide */}
            <View style={styles.redemptionGuide}>
                <LinearGradient colors={['#FDFCFB', '#F5F7FA']} style={styles.guideCard}>
                    <View style={styles.guideHeader}>
                        <Ionicons name="gift" size={20} color={C.amberDark} />
                        <Text style={styles.guideTitle}>How to Redeem Gifts</Text>
                    </View>
                    <Text style={styles.guideText}>
                        1. Navigate to the <Text style={{fontFamily:'Nunito-Bold'}}>Gifts</Text> tab.{"\n"}
                        2. Choose any unlocked item and tap <Text style={{fontFamily:'Nunito-Bold'}}>Redeem</Text>.{"\n"}
                        3. You'll receive a unique code instantly.{"\n"}
                        4. Copy the code and use it at checkout with our partners.
                    </Text>
                </LinearGradient>
            </View>

            {/* Bottom CTA */}
            <TouchableOpacity 
                style={styles.earnCTA} 
                activeOpacity={0.8}
                onPress={() => navigation.getParent()?.navigate('NewReport') ?? navigation.navigate('NewReport')}
            >
                <LinearGradient
                    colors={[C.navy, C.navyMid]}
                    style={styles.earnCTAGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <Ionicons name="camera" size={22} color="#FFF" />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.earnCTATitle}>Report a Violation</Text>
                        <Text style={styles.earnCTASub}>Start earning points today</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={28} color={C.amber} />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    // ── MY ACTIVITY TAB ──
    const renderActivity = () => (
        <View>
             {history.length > 0 && !loadingHistory && (
                 <View style={styles.activityHeader}>
                     <View>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <Text style={styles.sectionSub}>Your detailed reward & reporting logs</Text>
                     </View>
                     <TouchableOpacity 
                        style={styles.clearBtn} 
                        onPress={handleClearHistory}
                        activeOpacity={0.7}
                     >
                         <Ionicons name="trash-outline" size={14} color={C.error} />
                         <Text style={styles.clearBtnText}>Clear All</Text>
                     </TouchableOpacity>
                 </View>
             )}
             {loadingHistory ? (
                <ActivityIndicator color={C.navyMid} style={{marginTop: 40}} size="large" />
            ) : history.length === 0 ? (
                <View style={styles.emptyActivity}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="document-text-outline" size={44} color={C.textTertiary} />
                    </View>
                    <Text style={styles.emptyTextTitle}>No activity yet</Text>
                    <Text style={styles.emptyTextSub}>Your approved reports and redemptions will appear here</Text>
                </View>
            ) : (
                history.map((item, idx) => {
                    const awardedPts = rewardService.getPointsForViolation(item.ai_verdict);
                    const isSuccess = ['completed', 'verified'].includes(item.status?.toLowerCase());
                    const isFailed = item.status === 'failed';
                    
                    let bgCol = '#ECF1F9';
                    let iconName = 'time';
                    let iconCol = C.textTertiary;
                    let ptsLabel = 'Pending';
                    let ptsCol = C.textTertiary;
                    let statusLabel = 'In Review';

                    if (isSuccess) {
                        bgCol = C.successSurface;
                        iconName = 'checkmark-circle';
                        iconCol = C.success;
                        ptsLabel = `+${awardedPts}`;
                        ptsCol = C.success;
                        statusLabel = 'Verified';
                    } else if (isFailed) {
                        bgCol = C.errorSurface;
                        iconName = 'close-circle';
                        iconCol = C.error;
                        ptsLabel = '0';
                        ptsCol = C.textTertiary;
                        statusLabel = 'Rejected';
                    }

                    return (
                        <View key={idx} style={styles.activityRow}>
                            <View style={[styles.activityIconBox, { backgroundColor: bgCol }]}>
                                <Ionicons name={iconName} size={20} color={iconCol} />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.activityName} numberOfLines={1}>{item.ai_verdict || 'Violation Report'}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.activityDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                    <View style={[styles.statusDot, { backgroundColor: iconCol }]} />
                                    <Text style={[styles.activityDate, { color: iconCol }]}>{statusLabel}</Text>
                                </View>
                            </View>
                            <View style={{alignItems: 'flex-end'}}>
                                <Text style={[styles.activityPts, { color: ptsCol }]}>{ptsLabel}</Text>
                                {isSuccess && <Text style={styles.activityPtsLabel}>PTS</Text>}
                            </View>
                        </View>
                    );
                })
            )}
        </View>
    );

<<<<<<< HEAD
                    {/* Rewards List */}
                    <Text style={styles.sectionTitle}>Available Rewards</Text>
                    {rewards.map((reward) => (
                        <TouchableOpacity
                            key={reward.id}
                            style={[styles.rewardCard, !reward.available && styles.disabledCard]}
                            activeOpacity={reward.available ? 0.7 : 1}
                        >
                            <View style={[styles.rewardIcon, { backgroundColor: reward.available ? `${reward.color}15` : COLORS.gray100 }]}>
                                <Ionicons name={reward.icon} size={26} color={reward.available ? reward.color : COLORS.textTertiary} />
                            </View>
                            <View style={styles.rewardInfo}>
                                <Text style={[styles.rewardTitle, !reward.available && { color: COLORS.textTertiary }]}>
                                    {reward.title}
                                </Text>
                                <View style={styles.rewardPoints}>
                                    <Ionicons name="trophy" size={14} color={reward.available ? COLORS.accent : COLORS.textTertiary} />
                                    <Text style={[styles.rewardPointsText, !reward.available && { color: COLORS.textTertiary }]}>
                                        {reward.points} points
                                    </Text>
                                </View>
                            </View>
                            {reward.available ? (
                                <View style={styles.redeemBtn}>
                                    <Text style={styles.redeemText}>Redeem</Text>
                                    <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                                </View>
                            ) : (
                                <View style={styles.lockedBadge}>
                                    <Ionicons name="lock-closed" size={16} color={COLORS.textTertiary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: SPACING.xxl }} />
=======
import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, StatusBar, Alert, Dimensions, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context';
import { RewardService } from '../../services/rewards';

// ── Design Tokens ──
const C = {
    navy: '#002452',
    navyMid: '#1B3A6B',
    amber: '#F59E0B',
    amberDark: '#D97706',
    amberSurface: '#FEF3C7',
    white: '#FFFFFF',
    offWhite: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceLow: '#F2F4F6',
    textPrimary: '#191C1E',
    textSecondary: '#44474F',
    textTertiary: '#747780',
    success: '#059669',
    successSurface: '#D1FAE5',
    primarySurface: '#D7E2FF',
    border: '#E2E8F0',
};

// ── Image Assets ──
const REWARD_IMAGES = {
    helmet: require('../../../assets/rewards/helmet.png'),
    gloves: require('../../../assets/rewards/gloves.png'),
    shoes: require('../../../assets/rewards/shoes.png'),
    goggles: require('../../../assets/rewards/goggles.png'),
    certificate: require('../../../assets/rewards/certificate.png'),
};

export default function Rewards() {
    const { profile } = useAuth();
    const [localPoints, setLocalPoints] = useState(profile?.points_balance || 0);
    const userPoints = localPoints;

    useEffect(() => {
        setLocalPoints(profile?.points_balance || 0);
    }, [profile?.points_balance]);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const heroScale = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(heroScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const [activeTab, setActiveTab] = useState('shop'); // 'shop', 'history', 'guide'
    const redemptions = RewardService.getCatalog();
    
    const pointsGuide = [
        { title: 'Triple Seat riding', pts: 300, icon: 'people', color: '#002452' },
        { title: 'Over speeding', pts: 150, icon: 'speedometer', color: '#D97706' },
        { title: 'Jumping Red Signal', pts: 200, icon: 'alert-circle', color: '#BA1A1A' },
        { title: 'Normal Report', pts: 100, icon: 'checkmark-circle', color: '#1B3A6B' },
        { title: 'Low Priority', pts: 50, icon: 'information-circle', color: '#747780' },
    ];

    const handleRedeem = async (item) => {
        const canAfford = RewardService.canRedeem(userPoints, item.pts);
        
        if (!canAfford) {
            Alert.alert("Not Enough Points", "You need more points to get this gift.");
            return;
        }

        Alert.alert(
            "Confirm Gift",
            `Do you want to use ${item.pts} points for: ${item.title}?`,
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Get it", 
                    onPress: async () => {
                        try {
                            setLocalPoints(prev => prev - item.pts);
                            await RewardService.processRedemption(profile?.id, item, userPoints);
                            Alert.alert("Success!", `You have successfully redeemed ${item.title}. Check your email for details.`);
                        } catch (err) {
                            setLocalPoints(userPoints);
                            Alert.alert("Error", err.message || "Something went wrong.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>My Rewards</Text>
                        </View>
                        <View style={styles.authorityShield}>
                            <Ionicons name="shield-checkmark" size={24} color={C.amber} />
                        </View>
                    </View>

                    <Animated.View
                        style={[
                            styles.pointsCard,
                            { transform: [{ scale: heroScale }] },
                        ]}
                    >
                        <View style={styles.pointsCardMain}>
                            <View style={styles.trophyFrame}>
                                <View style={styles.trophyCircle}>
                                    <Ionicons name="trophy" size={32} color={C.amberDark} />
                                </View>
                            </View>
                            <View style={styles.pointsCol}>
                                <Text style={styles.pointsLabel}>MY POINTS BALANCE</Text>
                                <Text style={styles.pointsValue}>{userPoints.toLocaleString()}</Text>
                            </View>
                        </View>
                    </Animated.View>
                </LinearGradient>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
                    <View style={styles.section}>
                        {/* ── Tab Switcher ── */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[styles.tab, activeTab === 'shop' && styles.activeTab]} 
                                onPress={() => setActiveTab('shop')}
                            >
                                <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>Gifts</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tab, activeTab === 'guide' && styles.activeTab]} 
                                onPress={() => setActiveTab('guide')}
                            >
                                <Text style={[styles.tabText, activeTab === 'guide' && styles.activeTabText]}>Earn Points</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
                                onPress={() => setActiveTab('history')}
                            >
                                <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>My Activity</Text>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'shop' && (
                            <View>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Available Gifts</Text>
                                    <Text style={styles.sectionSubtitle}>Use your points to get these items</Text>
                                </View>

                                <View style={styles.grid}>
                                    {redemptions.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.card}
                                            onPress={() => handleRedeem(item)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.cardImageContainer}>
                                                <Image 
                                                    source={REWARD_IMAGES[item.imageKey]} 
                                                    style={styles.rewardImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <Text style={styles.cardTitle}>{item.title}</Text>
                                            <View style={styles.cardPointsContainer}>
                                                <Text style={styles.cardPoints}>{item.pts}</Text>
                                                <Text style={styles.cardPointsLabel}> PTS</Text>
                                            </View>
                                            <View style={[styles.redeemBadge, userPoints < item.pts && styles.lockedBadge]}>
                                                <Text style={styles.redeemText}>
                                                    {userPoints >= item.pts ? 'GET IT' : 'LOCKED'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {activeTab === 'guide' && (
                            <View>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>How to Earn Points</Text>
                                    <Text style={styles.sectionSubtitle}>Get points by reporting these violations</Text>
                                </View>
                                {pointsGuide.map((item, idx) => (
                                    <View key={idx} style={styles.guideItem}>
                                        <View style={[styles.guideIcon, { backgroundColor: item.color + '15' }]}>
                                            <Ionicons name={item.icon} size={20} color={item.color} />
                                        </View>
                                        <Text style={styles.guideTitle}>{item.title}</Text>
                                        <View style={styles.guidePoints}>
                                            <Text style={styles.guidePtsValue}>+{item.pts}</Text>
                                            <Text style={styles.guidePtsLabel}> pts</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {activeTab === 'history' && (
                            <View>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                                </View>
                                <View style={styles.emptyHistory}>
                                    <Ionicons name="time-outline" size={48} color={C.border} />
                                    <Text style={styles.emptyText}>No activity history yet.</Text>
                                </View>
                            </View>
                        )}
                    </View>
>>>>>>> Stashed changes
=======
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {renderHeader()}
                    
                    <View style={{ marginTop: 62, paddingHorizontal: 20 }}>
                        {renderTabs()}
                        
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: gridSlideAnim }], paddingBottom: 40 }}>
                            {activeTab === 'Gifts' && renderGifts()}
                            {activeTab === 'Earn Points' && renderEarnPoints()}
                            {activeTab === 'My Activity' && renderActivity()}
                        </Animated.View>
                    </View>
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a
                </ScrollView>
            </SafeAreaView>

            {/* Coupon Modal */}
            <Modal transparent={true} visible={couponModalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animated.View style={styles.modalContent}>
                        <View style={styles.modalConfetti}>
                            <Ionicons name="sparkles" size={50} color={C.amber} style={{position:'absolute', top: -20, right: -10}} />
                            <LinearGradient colors={['#EEF2FF', '#D7E2FF']} style={styles.modalIconCircle}>
                                <Ionicons name="gift" size={50} color={C.navyMid} />
                            </LinearGradient>
                        </View>
                        
                        <Text style={styles.modalTitle}>Redemption Successful! 🎉</Text>
                        <Text style={styles.modalSub}>You traded points for <Text style={{ fontFamily: 'Nunito-ExtraBold', color: C.textPrimary }}>{redeemedItemTitle}</Text>. Use this code at any partner store or app.</Text>
                        
                        <TouchableOpacity style={styles.couponBox} onPress={copyCouponCode} activeOpacity={0.7}>
                            <Text style={styles.couponLabel}>YOUR COUPON CODE</Text>
                            <View style={styles.couponRow}>
                                <Text style={styles.couponCode}>{currentCoupon}</Text>
                                <View style={styles.copyIconBg}>
                                    <Ionicons name="copy-outline" size={18} color={C.navyMid} />
                                </View>
                            </View>
                            <Text style={styles.couponHint}>Tap to copy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCouponModalVisible(false)}>
                            <LinearGradient colors={[C.navy, C.navyDeep]} style={styles.modalCloseBtnGrad}>
                                <Text style={styles.modalCloseText}>Done</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>

            {/* Global Loading Overlay */}
            {redeeming && (
                <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={C.amber} />
                        <Text style={styles.loadingOverlayText}>Processing Reward...</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
<<<<<<< Updated upstream
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
=======
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },
>>>>>>> Stashed changes
    header: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
=======
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // ── Header ──
    headerArea: {
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 64,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    headerDecor1: {
        position: 'absolute', top: -40, right: -40,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.04)',
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a
    },
    headerDecor2: {
        position: 'absolute', bottom: 20, left: -30,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(245,158,11,0.06)',
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    headerLabel: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: C.amber, letterSpacing: 2, marginBottom: 4 },
    headerTitle: { fontSize: 26, fontFamily: 'Nunito-Bold', color: '#FFF', letterSpacing: -0.5 },
    authorityShield: { 
        width: 44, height: 44, borderRadius: 14, 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    },
<<<<<<< HEAD
<<<<<<< Updated upstream
    // ── Points Card ──
=======
    authorityShield: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
>>>>>>> Stashed changes
    pointsCard: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xl,
        ...SHADOWS.lg,
    },
    pointsCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
<<<<<<< Updated upstream
        gap: SPACING.xl,
=======
        gap: 20,
    },
    trophyFrame: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEF3C7',
>>>>>>> Stashed changes
=======

    // ── Balance Card ──
    balanceCard: {
        position: 'absolute',
        bottom: -52,
        left: 20, right: 20,
        backgroundColor: '#FFF',
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 22,
        ...Platform.select({
            ios: { shadowColor: C.navy, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 24 },
            android: { elevation: 12 },
        }),
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a
    },
    trophyOuter: { 
        width: 66, height: 66, borderRadius: 33, 
        backgroundColor: '#FFFBEB', 
        justifyContent: 'center', alignItems: 'center',
        padding: 4,
    },
    trophyInner: { 
        width: '100%', height: '100%', borderRadius: 30, 
        justifyContent: 'center', alignItems: 'center',
    },
    balanceInfo: { marginLeft: 18, flex: 1 },
    balanceLabel: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: C.textTertiary, letterSpacing: 1.5 },
    balanceValue: { fontSize: 36, fontFamily: 'Nunito-Bold', color: C.navy, marginTop: -2, letterSpacing: -1 },
    balanceBadge: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#FFFBEB', alignSelf: 'flex-start', 
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, 
        marginTop: 4, gap: 5,
    },
    balanceBadgeText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.amberDark },

    // ── Tabs ──
    tabBar: { 
        flexDirection: 'row', 
        backgroundColor: '#FFF', 
        borderRadius: 18, 
        padding: 5, 
        marginBottom: 24,
        ...Platform.select({
            ios: { shadowColor: C.navy, shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 3 },
        }),
    },
    tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
    tabItemActive: { backgroundColor: C.surfaceLow },
    tabText: { fontSize: 12, fontFamily: 'Nunito-SemiBold', color: C.textTertiary },
    tabTextActive: { color: C.navy, fontFamily: 'Nunito-Bold' },
    tabIndicator: { position: 'absolute', bottom: 6, width: 20, height: 3, borderRadius: 2, backgroundColor: C.navy },

    // ── Section Header ──
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontFamily: 'Nunito-Bold', color: C.textPrimary, letterSpacing: -0.5 },
    sectionSub: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginTop: 3 },
    countBadge: { backgroundColor: C.surfaceLow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    countBadgeText: { fontSize: 12, fontFamily: 'Nunito-Bold', color: C.textSecondary },

    // ── Gift Grid ──
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    giftCard: {
        width: CARD_WIDTH,
        backgroundColor: '#FFF',
        borderRadius: 22,
        marginBottom: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: C.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20 },
            android: { elevation: 5 },
        }),
    },
    imgContainer: { 
        width: '100%', height: 140, 
        backgroundColor: C.surfaceLow, 
        justifyContent: 'center', alignItems: 'center', 
        position: 'relative', overflow: 'hidden',
    },
    itemImg: { width: '100%', height: '100%' },
    iconGradient: { 
        width: '100%', height: '100%', 
        justifyContent: 'center', alignItems: 'center',
    },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    floatingPtsBadge: {
        position: 'absolute', top: 10, right: 10,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 3 },
        }),
    },
    floatingPtsText: { fontSize: 12, fontFamily: 'Nunito-ExtraBold', color: C.amberDark },
    tagBadge: {
        position: 'absolute', top: 10, left: 10,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8,
    },
    tagText: { fontSize: 8, fontFamily: 'Nunito-ExtraBold', letterSpacing: 0.8 },
    blurLayer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    lockBadge: { 
        width: 48, height: 48, borderRadius: 24, 
        backgroundColor: 'rgba(255,255,255,0.92)', 
        justifyContent: 'center', alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
            android: { elevation: 4 },
        }),
    },

    // ── Gift Content ──
    giftContent: { padding: 14, paddingTop: 12 },
    itemTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 2 },
    itemDesc: { fontSize: 10, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginBottom: 10, lineHeight: 14 },
    
    lockedFooter: { gap: 6 },
    lockedPtsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    lockedPtsText: { fontSize: 11, fontFamily: 'Nunito-Bold', color: C.textTertiary },
    progressBarBg: { height: 4, borderRadius: 2, backgroundColor: C.surfaceLow, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 2, backgroundColor: C.amber },

    redeemBtn: { borderRadius: 14, overflow: 'hidden' },
    redeemBtnGrad: { 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, gap: 6, borderRadius: 14,
    },
    redeemBtnText: { fontSize: 11, fontFamily: 'Nunito-ExtraBold', color: '#FFF', letterSpacing: 0.8 },

    // ── Earn Points ──
    infoBanner: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
    infoBannerGrad: { 
        flexDirection: 'row', alignItems: 'center', 
        paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    infoBannerText: { flex: 1, fontSize: 12, fontFamily: 'Nunito-Medium', color: C.navy, lineHeight: 18 },
    
    tierContainer: { marginBottom: 28 },
    tierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
    tierIconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    tierTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary },
    tierSubtitle: { fontSize: 11, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginTop: 1 },
    tierPointsPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    tierPointsPillText: { fontSize: 12, fontFamily: 'Nunito-ExtraBold' },
    
    tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tierCard: { 
        width: (width - 54) / 2, 
        backgroundColor: '#FFF', 
        borderRadius: 18, 
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...Platform.select({
            ios: { shadowColor: C.navy, shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 2 },
        }),
    },
    tierCardIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    tierItemName: { fontSize: 13, fontFamily: 'Nunito-SemiBold', color: C.textSecondary, textAlign: 'center' },
    tierPointsBadge: { 
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
<<<<<<< HEAD
    pointsValue: {
<<<<<<< Updated upstream
        fontSize: 40,
        fontWeight: FONT_WEIGHTS.bold,
        color: '#FFFFFF',
=======
        fontSize: 36,
        fontFamily: 'Nunito-Bold',
        color: C.navy,
        letterSpacing: -1,
    },
    contentScroll: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 100,
    },
    sectionHeader: {
        marginBottom: 20,
>>>>>>> Stashed changes
    },
    // ── Section ──
    sectionTitle: {
<<<<<<< Updated upstream
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        letterSpacing: -0.2,
=======
    tierPointsText: { fontSize: 12, fontFamily: 'Nunito-ExtraBold' },

    earnCTA: { borderRadius: 20, overflow: 'hidden', marginTop: 30 },
    earnCTAGrad: { 
        flexDirection: 'row', alignItems: 'center', 
        paddingHorizontal: 20, paddingVertical: 18,
    },
    earnCTATitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: '#FFF' },
    earnCTASub: { fontSize: 12, fontFamily: 'Nunito-Medium', color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    // ── Earn Points Enhancement ──
    subSectionTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 16, marginTop: 10 },
    howItWorks: { marginBottom: 30, backgroundColor: '#FFF', borderRadius: 24, padding: 20, elevation: 2, shadowColor: C.navy, shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    workStep: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.navy, justifyContent: 'center', alignItems: 'center' },
    stepNumText: { color: '#FFF', fontSize: 14, fontFamily: 'Nunito-ExtraBold' },
    stepTitle: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 4 },
    stepDesc: { fontSize: 12, fontFamily: 'Nunito-Medium', color: C.textSecondary, lineHeight: 18 },
    
    redemptionGuide: { marginBottom: 30 },
    guideCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    guideTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.amberDark },
    guideText: { fontSize: 13, fontFamily: 'Nunito-Medium', color: C.textSecondary, lineHeight: 22 },

    // ── Activity List ──
    activityHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20 
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a
    },
    clearBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: C.errorSurface,
    },
    clearBtnText: { 
        fontSize: 12, 
        fontFamily: 'Nunito-Bold', 
        color: C.error 
    },
    emptyActivity: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
    emptyIconCircle: { 
        width: 90, height: 90, borderRadius: 45, 
        backgroundColor: C.surfaceLow, justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    emptyTextTitle: { fontSize: 18, fontFamily: 'Nunito-Bold', color: C.textSecondary },
    emptyTextSub: { fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textTertiary, textAlign: 'center', marginTop: 6 },
    activityRow: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#FFF', padding: 16, borderRadius: 20, 
        marginBottom: 10,
        ...Platform.select({
            ios: { shadowColor: C.navy, shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 2 },
        }),
    },
    activityIconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    activityName: { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 4 },
    activityDate: { fontSize: 11, color: C.textTertiary, fontFamily: 'Nunito-Medium' },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    activityPts: { fontSize: 20, fontFamily: 'Nunito-Black' },
    activityPtsLabel: { fontSize: 9, color: C.textTertiary, fontFamily: 'Nunito-ExtraBold', letterSpacing: 1 },

    // ── Modal ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,24,52,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { 
        width: '100%', backgroundColor: '#FFF', borderRadius: 32, padding: 32, alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 40 },
            android: { elevation: 24 },
        }),
    },
    modalConfetti: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 24, fontFamily: 'Nunito-Black', color: C.navy, marginBottom: 10, textAlign: 'center' },
    modalSub: { fontSize: 14, fontFamily: 'Nunito-Medium', color: C.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    couponBox: { 
        backgroundColor: '#FFFBEB', borderWidth: 2, borderColor: '#FDE68A', borderStyle: 'dashed',
        borderRadius: 22, width: '100%', padding: 22, alignItems: 'center', marginBottom: 24,
    },
    couponLabel: { fontSize: 10, fontFamily: 'Nunito-ExtraBold', color: C.amberDark, letterSpacing: 1.5, marginBottom: 10 },
    couponRow: { flexDirection: 'row', alignItems: 'center' },
    couponCode: { fontSize: 26, fontFamily: 'Nunito-Black', color: C.textPrimary, letterSpacing: 3 },
    copyIconBg: { 
        width: 32, height: 32, borderRadius: 10, 
        backgroundColor: '#FDE68A', justifyContent: 'center', alignItems: 'center', marginLeft: 12,
    },
<<<<<<< HEAD
    redeemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    redeemText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.semibold,
    },
    lockedBadge: {
        padding: SPACING.sm,
=======
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        color: C.textPrimary,
        letterSpacing: -0.3,
    },
    sectionSubtitle: {
        fontFamily: 'Nunito-Regular',
        fontSize: 14,
        color: C.textTertiary,
        marginTop: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F3F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: C.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 14,
        color: C.textTertiary,
    },
    activeTabText: {
        color: C.navy,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    card: {
        width: (Dimensions.get('window').width - 64) / 2,
        backgroundColor: C.white,
        borderRadius: 20,
        padding: 16,
        margin: 8,
        borderWidth: 1,
        borderColor: '#EDF0F7',
        alignItems: 'center',
        shadowColor: C.navyMid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardImageContainer: {
        width: '100%',
        height: 100,
        backgroundColor: '#F8F9FB',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    rewardImage: {
        width: '90%',
        height: '90%',
    },
    cardTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: 14,
        color: C.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
        height: 40,
    },
    cardPointsContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    cardPoints: {
        fontFamily: 'Nunito-ExtraBold',
        fontSize: 18,
        color: C.navy,
    },
    cardPointsLabel: {
        fontFamily: 'Nunito-Bold',
        fontSize: 10,
        color: C.textTertiary,
    },
    redeemBadge: {
        backgroundColor: C.navy,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    lockedBadge: {
        backgroundColor: '#C4C6D0',
    },
    redeemText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 11,
        color: C.white,
    },
    guideItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EDF0F7',
    },
    guideIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    guideTitle: {
        flex: 1,
        fontFamily: 'Nunito-SemiBold',
        fontSize: 15,
        color: C.textPrimary,
    },
    guidePoints: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    guidePtsValue: {
        fontFamily: 'Nunito-ExtraBold',
        fontSize: 18,
        color: '#059669',
    },
    guidePtsLabel: {
        fontFamily: 'Nunito-Bold',
        fontSize: 12,
        color: C.textTertiary,
    },
    emptyHistory: {
        backgroundColor: C.white,
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: C.border,
    },
    emptyText: {
        fontFamily: 'Nunito-Medium',
        fontSize: 14,
        color: C.textTertiary,
        marginTop: 12,
>>>>>>> Stashed changes
=======
    couponHint: { fontSize: 10, fontFamily: 'Nunito-Medium', color: C.textTertiary, marginTop: 8 },
    modalCloseBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
    modalCloseBtnGrad: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
    modalCloseText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: '#FFF' },

    loadingOverlay: { backgroundColor: 'rgba(0,24,52,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    loadingCard: { 
        backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 40, paddingVertical: 30, 
        alignItems: 'center', gap: 14,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
            android: { elevation: 12 },
        }),
>>>>>>> 52f946b590637f20164074f60bf1748be0a7421a
    },
    loadingOverlayText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.navyMid },
});
