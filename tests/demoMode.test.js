/* eslint-env jest */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE_KEY, persistDemoMode, readDemoMode, buildDemoReport, buildDemoAiResult, isDemoEvidence } from '../src/services/demoMode';
import { confidencePercent } from '../src/utils/productExperience';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
beforeEach(async () => AsyncStorage.clear());
test('enable persists and disable removes exact key', async () => {
    expect(await readDemoMode()).toBe(false); await persistDemoMode(true); expect(await readDemoMode()).toBe(true);
    expect(await AsyncStorage.getItem(DEMO_MODE_KEY)).toBe('true'); await persistDemoMode(false); expect(await readDemoMode()).toBe(false); expect(await AsyncStorage.getItem(DEMO_MODE_KEY)).toBeNull();
});
test('storage failures propagated', async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full')); await expect(persistDemoMode(true)).rejects.toThrow('Storage full');
});
test('cached evidence/results explicit synthetic and fractional confidence', () => {
    expect(buildDemoReport()).toMatchObject({ demo: true, location: { latitude: 19.076, longitude: 72.8777 }, locationSource: 'DEMO_SYNTHETIC' });
    const result = buildDemoAiResult(); expect(result).toMatchObject({ violationDetected: true, vehicleNumber: 'MH01AB1234', confidence: 0.92, confidenceUnit: 'fraction', allViolations: ['Signal Jump', 'No Helmet'] }); expect(confidencePercent(result.confidence, result.confidenceUnit)).toBe(92);
});
test('either marker blocks saving', () => {
    expect(isDemoEvidence({ demo: true }, {})).toBe(true); expect(isDemoEvidence({}, { demo: true })).toBe(true); expect(isDemoEvidence({}, {})).toBe(false);
});
test('repeated toggles do not leave a stale enabled flag', async () => {
    await persistDemoMode(true); await persistDemoMode(false); await persistDemoMode(true); await persistDemoMode(false);
    expect(await readDemoMode()).toBe(false);
    expect(await AsyncStorage.getItem(DEMO_MODE_KEY)).toBeNull();
});
