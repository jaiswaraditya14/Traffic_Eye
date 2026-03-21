import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
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
    redAlert: '#DC2626',
    border: '#E5E7EB',
};

export default function TrafficSigns({ navigation }) {
    const signs = [
        { id: '1', title: 'No Parking', icon: 'remove-circle', color: C.redAlert },
        { id: '2', title: 'No Entry', icon: 'close-circle', color: C.redAlert },
        { id: '3', title: 'No Horn', icon: 'volume-mute', color: '#111827' },
        { id: '4', title: 'Speed Lmt 50', icon: 'speedometer', color: '#111827', value: '50' },
        { id: '5', title: 'Speed Lmt 30', icon: 'speedometer', color: '#111827', value: '30' },
        { id: '6', title: 'No Left', icon: 'arrow-back-circle', color: C.redAlert },
        { id: '7', title: 'No Right', icon: 'arrow-forward-circle', color: C.redAlert },
        { id: '8', title: 'No Halting', icon: 'stop-circle', color: C.redAlert },
        { id: '9', title: 'One Way Left', icon: 'arrow-back', color: '#111827' },
        { id: '10', title: 'One Way Right', icon: 'arrow-forward', color: '#111827' },
        { id: '11', title: 'No Both Side', icon: 'swap-horizontal', color: C.redAlert },
        { id: '12', title: 'Cycle Stop', icon: 'bicycle', color: C.redAlert },
        { id: '13', title: 'Handcart Stop', icon: 'cart', color: C.redAlert },
        { id: '14', title: 'No U Turn', icon: 'refresh-circle', color: C.redAlert },
        { id: '15', title: 'No Overtake', icon: 'car-sport', color: C.redAlert },
    ];

    const renderSign = ({ item }) => (
        <View style={styles.signCard}>
            <View style={styles.iconContainer}>
                <View style={[styles.circleBorder, { borderColor: item.color === C.redAlert ? C.redAlert : C.navyMid }]}>
                    {item.value ? (
                        <Text style={styles.speedValue}>{item.value}</Text>
                    ) : (
                        <Ionicons name={item.icon} size={28} color={item.color} />
                    )}
                    {(item.color === C.redAlert) && <View style={styles.slashLine} />}
                </View>
            </View>
            <Text style={styles.signTitle} numberOfLines={2} adjustsFontSizeToFit>{item.title}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Traffic Signs</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <FlatList
                    data={signs}
                    renderItem={renderSign}
                    keyExtractor={item => item.id}
                    numColumns={3}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
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
        marginBottom: 8,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.white },

    listContainer: { padding: 12, paddingBottom: 40 },
    signCard: {
        flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 12, margin: 6,
        alignItems: 'center', justifyContent: 'center', height: 124,
        borderWidth: 1, borderColor: C.border,
        shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    },
    iconContainer: { height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    circleBorder: {
        width: 52, height: 52, borderRadius: 26, borderWidth: 3.5,
        justifyContent: 'center', alignItems: 'center', position: 'relative',
        backgroundColor: C.white,
    },
    speedValue: { fontSize: 18, fontWeight: '900', color: '#111827' },
    slashLine: { position: 'absolute', width: '120%', height: 3.5, backgroundColor: C.redAlert, transform: [{ rotate: '-45deg' }] },
    signTitle: { fontSize: 11, fontWeight: '700', color: C.textPrimary, textAlign: 'center', lineHeight: 14 },
});
