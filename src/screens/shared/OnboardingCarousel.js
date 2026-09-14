import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Dimensions,
    TouchableOpacity, Image, StatusBar, Animated, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../utils/theme';
import useReducedMotion from '../../hooks/useReducedMotion';
import { FocusAwareStatusBar } from '../../components';

const { width } = Dimensions.get('window');

const C = {
    navy: COLORS.primary,
    navyMid: COLORS.primaryLight,
    amber: COLORS.secondary,
    amberDark: COLORS.secondaryDark,
    white: COLORS.surface,
    offWhite: COLORS.background,
    textPrimary: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    textTertiary: COLORS.textTertiary,
    border: COLORS.surfaceContainerHighest,
};

const slides = [
    { image: require('../../../assets/images/onboarding_1.png'), icon: 'camera', title: 'See a violation? Snap it!', description: 'Capture photo or video evidence instantly', accent: COLORS.primary, iconColor: COLORS.primary, iconBg: COLORS.primarySurface },
    { image: require('../../../assets/images/onboarding_2.png'), icon: 'scan', title: 'AI analyzes in seconds', description: 'Smart detection of plates, violations, and locations', accent: COLORS.primary, iconColor: COLORS.primary, iconBg: COLORS.primarySurface },
    { image: require('../../../assets/images/onboarding_3.png'), icon: 'shield-checkmark', title: 'Officers verify and act', description: 'Verified reports lead to real enforcement', accent: COLORS.success, iconColor: COLORS.success, iconBg: COLORS.successSurface },
    { image: require('../../../assets/images/onboarding_4.png'), icon: 'trophy', title: 'Earn rewards, save lives', description: 'Collect points for every approved report', accent: COLORS.secondary, iconColor: COLORS.secondary, iconBg: COLORS.secondarySurface },
];



export default function OnboardingCarousel({ navigation }) {
    const { width, height } = useWindowDimensions();
    const reduced = useReducedMotion();
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentSlide, setCurrentSlide] = useState(0);
    const { setHasSeenOnboarding } = useAppContext();
    const scrollViewRef = useRef(null);
    const buttonScale = useRef(new Animated.Value(1)).current;

    useEffect(() => () => { buttonScale.stopAnimation(); scrollX.stopAnimation(); }, [buttonScale, scrollX]);
    useEffect(() => { scrollViewRef.current?.scrollTo({ x: width * currentSlide, animated: false }); }, [width]);
    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            const next = currentSlide + 1;
            setCurrentSlide(next);
            scrollViewRef.current?.scrollTo({ x: width * next, animated: !reduced });
        } else {
            setHasSeenOnboarding(true);
        }
    };

    const handleSkip = () => setHasSeenOnboarding(true);

    const handleScroll = (event) => {
        const idx = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentSlide(idx);
    };

    const onPressIn = () =>
        !reduced && Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
    const onPressOut = () =>
        !reduced && Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

    return (
        <SafeAreaView style={styles.container}>
            <FocusAwareStatusBar barStyle="dark-content" statusBgColor={C.offWhite} />

            <Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
            >
                {slides.map((s, index) => (
                    <ScrollView key={index} style={{ width }} contentContainerStyle={[styles.slide, { width }]} showsVerticalScrollIndicator={false} accessibilityElementsHidden={currentSlide !== index}>

                        {/* ── Large rounded image card ── */}
                        <Animated.View style={[styles.imageContainer, { width: width - 32, height: Math.min(290, height * 0.36), marginTop: 16, transform: [{ translateX: reduced ? 0 : scrollX.interpolate({ inputRange: [(index - 1) * width, index * width, (index + 1) * width], outputRange: [-22, 0, 22], extrapolate: 'clamp' }) }] }]}>
                            <Image
                                source={s.image}
                                style={styles.slideImage}
                                resizeMode="contain"
                            />
                            {/* Accent top bar */}
                            <View style={[styles.accentBar, { backgroundColor: s.accent }]} />
                            {/* Fade-out at bottom so it blends into page */}
                            <LinearGradient
                                colors={['transparent', 'rgba(248,249,251,0.55)', C.offWhite]}
                                style={styles.imageGradient}
                            />
                        </Animated.View>

                        {/* ── Icon badge overlapping image bottom ── */}
                        <View style={[styles.iconBadge, { backgroundColor: s.iconBg }]}>
                            <Ionicons name={s.icon} size={32} color={s.iconColor} />
                        </View>

                        {/* ── Text ── */}
                        <View style={styles.textSection}>
                            <Text style={styles.slideTitle}>{s.title}</Text>
                            <Text style={styles.slideDescription}>{s.description}</Text>
                        </View>
                    </ScrollView>
                ))}
            </Animated.ScrollView>

            {/* ── Bottom Controls ── */}
            <View style={styles.bottomSection}>
                <View style={styles.indicators}>
                    {slides.map((s, index) => (
                        <View
                            key={index}
                            accessible accessibilityLabel={'Page ' + (index + 1) + ' of 4'} accessibilityState={{ selected: index === currentSlide }}
                            style={[
                                styles.indicator,
                                index === currentSlide
                                    ? [styles.indicatorActive, { backgroundColor: s.accent }]
                                    : styles.indicatorInactive,
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.ctaRow}>
                    {!(currentSlide === slides.length - 1) && (
                        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                            <Text style={styles.skipText}>Skip</Text>
                        </TouchableOpacity>
                    )}

                    <Animated.View
                        style={[
                            styles.nextButtonWrapper,
                            { flex: 1 },
                            { transform: [{ scale: buttonScale }] },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={handleNext}
                            onPressIn={onPressIn}
                            onPressOut={onPressOut}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={currentSlide === slides.length - 1 ? [C.amberDark, C.amber] : [C.navy, C.navyMid]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextButtonGradient}
                            >
                                <Text style={styles.nextButtonText}>
                                    {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
                                </Text>
                                <Ionicons
                                    name={currentSlide === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
                                    size={18}
                                    color={C.white}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                <View style={styles.trustRow}>
                    <Ionicons name="shield-checkmark" size={12} color={C.textTertiary} />
                    <Text style={styles.trustText}>Community road safety • Academic Project</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.offWhite,
    },
    scrollView: {
        flex: 1,
    },
    slide: {
        flexGrow: 1,
        backgroundColor: C.offWhite,
    },

    // ── Large card image (replaces small circle) ──
    imageContainer: {
        width: width - 32,
        height: 310,
        alignSelf: 'center',
        borderRadius: 28,
        overflow: 'hidden',
        marginTop: 52,
        // Shadow
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 30,
        elevation: 12,
    },
    accentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 5,
        zIndex: 1,
    },
    slideImage: {
        width: '100%',
        height: '100%',
    },
    imageGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 110,
    },

    // ── Icon badge ──
    iconBadge: {
        width: 68,
        height: 68,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: -22,
        zIndex: 10,
        shadowColor: '#1B3A6B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },

    // ── Text section ──
    textSection: {
        paddingHorizontal: 28,
        paddingTop: 22,
        alignItems: 'center',
    },
    slideTitle: {
        fontFamily: 'Nunito-Bold',
        fontSize: 28,
        color: C.navy,
        letterSpacing: -0.5,
        marginBottom: 10,
        textAlign: 'center',
    },
    slideDescription: {
        fontFamily: 'Nunito-Regular',
        fontSize: 15,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
        marginBottom: 18,
    },


    // ── Bottom controls ──
    bottomSection: {
        paddingHorizontal: 28,
        paddingBottom: 12,
        backgroundColor: C.offWhite,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    indicator: {
        height: 6,
        borderRadius: 3,
    },
    indicatorActive: { width: 30 },
    indicatorInactive: { width: 6, backgroundColor: '#D1D5DB' },

    ctaRow: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    skipButton: {
        paddingHorizontal: 22,
        paddingVertical: 18,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    skipText: {
        fontFamily: 'Nunito-SemiBold',
        fontSize: 15,
        color: C.textTertiary,
    },
    nextButtonWrapper: {},
    nextButton: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        paddingHorizontal: 28,
    },
    nextButtonText: {
        fontFamily: 'Nunito-Bold',
        fontSize: 17,
        color: C.white,
    },
    trustRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    trustText: {
        fontFamily: 'Nunito-Medium',
        fontSize: 12,
        color: C.textTertiary,
    },
});
