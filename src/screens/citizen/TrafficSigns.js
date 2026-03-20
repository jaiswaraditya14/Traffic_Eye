import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils/theme';

const SIGNS = [
    {
        id: '1',
        title: 'Stop Sign',
        description: 'Mandatory command to completely stop the vehicle before proceeding.',
        image: require('../../../assets/stop.png'),
    },
    {
        id: '2',
        title: 'Speed Limit',
        description: 'Maximum permitted vehicle speed. Exceeding this limit is illegal and unsafe.',
        image: require('../../../assets/speedlimit.png'),
    },
    {
        id: '3',
        title: 'Pedestrian Crossing',
        description: 'Caution indicator for crosswalk ahead. Drivers must yield to pedestrians.',
        image: require('../../../assets/crossing.png'),
    },
    {
        id: '4',
        title: 'Traffic Signals',
        description: 'Red means stop, yellow means prepare to stop, green means proceed if safe.',
        image: require('../../../assets/traffic_signals.png'),
    }
];

export default function TrafficSigns({ navigation }) {
    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Traffic Signs</Text>
                    <View style={styles.placeholder} />
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.introText}>
                        Familiarize yourself with common traffic signs to ensure safe and compliant driving.
                    </Text>
                    <View style={styles.gridContainer}>
                        {SIGNS.map(sign => (
                            <View key={sign.id} style={styles.card}>
                                <View style={styles.imageContainer}>
                                    <Image source={sign.image} style={styles.image} resizeMode="contain" />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={styles.title}>{sign.title}</Text>
                                    <Text style={styles.description}>{sign.description}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    introText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
        lineHeight: 22,
    },
    gridContainer: {
        flexDirection: 'column',
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
        ...SHADOWS.md,
    },
    imageContainer: {
        width: '100%',
        height: 220,
        backgroundColor: COLORS.background || '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.sm, // reduced padding drastically to make image larger
    },
    image: {
        width: '100%',
        height: '100%',
    },
    cardContent: {
        padding: SPACING.lg,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    description: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
});
