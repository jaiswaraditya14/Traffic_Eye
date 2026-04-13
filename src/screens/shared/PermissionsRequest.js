import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../context/AppContext';
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
    border: '#E5E7EB',
};

export default function PermissionsRequest({ navigation }) {
    const { userRole } = useAppContext();

    const handleContinue = () => {
        if (userRole === 'citizen') {
            navigation.replace('CitizenMain');
        } else {
            navigation.replace('OfficerMain');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={C.offWhite} />
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.iconBox}>
                        <Ionicons name="shield-checkmark" size={48} color={C.amber} />
                    </View>
                    <Text style={styles.title}>Permissions Required</Text>
                    <Text style={styles.subtitle}>To provide the best experience and ensure accurate reports, Traffic Eye needs access to the following:</Text>

                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={[styles.iconBg, { backgroundColor: '#E0E7FF' }]}><Ionicons name="camera" size={20} color={C.navyMid} /></View>
                            <View style={styles.textCol}>
                                <Text style={styles.rowTitle}>Camera</Text>
                                <Text style={styles.rowDesc}>To capture clear violation evidence</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <View style={[styles.iconBg, { backgroundColor: '#D1FAE5' }]}><Ionicons name="location" size={20} color="#059669" /></View>
                            <View style={styles.textCol}>
                                <Text style={styles.rowTitle}>Location</Text>
                                <Text style={styles.rowDesc}>To precisely tag violation locations</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <View style={[styles.iconBg, { backgroundColor: '#FEF3C7' }]}><Ionicons name="images" size={20} color={C.amber} /></View>
                            <View style={styles.textCol}>
                                <Text style={styles.rowTitle}>Photo Library</Text>
                                <Text style={styles.rowDesc}>To upload existing media for reports</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} activeOpacity={0.88}>
                        <LinearGradient colors={[C.navy, C.navyMid]} style={styles.primaryBtnGradient} start={{x:0,y:0}} end={{x:1,y:0}}>
                            <Text style={styles.primaryBtnText}>Grant Permissions</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ghostBtn} onPress={handleContinue} activeOpacity={0.7}>
                        <Text style={styles.ghostBtnText}>Skip for Now</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },
    content: { padding: 24, alignItems: 'center', paddingTop: 60 },
    
    iconBox: { width: 88, height: 88, borderRadius: 24, backgroundColor: C.navyMid, justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    title: { fontSize: 26, fontFamily: 'Nunito-Bold', color: C.navy, marginBottom: 12, letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 10 },

    card: { width: '100%', backgroundColor: C.surface, borderRadius: 20, padding: 8, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: C.border },
    row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    iconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    textCol: { flex: 1 },
    rowTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.textPrimary, marginBottom: 2 },
    rowDesc: { fontSize: 13, color: C.textSecondary },
    divider: { height: 1, backgroundColor: '#F2F4F6', marginLeft: 76 },

    footer: { padding: 24, paddingBottom: 32 },
    primaryBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, shadowColor: C.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
    primaryBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { fontSize: 16, fontFamily: 'Nunito-Bold', color: C.white },
    ghostBtn: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    ghostBtnText: { fontSize: 15, fontFamily: 'Nunito-SemiBold', color: C.textSecondary },
});
