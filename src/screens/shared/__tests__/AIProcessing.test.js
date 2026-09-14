/* eslint-env jest */
import React from 'react';
import { Animated, Alert, Pressable } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { aiStageIndex } from '../../../utils/productExperience';
import AIProcessing, { AI_STAGES } from '../AIProcessing';
import { aiService } from '../../../services';
import { checkPlateDuplicate, checkUserRateLimit } from '../../../services/reports';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../hooks/useReducedMotion', () => () => false);
jest.mock('../../../context', () => ({ useAppContext: () => ({ currentReport: { image: 'file:///synthetic.jpg?access=yes' } }), useAuth: () => ({ user: { id: 'synthetic-user' } }) }));
jest.mock('../../../services', () => ({ aiService: { analyzeViolationImage: jest.fn() } }));
jest.mock('../../../services/reports', () => ({ checkPlateDuplicate: jest.fn(), checkUserRateLimit: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../../components', () => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return {
        FocusAwareStatusBar: () => null,
        StepIndicator: require('../../../components/common/StepIndicator').default,
        PressableScale: Pressable,
        ConfirmationModal: props => props.visible
            ? React.createElement(Pressable, { accessibilityLabel: 'Confirm manual', onPress: props.onConfirm }, React.createElement(Text, null, props.message)) : null,
    };
});

let view, navigation, loops;
beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    global.IS_REACT_ACT_ENVIRONMENT = true;
    navigation = { replace: jest.fn(), goBack: jest.fn() };
    loops = [];
    jest.spyOn(Animated, 'loop').mockImplementation(() => {
        const loop = { start: jest.fn(), stop: jest.fn() }; loops.push(loop); return loop;
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    checkUserRateLimit.mockResolvedValue({ allowed: true, indeterminate: false });
    checkPlateDuplicate.mockResolvedValue({ isDuplicate: false, indeterminate: false });
    aiService.analyzeViolationImage.mockResolvedValue({ violationDetected: true, vehicleNumber: 'MH12AB1234' });
});
afterEach(async () => {
    if (view) await act(async () => view.unmount());
    view = null;
    for (const loop of loops) expect(loop.stop).toHaveBeenCalled();
    jest.restoreAllMocks();
    jest.useRealTimers();
});
async function mount() {
    await act(async () => { view = renderer.create(<AIProcessing navigation={navigation} />); });
    await act(async () => { await jest.advanceTimersByTimeAsync(300); });
}
async function press(label) {
    await act(async () => view.root.findByProps({ accessibilityLabel: label }).props.onPress());
}

test('mounts, starts animation loops and passes the exact URI to analysis', async () => {
    await mount();
    expect(loops).toHaveLength(2);
    for (const loop of loops) expect(loop.start).toHaveBeenCalledTimes(1);
    expect(aiService.analyzeViolationImage).toHaveBeenCalledWith('file:///synthetic.jpg?access=yes', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(navigation.replace).toHaveBeenCalledWith('AIResultsVerification', expect.any(Object));
});
test('failed activity validation blocks all AI and navigation', async () => {
    checkUserRateLimit.mockResolvedValue({ allowed: false, indeterminate: true });
    await mount();
    expect(aiService.analyzeViolationImage).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
});
test('indeterminate duplicate lookup does not advance', async () => {
    checkPlateDuplicate.mockResolvedValue({ isDuplicate: false, indeterminate: true });
    await mount();
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Could not verify plate', expect.any(String), expect.any(Array));
});
test('AI unavailable can be explicitly confirmed for manual review', async () => {
    aiService.analyzeViolationImage.mockResolvedValue({ description: 'ANALYSIS_FAILED: unavailable' });
    await mount();
    expect(navigation.replace).not.toHaveBeenCalled();
    await press('Submit for manual review');
    await press('Confirm manual');
    expect(navigation.replace).toHaveBeenCalledWith('AIResultsVerification', expect.objectContaining({
        aiResults: expect.objectContaining({ aiUnavailable: true, requiresManualReview: true, confidence: 0 }),
    }));
});
test('retry after failure completes a new analysis once', async () => {
    aiService.analyzeViolationImage.mockResolvedValueOnce({ description: 'ANALYSIS_FAILED: unavailable' });
    await mount();
    await press('Try again');
    expect(aiService.analyzeViolationImage).toHaveBeenCalledTimes(2);
    expect(navigation.replace).toHaveBeenCalledTimes(1);
});
test('unmount aborts an active analysis and suppresses stale navigation', async () => {
    let resolve;
    aiService.analyzeViolationImage.mockImplementation(() => new Promise(r => { resolve = r; }));
    await mount();
    const signal = aiService.analyzeViolationImage.mock.calls[0][1].signal;
    await act(async () => view.unmount());
    view = null;
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ violationDetected: true, vehicleNumber: 'MH12AB1234' }));
    expect(navigation.replace).not.toHaveBeenCalled();
});
test('five visual stages map actual pipeline events in order', () => {
    expect(AI_STAGES.map(stage => stage.label)).toEqual(['Scanning image', 'Detecting vehicles', 'Reading plate', 'Cross-checking evidence', 'Report ready']);
    expect(['Preparing image', 'vision', 'ocr', 'audit', 'Report ready'].map(aiStageIndex)).toEqual([0, 1, 2, 3, 4]);
});
