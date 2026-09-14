/* eslint-env jest */
import { aiService } from '../index';
import { AiStageError } from '../utils';
import { invokeAiStageWithRetry } from '../retry';
import { checkLocalIntegrity, prepareVisionImage, prepareOcrImage } from '../preprocessing';
import { applyRules } from '../ruleEngine';
import { buildManualReviewResult } from '../manualReview';

jest.mock('../retry', () => ({ invokeAiStageWithRetry: jest.fn() }));
jest.mock('../preprocessing', () => ({ checkLocalIntegrity: jest.fn(), prepareVisionImage: jest.fn(), prepareOcrImage: jest.fn() }));
jest.mock('../ruleEngine', () => ({ applyRules: jest.fn(), VIOLATION_SEVERITY: { NO_HELMET: 5 } }));
jest.mock('../authenticity', () => ({ checkImageAuthenticity: jest.fn() }));
jest.mock('../../../config', () => ({ AI_CONFIG: { stages: ['vision', 'ocr', 'audit'] } }));
jest.mock('../../supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));

beforeEach(() => {
    jest.resetAllMocks();
    for (const method of ['log', 'warn', 'error']) jest.spyOn(console, method).mockImplementation(() => {});
    checkLocalIntegrity.mockResolvedValue({ status: 'VALID' });
    prepareVisionImage.mockResolvedValue('synthetic-vision');
    prepareOcrImage.mockResolvedValue('synthetic-ocr');
    applyRules.mockReturnValue({ confirmedViolations: ['NO_HELMET'], uncertainViolations: [], requiresManualReview: false,
        plateInfo: { text: 'PLATE_NOT_READABLE', needsOcr: true, readable: false } });
    invokeAiStageWithRetry.mockImplementation(async ({ stage }) => ({ provider: 'tokenharbor',
        text: JSON.stringify(stage === 'vision' ? { image_quality: { usable: true }, vehicle: { type: 'motorcycle' } }
            : stage === 'ocr' ? { plate_text: 'PLATE_NOT_READABLE', confidence_percent: 0 }
                : { accepted_violations: ['NO_HELMET'], rejected_violations: [] }),
    }));
});
afterEach(() => jest.restoreAllMocks());

test('all stages use the retry wrapper and same cancellation signal', async () => {
    const controller = new AbortController();
    const uri = 'content://synthetic/image?access=retained';
    await aiService.analyzeViolationImage(uri, { signal: controller.signal });
    expect(checkLocalIntegrity).toHaveBeenCalledWith(uri);
    expect(invokeAiStageWithRetry.mock.calls.map(([args]) => args.stage)).toEqual(['vision', 'ocr', 'audit']);
    for (const [, options] of invokeAiStageWithRetry.mock.calls) expect(options.signal).toBe(controller.signal);
    expect(invokeAiStageWithRetry.mock.calls[2][0]).not.toHaveProperty('imageBase64');
});

test.each(['vision', 'ocr', 'audit'])('cancellation during %s stops the pipeline', async target => {
    const implementation = invokeAiStageWithRetry.getMockImplementation();
    invokeAiStageWithRetry.mockImplementation(async args => {
        if (args.stage === target) throw new AiStageError('CANCELLED');
        return implementation(args);
    });
    await expect(aiService.analyzeViolationImage('file:///synthetic.jpg')).rejects.toMatchObject({ code: 'CANCELLED' });
    const stages = invokeAiStageWithRetry.mock.calls.map(([args]) => args.stage);
    expect(stages[stages.length - 1]).toBe(target);
});

test('cancellation during preprocessing prevents paid analysis calls', async () => {
    const controller = new AbortController();
    checkLocalIntegrity.mockImplementation(async () => { controller.abort(); return { status: 'VALID' }; });
    await expect(aiService.analyzeViolationImage('file:///synthetic.jpg', { signal: controller.signal }))
        .rejects.toMatchObject({ code: 'CANCELLED' });
    expect(invokeAiStageWithRetry).not.toHaveBeenCalled();
});

test('unavailable vision produces a manual-review result without invented evidence', async () => {
    invokeAiStageWithRetry.mockRejectedValue(new AiStageError('PROVIDER_UNAVAILABLE'));
    const result = await aiService.analyzeViolationImage('file:///synthetic.jpg');
    expect(result).toMatchObject({ violationDetected: false, requiresManualReview: true, confidence: 0 });
    expect(result.description).toMatch(/^ANALYSIS_FAILED/);
    expect(buildManualReviewResult()).toMatchObject({ aiUnavailable: true, requiresManualReview: true, allViolations: [], confidence: 0, vehicleNumber: '' });
});
