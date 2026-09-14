import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, AppState, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import PressableScale from '../common/PressableScale';
import { COLORS, TYPOGRAPHY, SPACING } from '../../utils/theme';

export const RECORDING_LIMIT_SECONDS = 15;
export function videoMetadata(uri) {
    const extension = uri.split(/[?#]/)[0].split('.').pop().toLowerCase();
    return { uri, mimeType: extension === 'mov' ? 'video/quicktime' : extension === 'webm' ? 'video/webm' : 'video/mp4', fileName: uri.split('/').pop() };
}
export default function VideoRecorder({ onCaptured, onCancel }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [ready, setReady] = useState(false);
    const [recording, setRecording] = useState(false);
    const [remaining, setRemaining] = useState(RECORDING_LIMIT_SECONDS);
    const [error, setError] = useState(null);
    const recordingCamera = useRef(null);
    const camera = useRef(null), timer = useRef(null), active = useRef(true), busy = useRef(false), cancelled = useRef(false), stopping = useRef(false);
    const stop = () => {
        if (!busy.current || stopping.current) return;
        stopping.current = true;
        clearInterval(timer.current);
        try { recordingCamera.current?.stopRecording(); } catch { /* Native camera may already be stopped. */ }
    };
    useEffect(() => {
        active.current = true;
        const subscription = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
        return () => { active.current = false; cancelled.current = true; clearInterval(timer.current); stop(); subscription.remove(); };
    }, []);
    const cancel = () => { cancelled.current = true; stop(); onCancel(); };
    const record = async () => {
        if (!ready || busy.current || !permission?.granted) return;
        recordingCamera.current = camera.current;
        busy.current = true; stopping.current = false; cancelled.current = false;
        setRecording(true); setRemaining(RECORDING_LIMIT_SECONDS); setError(null);
        const deadline = Date.now() + RECORDING_LIMIT_SECONDS * 1000;
        timer.current = setInterval(() => {
            const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            if (active.current) setRemaining(seconds);
            if (!seconds) stop();
        }, 200);
        try {
            // Native limit remains authoritative if JS timers are delayed or suspended.
            const result = await camera.current.recordAsync({ maxDuration: RECORDING_LIMIT_SECONDS, maxFileSize: 50 * 1024 * 1024 });
            if (active.current && !cancelled.current && result?.uri) onCaptured(videoMetadata(result.uri));
        } catch { if (active.current && !cancelled.current) setError('Recording failed. Please try again.'); }
        finally { clearInterval(timer.current); busy.current = false; recordingCamera.current = null; if (active.current) setRecording(false); }
    };
    const askPermission = async () => { try { await requestPermission(); } catch { if (active.current) setError('Camera permission unavailable. Open device settings.'); } };
    return <Modal visible onRequestClose={cancel} animationType="none">
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Record evidence</Text>
            {permission?.granted ? <CameraView ref={camera} style={styles.camera} mode="video" mute facing="back" videoQuality="480p" onCameraReady={() => setReady(true)} onMountError={() => { setReady(false); setError('Camera unavailable on this device.'); }} /> : <View style={styles.permission}>
                <Text style={styles.text}>Camera permission is needed to record evidence. You can also choose an existing video.</Text>
                <PressableScale accessibilityLabel="Allow camera" onPress={askPermission} style={styles.button}><Text style={styles.text}>Allow camera</Text></PressableScale>
                <PressableScale accessibilityLabel="Open camera settings" onPress={() => Linking.openSettings().catch(() => setError('Open Traffic Eye permissions in device settings.'))} style={styles.button}><Text style={styles.text}>Open Settings</Text></PressableScale>
            </View>}
            <Text accessibilityLiveRegion="polite" style={styles.text}>{remaining} seconds remaining · Silent recording</Text>
            {!!error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
            <View style={styles.actions}>
                <PressableScale accessibilityLabel={recording ? 'Stop recording' : 'Start recording'} disabled={!ready || !permission?.granted} onPress={recording ? stop : record} style={styles.button}><Text style={styles.text}>{recording ? 'Stop' : 'Record'}</Text></PressableScale>
                <PressableScale accessibilityLabel="Cancel recording" onPress={cancel} style={styles.button}><Text style={styles.text}>Cancel</Text></PressableScale>
            </View>
        </SafeAreaView>
    </Modal>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.primaryDark, padding: SPACING.lg, gap: SPACING.md }, title: { ...TYPOGRAPHY.h2, color: COLORS.white }, text: { ...TYPOGRAPHY.body, color: COLORS.white }, camera: { flex: 1, minHeight: 180 }, permission: { flex: 1, justifyContent: 'center', gap: SPACING.md }, actions: { flexDirection: 'row', gap: SPACING.md }, button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: SPACING.md, minHeight: 48 } });
