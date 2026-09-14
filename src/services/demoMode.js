import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEMO_MODE_KEY = 'traffic_eye_demo_mode';
export const DEMO_LOCATION = Object.freeze({ latitude: 19.0760, longitude: 72.8777 });
// Deliberately synthetic label/coordinates for the requested demonstration, not verified GPS.
export const DEMO_ADDRESS = 'Gateway of India, Mumbai 400001';
export async function readDemoMode() { return (await AsyncStorage.getItem(DEMO_MODE_KEY)) === 'true'; }
export async function persistDemoMode(enabled) {
    if (enabled) await AsyncStorage.setItem(DEMO_MODE_KEY, 'true');
    else await AsyncStorage.removeItem(DEMO_MODE_KEY);
}
export function buildDemoReport() {
    return { demo: true, image: require('../../assets/images/test1.jpeg'), mediaType: 'image',
        location: { ...DEMO_LOCATION }, address: DEMO_ADDRESS, locationSource: 'DEMO_SYNTHETIC' };
}
export function buildDemoAiResult() {
    return { demo: true, violationDetected: true, violationType: 'Signal Jump',
        allViolations: ['Signal Jump', 'No Helmet'], vehicleNumber: 'MH01AB1234',
        confidence: 0.92, confidenceUnit: 'fraction', severity: 'high',
        description: 'Demo: Signal jump detected at Gateway of India',
        plateOCR: { plate: 'MH01AB1234', confidence: 0.95, confidenceUnit: 'fraction' } };
}
export const isDemoEvidence = (report, analysis) => report?.demo === true || analysis?.demo === true;
