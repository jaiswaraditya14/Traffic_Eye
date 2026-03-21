import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Alert, TextInput, StatusBar } from 'react-native';
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
    error: '#BA1A1A',
    success: '#059669',
    successSurface: '#D1FAE5',
    warning: '#D97706',
};

export default function AIResultsVerification({ navigation, route }) {
    const { currentReport } = useAppContext();
    const { aiResults } = route.params || {};

    const [vehicleNumber, setVehicleNumber] = useState(aiResults?.vehicleNumber || '');
    const [violationType, setViolationType] = useState(aiResults?.violationType || '');
    const [confidence] = useState(aiResults?.confidence?.toString() || '0');
    const [imageModalVisible, setImageModalVisible] = useState(false);

    const severity = aiResults?.severity || 'Unknown';
    const violationDetected = aiResults?.violationDetected !== false;

    const handleSubmit = () => {
        if (!vehicleNumber.trim()) {
            Alert.alert('Error', 'Please enter a vehicle number');
            return;
        }
        if (!violationType.trim()) {
            Alert.alert('Error', 'Please select or enter a violation type');
            return;
        }

        navigation.navigate('ReportSuccess', {
            verifiedData: {
                vehicleNumber,
                violationType,
                severity,
                confidence: `${confidence}%`,
                ...currentReport
            }
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyMid} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* ── Header ── */}
                <LinearGradient colors={[C.navy, C.navyMid]} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={C.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Review AI Results</Text>
                    <View style={{ width: 36 }} />
                </LinearGradient>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Media Preview */}
                    <View style={styles.mediaContainer}>
                        {currentReport?.image ? (
                            <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
                                <Image source={{ uri: currentReport.image }} style={styles.mediaPreview} resizeMode="cover" />
                                <View style={styles.zoomBtn}><Ionicons name="expand" size={16} color={C.navyMid} /></View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.placeholder}><Ionicons name="image" size={48} color={C.border} /></View>
                        )}
                    </View>

                    {/* AI Insights Card */}
                    <View style={styles.aiCard}>
                        <View style={styles.aiHeader}>
                            <Ionicons name="sparkles" size={18} color={violationDetected ? C.success : C.warning} />
                            <Text style={[styles.aiTitle, { color: violationDetected ? C.success : C.warning }]}>AI Detection</Text>
                            <View style={styles.confidenceBadge}>
                                <Text style={styles.confidenceText}>{confidence}% Match</Text>
                            </View>
                        </View>
                        {violationDetected ? (
                            <View style={styles.aiAlertBox}>
                                <Text style={styles.aiAlertText}>A potential <Text style={{fontWeight:'700'}}>{violationType}</Text> violation has been detected. Please verify the accuracy of the extracted details below.</Text>
                            </View>
                        ) : (
                            <View style={styles.aiAlertBox}>
                                <Text style={styles.aiAlertText}>No clear violations detected automatically. You may still submit the report manually by filling out the details.</Text>
                            </View>
                        )}
                    </View>

                    {/* Input Forms */}
                    <Text style={styles.sectionHeader}>Detected Details</Text>
                    
                    <View style={styles.inputBox}>
                        <Text style={styles.inputLabel}>Vehicle Registration Plate</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. MH12AB1234"
                            value={vehicleNumber}
                            onChangeText={setVehicleNumber}
                            autoCapitalize="characters"
                            placeholderTextColor={C.textTertiary}
                        />
                    </View>

                    <View style={styles.inputBox}>
                        <Text style={styles.inputLabel}>Violation Type</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Red Light Running"
                            value={violationType}
                            onChangeText={setViolationType}
                            placeholderTextColor={C.textTertiary}
                        />
                        <View style={styles.chipsRow}>
                            {['Speeding', 'Red Light', 'No Helmet', 'Wrong Way'].map(type => (
                                <TouchableOpacity key={type} style={styles.chip} onPress={() => setViolationType(type)}>
                                    <Text style={styles.chipText}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                </ScrollView>

                {/* Footer Action */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} activeOpacity={0.88}>
                        <LinearGradient colors={[C.navy, C.navyMid]} style={styles.primaryBtnGradient} start={{x:0,y:0}} end={{x:1,y:0}}>
                            <Text style={styles.primaryBtnText}>Confirm & Submit</Text>
                            <Ionicons name="checkmark-circle" size={18} color={C.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>

            {/* Modal */}
            <Modal visible={imageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setImageModalVisible(false)}>
                        <Ionicons name="close" size={28} color={C.white} />
                    </TouchableOpacity>
                    <Image source={{ uri: currentReport?.image }} style={styles.modalImg} resizeMode="contain" />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.offWhite },
    safeArea: { flex: 1 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.white },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

    // Media
    mediaContainer: { width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface, marginBottom: 20, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    mediaPreview: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    zoomBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 12 },

    // AI Card
    aiCard: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#BBF7D0' },
    aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    aiTitle: { fontSize: 15, fontWeight: '800', marginLeft: 6, flex: 1 },
    confidenceBadge: { backgroundColor: C.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    confidenceText: { fontSize: 11, fontWeight: '800', color: C.white },
    aiAlertBox: { marginTop: 4 },
    aiAlertText: { fontSize: 14, color: '#166534', lineHeight: 20 },

    sectionHeader: { fontSize: 16, fontWeight: '800', color: C.navyMid, marginBottom: 16, letterSpacing: -0.2 },

    inputBox: { marginBottom: 20 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary, marginBottom: 8, marginLeft: 4 },
    textInput: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.textPrimary, shadowColor: C.navyMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
    chipText: { fontSize: 13, fontWeight: '600', color: C.navyMid },

    footer: { padding: 20, paddingBottom: 32, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: '#F2F4F6' },
    primaryBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
    primaryBtnGradient: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: C.white },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    modalImg: { width: '100%', height: '80%' },
});
