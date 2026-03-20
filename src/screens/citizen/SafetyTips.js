import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils';

const { width } = Dimensions.get('window');

const TIPS_DATA = {
    helmet: {
        title: 'Helmet Tips',
        image: require('../../../assets/images/helmet.png'),
        sections: [
            {
                title: 'Safety Tips: Always Wear a Helmet',
                content: 'A helmet is the single most effective way to reduce head injuries and fatalities from motorcycle and bicycle crashes.'
            },
            {
                title: 'Basic Construction',
                content: '• Rigid outer shell\n• Impact absorbing liner\n• Comfort/fit padding\n• Retention system (strap)\n• Face shield / Eye protection'
            },
            {
                title: 'Material & Protective Quality',
                content: 'Ensure your helmet meets safety standards (like DOT, ECE, or ISI). High-quality materials like polycarbonate or carbon fiber provide better protection.'
            },
            {
                title: 'Sizes & Fitment',
                content: 'A helmet should fit snugly but not be painfully tight. It should stay in place when you shake your head.'
            },
            {
                title: 'Helmet Rules',
                content: 'Both rider and pillion must wear BIS-certified helmets. Failure to do so can result in heavy fines and license suspension.'
            }
        ]
    },
    seatbelt: {
        title: 'Seat Belt Tips',
        image: require('../../../assets/images/seatbelt.png'),
        sections: [
            {
                title: 'Latching the 3-Point Seat Belt',
                content: '1. Adjust seat to proper driving position.\n2. Pull belt across body without twisting.\n3. Insert latch into buckle until it clicks.\n4. Tug to ensure it is securely fastened.\n5. Snug belt across hips/thighs and center shoulder belt across chest.'
            },
            {
                title: 'Safety Benefits',
                content: 'Seat belts keep you inside the vehicle and prevent you from being thrown against the interior or through the windshield during a crash.'
            }
        ]
    },
    speeding: {
        title: 'Speeding Tips',
        image: require('../../../assets/images/crosspath.png'),
        sections: [
            {
                title: 'Common Crash Scenarios',
                content: '• Right Hook: Vehicle turns right into opposite direction cyclist.\n• Left Hook: Vehicle turns left while cyclist is traveling straight.'
            },
            {
                title: 'Defensive Driving',
                content: '• Don\'t change position abruptly in a group.\n• Don\'t ride the brakes unnecessarily - maintain smooth control.\n• Brake early when you see others braking ahead.'
            },
            {
                title: 'Impact of Speed',
                content: 'Higher speeds reduce your reaction time and increase the severity of any impact. Always follow posted speed limits.'
            }
        ]
    }
};

export default function SafetyTips({ navigation }) {
    const [activeTab, setActiveTab] = useState('helmet');

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Safety Tips</Text>
            <View style={{ width: 40 }} />
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'helmet' && styles.activeTab]}
                onPress={() => setActiveTab('helmet')}
            >
                <Ionicons name="bicycle" size={24} color={activeTab === 'helmet' ? COLORS.primary : COLORS.gray500} />
                <Text style={[styles.tabText, activeTab === 'helmet' && styles.activeTabText]}>Helmet</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.tab, activeTab === 'seatbelt' && styles.activeTab]}
                onPress={() => setActiveTab('seatbelt')}
            >
                <Ionicons name="shield-checkmark" size={23} color={activeTab === 'seatbelt' ? COLORS.primary : COLORS.gray500} />
                <Text style={[styles.tabText, activeTab === 'seatbelt' && styles.activeTabText]}>Seat Belt</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.tab, activeTab === 'speeding' && styles.activeTab]}
                onPress={() => setActiveTab('speeding')}
            >
                <Ionicons name="speedometer" size={24} color={activeTab === 'speeding' ? COLORS.primary : COLORS.gray500} />
                <Text style={[styles.tabText, activeTab === 'speeding' && styles.activeTabText]}>Speeding</Text>
            </TouchableOpacity>
        </View>
    );

    const data = TIPS_DATA[activeTab];

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                {renderHeader()}
                {renderTabs()}

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={data.image}
                            style={styles.mainImage}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.screenTitle}>{data.title}</Text>

                    {data.sections.map((section, index) => (
                        <View key={index} style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </View>
                            <Text style={styles.sectionContent}>{section.content}</Text>
                        </View>
                    ))}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100,
        ...SHADOWS.sm
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.xs,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 10,
        color: COLORS.gray500,
        fontWeight: FONT_WEIGHTS.medium,
        marginTop: 2,
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.bold,
    },
    content: {
        flex: 1,
        padding: SPACING.lg,
    },
    imageContainer: {
        width: '100%',
        height: 220,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.md
    },
    mainImage: {
        width: '90%',
        height: '90%',
    },
    screenTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    sectionCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        gap: SPACING.xs
    },
    sectionTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    sectionContent: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
    }
});
