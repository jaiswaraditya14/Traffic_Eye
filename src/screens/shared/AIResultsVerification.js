import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Alert, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, rewardService } from '../../services';
import * as FileSystem from 'expo-file-system/legacy';
const { EncodingType } = FileSystem;
import { decode } from 'base64-arraybuffer';

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

    const [vehicleNumber, setVehicleNumber] = useState(
        aiResults?.vehicleNumber || currentReport?.vehiclePlate || ''
    );

    const [violationType, setViolationType] = useState(aiResults?.violationType || '');
    const [address, setAddress] = useState(currentReport?.address || '');
    const [confidence] = useState(aiResults?.confidence?.toString() || '0');
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const severity = aiResults?.severity || 'Unknown';
    const violationDetected = aiResults?.violationDetected !== false;

    const handleSubmit = async () => {
        if (!vehicleNumber.trim()) {
            Alert.alert('Error', 'Please enter a vehicle number');
            return;
        }
        if (!violationType.trim()) {
            Alert.alert('Error', 'Please select or enter a violation type');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Upload image to Storage
            let publicUrl = null;
            let storagePath = null;

            if (currentReport?.image) {
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                storagePath = `${user.id}/${fileName}`;

                // Convert URI to Base64 and then to ArrayBuffer
                const base64 = await FileSystem.readAsStringAsync(currentReport.image, {
                    encoding: EncodingType?.Base64 || 'base64',
                });

                const { error: uploadError } = await supabase.storage
                    .from('report-media')
                    .upload(storagePath, decode(base64), {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl: url } } = supabase.storage
                    .from('report-media')
                    .getPublicUrl(storagePath);
                
                publicUrl = url;
            }

            let imgReportId = null;

            // Save to new image_reports table (officer queue + transparency layer)
            const severityLower = (aiResults?.severity || 'medium').toLowerCase();
            const normSeverity = ['low', 'medium', 'high', 'critical'].includes(severityLower) ? severityLower : 'medium';
            const { data: imgReport, error: imgReportError } = await supabase.from('image_reports').insert({
                user_id:               user.id,
                image_url:             publicUrl || '',
                image_storage_path:    storagePath,
                location_address:      address || currentReport?.address || null,
                violation_type:        violationType,
                violation_description: aiResults?.description || null,
                severity:              normSeverity,
                ai_confidence:         parseFloat(confidence) / 100,
                ai_raw_result:         aiResults,
                vehicle_number:        vehicleNumber,
                status:                'pending',
            }).select().single();

            if (imgReportError) throw imgReportError;
            imgReportId = imgReport.id;

            // Link evidence to report_media table (for gallery display)
            if (imgReportId && publicUrl) {
                await supabase.from('report_media').insert({
                    report_id:    imgReportId,
                    file_url:     publicUrl,
                    file_type:    'image',
                    storage_path: storagePath,
                    file_name:    storagePath?.split('/').pop(),
                    mime_type:    'image/jpeg',
                });
            }

            // No points awarded at submission time.
            // Points are awarded by the officer via submit_officer_review DB function upon approval.

            navigation.navigate('ReportSuccess', {
                verifiedData: {
                    vehicleNumber,
                    violationType,
                    severity,
                    confidence: `${confidence}%`,
                    ...currentReport,
                    address, // Use edited address
                    reportId: imgReportId
                }
            });
        } catch (error) {
            console.error('Error saving report:', error);
            Alert.alert('Submission Failed', error.message || 'Could not save report. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
                                <Text style={styles.aiAlertText}>A potential <Text style={{fontFamily: 'Nunito-Bold'}}>{violationType}</Text> violation has been detected. Please verify the accuracy of the extracted details below.</Text>
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
                            {['Speeding', 'Red Light', 'No Helmet', 'Wrong Way', 'Illegal Parking', 'Phone Use', 'Triple Riding', 'No Seatbelt', 'Footpath Driving', 'Overloading'].map(type => (
                                <TouchableOpacity key={type} style={styles.chip} onPress={() => setViolationType(type)}>
                                    <Text style={styles.chipText}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputBox}>
                        <Text style={styles.inputLabel}>Incident Location Address</Text>
                        <TextInput
                            style={[styles.textInput, styles.addressInput]}
                            placeholder="Location details..."
                            value={address}
                            onChangeText={setAddress}
                            multiline
                            numberOfLines={4}
                            placeholderTextColor={C.textTertiary}
                        />
                    </View>

                </ScrollView>

                {/* Footer Action */}
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.primaryBtn, (submitting || !violationDetected) && { opacity: 0.7 }]} 
                        onPress={handleSubmit} 
                        disabled={submitting}
                        activeOpacity={0.88}
                    >
                        <LinearGradient colors={[C.navy, C.navyMid]} style={styles.primaryBtnGradient} start={{x:0,y:0}} end={{x:1,y:0}}>
                            {submitting ? (
                                <ActivityIndicator color={C.white} size="small" />
                            ) : (
                                <>
                                    <Text style={styles.primaryBtnText}>Confirm & Submit</Text>
                                    <Ionicons name="checkmark-circle" size={18} color={C.white} />
                                </>
                            )}
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
    headerTitle: { fontSize: 20, fontFamily: 'Nunito-Bold', color: C.white },

    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

    // Media
    mediaContainer: { 
        width: '100%', 
        height: 240, 
        borderRadius: 24, 
        overflow: 'hidden', 
        backgroundColor: C.surface, 
        marginBottom: 24, 
        shadowColor: '#1B3A6B', 
        shadowOffset: { width: 0, height: 12 }, 
        shadowOpacity: 0.12, 
        shadowRadius: 20, 
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    mediaPreview: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    zoomBtn: { 
        position: 'absolute', 
        bottom: 16, 
        right: 16, 
        backgroundColor: 'rgba(255,255,255,0.92)', 
        padding: 10, 
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    // AI Card
    aiCard: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 24, 
        padding: 20, 
        marginBottom: 28, 
        borderWidth: 1, 
        borderColor: 'rgba(5,150,105,0.1)',
        shadowColor: C.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    aiTitle: { fontSize: 16, fontFamily: 'Nunito-Bold', marginLeft: 8, flex: 1 },
    confidenceBadge: { 
        backgroundColor: C.successSurface, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(5,150,105,0.2)',
    },
    confidenceText: { fontSize: 12, fontFamily: 'Nunito-ExtraBold', color: C.success, letterSpacing: 0.2 },
    aiAlertBox: { 
        marginTop: 4,
        paddingLeft: 4,
    },
    aiAlertText: { fontSize: 14, color: C.textSecondary, lineHeight: 22, fontFamily: 'Nunito-Medium' },

    sectionHeader: { 
        fontSize: 17, 
        fontFamily: 'Nunito-Bold', 
        color: C.navy, 
        marginBottom: 20, 
        letterSpacing: -0.2,
        marginLeft: 4,
    },

    inputBox: { marginBottom: 24 },
    inputLabel: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navyMid, marginBottom: 10, marginLeft: 6 },
    textInput: { 
        backgroundColor: C.surface, 
        borderWidth: 1.5, 
        borderColor: '#E5E7EB', 
        borderRadius: 16, 
        paddingHorizontal: 18, 
        paddingVertical: 14, 
        fontSize: 16, 
        color: C.textPrimary, 
        fontFamily: 'Nunito-SemiBold',
        shadowColor: C.navyMid, 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.02, 
        shadowRadius: 6, 
    },
    addressInput: {
        minHeight: 120,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
    chip: { 
        backgroundColor: '#F3F4F6', 
        borderWidth: 1, 
        borderColor: 'rgba(0,0,0,0.05)', 
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        borderRadius: 14 
    },
    chipText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.navyMid },

    footer: { 
        paddingHorizontal: 24, 
        paddingTop: 20,
        paddingBottom: 40, 
        backgroundColor: C.surface, 
        borderTopWidth: 1, 
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    primaryBtn: { 
        borderRadius: 18, 
        overflow: 'hidden', 
        shadowColor: C.navy, 
        shadowOffset: { width: 0, height: 8 }, 
        shadowOpacity: 0.25, 
        shadowRadius: 16, 
        elevation: 8 
    },
    primaryBtnGradient: { flexDirection: 'row', paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 12 },
    primaryBtnText: { fontSize: 17, fontFamily: 'Nunito-ExtraBold', color: C.white, letterSpacing: 0.5 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    modalClose: { position: 'absolute', top: 60, right: 24, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    modalImg: { width: '100%', height: '85%' },
});
