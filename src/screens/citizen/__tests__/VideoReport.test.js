/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import VideoRecorder, { videoMetadata } from '../../../components/media/VideoRecorder';
const mockRecord = jest.fn(), mockStop = jest.fn();
jest.mock('expo-camera', () => {
    const React = require('react');
    return { useCameraPermissions: () => [{ granted: true }, jest.fn()], CameraView: React.forwardRef(function MockCamera(props, ref) {
        React.useImperativeHandle(ref, () => ({ recordAsync: mockRecord, stopRecording: mockStop })); return React.createElement('CameraView', props);
    }) };
});
jest.mock('../../../components/common/PressableScale', () => require('react-native').Pressable);
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
let view, captured, cancelled, resolve;
beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true; jest.useFakeTimers(); mockRecord.mockReset(); mockStop.mockReset(); captured = jest.fn(); cancelled = jest.fn();
    mockRecord.mockImplementation(() => new Promise(done => { resolve = done; })); jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => { if (view) await act(async () => view.unmount()); view = null; jest.restoreAllMocks(); jest.useRealTimers(); });
async function mount() { await act(async () => { view = renderer.create(<VideoRecorder onCaptured={captured} onCancel={cancelled} />); }); await act(async () => view.root.findByType('CameraView').props.onCameraReady()); }
async function start() { await act(async () => { view.root.findByProps({ accessibilityLabel: 'Start recording' }).props.onPress(); }); }
test('native hard limit is 15 seconds and countdown auto-stops once', async () => {
    await mount(); await start(); expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ maxDuration: 15 }));
    await act(async () => jest.advanceTimersByTime(5000)); expect(JSON.stringify(view.toJSON())).toContain('10');
    await act(async () => jest.advanceTimersByTime(10000)); expect(mockStop).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ uri: 'file:///recorded.mp4' })); expect(captured).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'video/mp4' }));
});
test('manual stop returns evidence; retake starts at 15', async () => {
    await mount(); await start(); await act(async () => view.root.findByProps({ accessibilityLabel: 'Stop recording' }).props.onPress());
    await act(async () => resolve({ uri: 'file:///recorded.mp4' })); expect(captured).toHaveBeenCalledTimes(1);
    await act(async () => view.unmount()); view = null; await mount(); expect(JSON.stringify(view.toJSON())).toContain('15');
});
test('cancel discards late camera result', async () => {
    await mount(); await start(); await act(async () => view.root.findByProps({ accessibilityLabel: 'Cancel recording' }).props.onPress());
    await act(async () => resolve({ uri: 'file:///discarded.mp4' })); expect(cancelled).toHaveBeenCalledTimes(1); expect(captured).not.toHaveBeenCalled();
});
test('unmount stops recorder and timer without late callbacks', async () => {
    await mount(); await start(); await act(async () => view.unmount()); view = null;
    expect(mockStop).toHaveBeenCalledTimes(1); await act(async () => { jest.advanceTimersByTime(20000); resolve({ uri: 'file:///late.mp4' }); }); expect(captured).not.toHaveBeenCalled();
});
test('MOV is not mislabeled MP4', () => expect(videoMetadata('file:///camera.mov').mimeType).toBe('video/quicktime'));
test.each([
    ['file:///camera.mp4', 'video/mp4'],
    ['file:///camera.MOV?asset=1', 'video/quicktime'],
    ['file:///camera.webm', 'video/webm'],
])('video metadata maps %s to %s', (uri, mimeType) => expect(videoMetadata(uri).mimeType).toBe(mimeType));
