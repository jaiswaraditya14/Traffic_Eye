import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileContainer } from '../../components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../utils';

export default function TrafficSigns({ navigation }) {
    const signs = [
        { id: '1', title: 'No Parking', icon: 'remove-circle', color: '#ff4444' },
        { id: '2', title: 'No Entry', icon: 'close-circle', color: '#ff4444' },
        { id: '3', title: 'No Horn', icon: 'volume-mute', color: '#666' },
        { id: '4', title: 'Speed Limit 50', icon: 'speedometer', color: '#333', value: '50' },
        { id: '5', title: 'Speed Limit 30', icon: 'speedometer', color: '#333', value: '30' },
        { id: '6', title: 'No Left', icon: 'arrow-back-circle', color: '#ff4444' },
        { id: '7', title: 'No Right', icon: 'arrow-forward-circle', color: '#ff4444' },
        { id: '8', title: 'No Halting', icon: 'hand-palsm', color: '#ff4444' }, // Hand sign with slash
        { id: '9', title: 'One Way Left', icon: 'arrow-back', color: '#333' },
        { id: '10', title: 'One Way Right', icon: 'arrow-forward', color: '#333' },
        { id: '11', title: 'No Both Side', icon: 'swap-horizontal', color: '#ff4444' },
        { id: '12', title: 'Cycle Prohibited', icon: 'bicycle', color: '#ff4444' },
        { id: '13', title: 'Handcart Prohibited', icon: 'cart', color: '#ff4444' },
        { id: '14', title: 'No U Turn', icon: 'refresh-circle', color: '#ff4444' },
        { id: '15', title: 'Overtaking Prohibited', icon: 'car-sport', color: '#ff4444' },
        { id: '16', title: 'Pedestrian Prohibited', icon: 'walk', color: '#ff4444' },
        { id: '17', title: 'Truck Prohibited', icon: 'bus', color: '#ff4444' },
        { id: '18', title: 'Stop', icon: 'stop-circle', color: '#ff4444' },
        { id: '19', title: 'No Stopping', icon: 'hand-right', color: '#ff4444' },
        { id: '20', title: 'Narrow Road', icon: 'resize', color: '#333' },
        { id: '21', title: 'Traffic Light', icon: 'traffic-light', color: '#333' },
    ];

    const renderSign = ({ item }) => (
        <View style={styles.signCard}>
            <View style={styles.iconContainer}>
                {item.id === '21' ? (
                    // Traffic light representation
                    <View style={styles.trafficLightContainer}>
                        <View style={[styles.trafficLight, { backgroundColor: '#FFD700', borderWidth: 3, borderColor: '#000' }]}>
                            <View style={[styles.light, { backgroundColor: '#ff4444' }]} />
                            <View style={[styles.light, { backgroundColor: '#ffbb33', marginVertical: 2 }]} />
                            <View style={[styles.light, { backgroundColor: '#00C851' }]} />
                        </View>
                    </View>
                ) : (
                    <View style={styles.circleBorder}>
                        {item.value ? (
                            <Text style={styles.speedValue}>{item.value}</Text>
                        ) : (
                            <Ionicons name={item.icon === 'hand-palsm' ? 'hand-right' : item.icon} size={32} color={item.color} />
                        )}
                        {(item.color === '#ff4444' || item.id === '8') && (
                            <View style={styles.slashLine} />
                        )}
                    </View>
                )}
            </View>
            <Text style={styles.signTitle}>{item.title}</Text>
        </View>
    );

    return (
        <MobileContainer>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Traffic Signs</Text>
                    <View style={{ width: 40 }} />
                </View>

                <FlatList
                    data={signs}
                    renderItem={renderSign}
                    keyExtractor={item => item.id}
                    numColumns={3}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </MobileContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100
    },
    backButton: { padding: SPACING.xs },
    headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
    listContainer: { padding: SPACING.sm },
    signCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.sm,
        margin: 4,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
        height: 120
    },
    iconContainer: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xs
    },
    circleBorder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 3,
        borderColor: '#ff4444',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    signTitle: {
        fontSize: 10,
        fontWeight: FONT_WEIGHTS.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginTop: 4
    },
    speedValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    slashLine: {
        position: 'absolute',
        width: '120%',
        height: 3,
        backgroundColor: '#ff4444',
        transform: [{ rotate: '-45deg' }]
    },
    trafficLightContainer: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trafficLight: {
        width: 30,
        padding: 4,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    light: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#333'
    }
});
