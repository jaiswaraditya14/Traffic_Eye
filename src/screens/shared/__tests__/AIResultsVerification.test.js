/* eslint-env jest */
import React from 'react';
import { Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AIResultsVerification from '../AIResultsVerification';
import { reportService } from '../../../services';
import { checkImageDuplicate } from '../../../services/reports';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../context', () => ({
    useAppContext: () => ({
        currentReport: {
            image: 'file:///test-image.jpg',
            imageHash: 'mock-hash-1234567890123456',
            location: { latitude: 19.076, longitude: 72.8777 },
            address: 'Mumbai, India',
        },
        setCurrentReport: jest.fn(),
    }),
    useAuth: () => ({ user: { id: 'test-user-id' } }),
}));
jest.mock('../../../services', () => ({
    reportService: {
        submitReportWithMedia: jest.fn(),
        createReportSubmission: jest.fn(() => ({ id: 'sub-123' })),
    },
}));
jest.mock('../../../services/reports', () => ({
    checkImageDuplicate: jest.fn(),
    checkPlateDuplicate: jest.fn().mockResolvedValue({ isDuplicate: false }),
}));
jest.mock('../../../services/reports/locationResolver', () => ({
    resolveReportLocation: jest.fn().mockResolvedValue({
        latitude: 19.076,
        longitude: 72.8777,
        address: 'Mumbai, India',
        locationSource: 'MANUAL',
    }),
}));
jest.mock('../../../utils/fileHash', () => ({
    computeFileSha256: jest.fn().mockResolvedValue({ sha256: 'mock-hash-1234567890123456' }),
}));
jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../../components', () => ({
    FocusAwareStatusBar: () => null,
    ProgressRing: () => null,
    PressableScale: require('react-native').Pressable,
    FeedbackToast: () => null,
    AIStatusBadge: () => null,
}));

describe('AIResultsVerification duplicate image detection', () => {
    let navigation;

    beforeEach(() => {
        jest.clearAllMocks();
        navigation = { replace: jest.fn(), goBack: jest.fn() };
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        checkImageDuplicate.mockResolvedValue({ isDuplicate: false, indeterminate: false });
        reportService.submitReportWithMedia.mockResolvedValue({ data: { id: 'rep-1', reward_amount: 10 }, error: null });
    });

    test('shows "Incident already reported" and disables submit button when image hash is a duplicate', async () => {
        checkImageDuplicate.mockResolvedValue({ isDuplicate: true, indeterminate: false, existingReportId: 'rep-existing' });

        let view;
        await act(async () => {
            view = renderer.create(
                <AIResultsVerification
                    navigation={navigation}
                    route={{
                        params: {
                            aiResults: {
                                violationDetected: true,
                                vehicleNumber: 'MH12AB1234',
                                violationType: 'NO_HELMET',
                                allViolations: ['NO_HELMET'],
                                severity: 'Medium',
                                confidence: 95,
                            },
                            isImageDuplicate: true,
                        },
                    }}
                />
            );
        });

        // Banner should display "Incident already reported"
        const allTexts = view.root.findAllByType('Text').map(t => t.props.children).flat().filter(Boolean);
        expect(allTexts.some(text => typeof text === 'string' && text.toLowerCase().includes('incident already reported'))).toBe(true);

        // Submit button should be disabled
        const submitButton = view.root.findByProps({ accessibilityLabel: 'Incident already reported' });
        expect(submitButton.props.disabled).toBe(true);

        // Pressing should not submit
        await act(async () => {
            submitButton.props.onPress();
        });
        expect(reportService.submitReportWithMedia).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
            'Incident already reported',
            expect.stringContaining('already been submitted'),
            expect.any(Array)
        );
    });

    test('enables Confirm & Submit button when image is unique', async () => {
        checkImageDuplicate.mockResolvedValue({ isDuplicate: false, indeterminate: false });

        let view;
        await act(async () => {
            view = renderer.create(
                <AIResultsVerification
                    navigation={navigation}
                    route={{
                        params: {
                            aiResults: {
                                violationDetected: true,
                                vehicleNumber: 'MH12AB1234',
                                violationType: 'NO_HELMET',
                                allViolations: ['NO_HELMET'],
                                severity: 'Medium',
                                confidence: 95,
                            },
                            isImageDuplicate: false,
                        },
                    }}
                />
            );
        });

        const submitButton = view.root.findByProps({ accessibilityLabel: 'Confirm & Submit' });
        expect(submitButton.props.disabled).toBe(false);

        await act(async () => {
            await submitButton.props.onPress();
        });

        expect(reportService.submitReportWithMedia).toHaveBeenCalledTimes(1);
        expect(navigation.replace).toHaveBeenCalledWith('ReportSuccess', expect.any(Object));
    });

    test('restores Confirm & Submit button when duplicate image is replaced with a unique image', async () => {
        checkImageDuplicate
            .mockResolvedValueOnce({ isDuplicate: true, indeterminate: false })
            .mockResolvedValueOnce({ isDuplicate: false, indeterminate: false });

        let view;
        await act(async () => {
            view = renderer.create(
                <AIResultsVerification
                    navigation={navigation}
                    route={{
                        params: {
                            aiResults: {
                                violationDetected: true,
                                vehicleNumber: 'MH12AB1234',
                                violationType: 'NO_HELMET',
                                allViolations: ['NO_HELMET'],
                                severity: 'Medium',
                                confidence: 95,
                            },
                            isImageDuplicate: true,
                        },
                    }}
                />
            );
        });

        // Initially disabled
        let submitBtn = view.root.findByProps({ accessibilityLabel: 'Incident already reported' });
        expect(submitBtn.props.disabled).toBe(true);

        // User taps "Choose Another Photo"
        const changePhotoBtn = view.root.findByProps({ accessibilityLabel: 'Choose another photo' });
        expect(changePhotoBtn).toBeTruthy();

        const ImagePicker = require('expo-image-picker');
        ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
            canceled: false,
            assets: [{ uri: 'file:///new-unique-photo.jpg' }],
        });

        await act(async () => {
            await changePhotoBtn.props.onPress();
        });

        // Submit button should now be restored to enabled state
        submitBtn = view.root.findByProps({ accessibilityLabel: 'Confirm & Submit' });
        expect(submitBtn.props.disabled).toBe(false);
    });
});
