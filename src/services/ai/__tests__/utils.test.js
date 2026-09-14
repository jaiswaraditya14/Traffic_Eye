import { AI_CONFIG } from '../../../config/ai.config';
import { supabase } from '../../supabase';
import { AiStageError, invokeAiStage, isRetryableAiError } from '../utils';

jest.mock('../../../config', () => ({
    AI_CONFIG: jest.requireActual('../../../config/ai.config').AI_CONFIG,
}));
jest.mock('../../supabase', () => ({
    supabase: { functions: { invoke: jest.fn() } },
}));

describe('AI client transport', () => {
    let directFetch;
    let logSpies;

    beforeEach(() => {
        jest.useFakeTimers();
        supabase.functions.invoke.mockReset();
        directFetch = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Direct network is forbidden in this test'));
        logSpies = ['log', 'warn', 'error'].map((method) => jest.spyOn(console, method).mockImplementation(() => {}));
    });

    afterEach(() => {
        expect(directFetch).not.toHaveBeenCalled();
        for (const spy of logSpies) expect(spy).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    test.each(['vision', 'ocr'])('%s delegates authentication to Supabase and never forwards caller identity or provider choices', async (stage) => {
        supabase.functions.invoke.mockResolvedValue({
            data: {
                ok: true,
                text: '{"plate":"TEST123"}',
                provider: 'test-provider',
                model: 'test-model',
                latencyMs: 7,
                correlationId: 'correlation-test',
                rawProviderResponse: 'must not escape transport',
            },
            error: null,
        });

        const result = await invokeAiStage({
            stage,
            imageBase64: 'synthetic-image',
            user_id: 'forged-user',
            officerId: 'forged-officer',
            provider: 'client-choice',
            apiKey: 'synthetic-only',
            endpoint: 'https://invalid.example',
        });

        expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
        expect(supabase.functions.invoke).toHaveBeenCalledWith(AI_CONFIG.analyzeFunctionName, {
            body: { stage, imageBase64: 'synthetic-image' },
            signal: expect.any(AbortSignal),
        });
        expect(result).toEqual({
            text: '{"plate":"TEST123"}',
            provider: 'test-provider',
            model: 'test-model',
            latencyMs: 7,
            correlationId: 'correlation-test',
        });
    });

    test('audit sends bounded-purpose text inputs and never image bytes', async () => {
        supabase.functions.invoke.mockResolvedValue({ data: { ok: true, text: '{}' }, error: null });

        await invokeAiStage({
            stage: 'audit',
            imageBase64: 'must-not-forward',
            evidenceSummary: 'Synthetic observation',
            candidates: ['TEST123'],
        });

        expect(supabase.functions.invoke.mock.calls[0][1].body).toEqual({
            stage: 'audit', evidenceSummary: 'Synthetic observation', candidates: ['TEST123'],
        });
    });

    test('unknown stages are rejected before calling the SDK', async () => {
        await expect(invokeAiStage({ stage: 'client-defined-provider' })).rejects.toMatchObject({
            name: 'AiStageError', code: 'BAD_REQUEST',
        });
        expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    test('NOT_CONFIGURED stays typed without exposing response details', async () => {
        supabase.functions.invoke.mockResolvedValue({
            data: null,
            error: {
                message: 'synthetic upstream credentials',
                context: { json: async () => ({
                    ok: false,
                    code: 'NOT_CONFIGURED',
                    correlationId: 'configuration-test',
                    detail: 'synthetic secret and provider body',
                    stack: 'synthetic upstream stack',
                }) },
            },
        });

        const failure = await invokeAiStage({ stage: 'vision', imageBase64: 'synthetic-image' }).catch((error) => error);
        expect(failure).toBeInstanceOf(AiStageError);
        expect(failure).toMatchObject({ code: 'NOT_CONFIGURED', correlationId: 'configuration-test', message: 'AI stage failed.' });
        expect(JSON.stringify(failure)).not.toContain('synthetic');
        expect(isRetryableAiError(failure)).toBe(false);
    });

    test('non-JSON HTTP failures expose only the conservative typed fallback', async () => {
        supabase.functions.invoke.mockResolvedValue({
            data: null,
            error: {
                message: 'synthetic upstream response',
                context: { json: async () => { throw new Error('synthetic HTML with credentials'); } },
            },
        });

        await expect(invokeAiStage({ stage: 'ocr', imageBase64: 'synthetic-image' })).rejects.toMatchObject({
            code: 'INTERNAL', correlationId: null, message: 'AI stage failed.',
        });
    });

    test('transport errors are sanitized and do not trigger a direct provider fallback', async () => {
        supabase.functions.invoke.mockRejectedValue(new Error('synthetic sensitive URL and bearer token'));
        await expect(invokeAiStage({ stage: 'vision', imageBase64: 'synthetic-image' })).rejects.toMatchObject({
            code: 'NETWORK', correlationId: null, message: 'AI service unreachable.',
        });
        expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    });

    test('the client deadline aborts the SDK request and clears its timer', async () => {
        supabase.functions.invoke.mockImplementation((_name, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('synthetic abort detail')), { once: true });
        }));
        const result = invokeAiStage({ stage: 'vision', imageBase64: 'synthetic-image' });
        const assertion = expect(result).rejects.toMatchObject({ code: 'NETWORK', message: 'AI service unreachable.' });
        await jest.advanceTimersByTimeAsync(AI_CONFIG.edgeFunctionTimeoutMs);
        await assertion;
        expect(supabase.functions.invoke.mock.calls[0][1].signal.aborted).toBe(true);
    });

    test.each([null, { ok: true, text: null }, { ok: false, providerBody: 'synthetic upstream response' }])(
        'malformed success data fails closed (%j)', async (data) => {
            supabase.functions.invoke.mockResolvedValue({ data, error: null });
            await expect(invokeAiStage({ stage: 'audit' })).rejects.toMatchObject({
                code: 'PROVIDER_BAD_OUTPUT', message: 'AI stage returned no result.',
            });
        },
    );

    test.each(['QUOTA_EXCEEDED', 'NOT_CONFIGURED', 'UNAUTHENTICATED', 'BAD_REQUEST', 'PROVIDER_BAD_OUTPUT'])(
        '%s is not retried', (code) => {
            expect(isRetryableAiError(new AiStageError(code))).toBe(false);
        },
    );

    test.each(['PROVIDER_UNAVAILABLE', 'PROVIDER_TIMEOUT', 'NETWORK'])('%s is retryable only as a typed transport error', (code) => {
        expect(isRetryableAiError(new AiStageError(code))).toBe(true);
        expect(isRetryableAiError({ code })).toBe(false);
    });
});


describe('HTTP classification and cancellation regressions', () => {
    beforeEach(() => supabase.functions.invoke.mockReset());
    test.each([
        [401, 'UNAUTHENTICATED', false], [403, 'FORBIDDEN', false], [429, 'QUOTA_EXCEEDED', false],
        [400, 'BAD_REQUEST', false], [422, 'INTERNAL', false], [500, 'INTERNAL', false],
        [502, 'PROVIDER_UNAVAILABLE', true], [503, 'PROVIDER_UNAVAILABLE', true], [504, 'PROVIDER_TIMEOUT', true],
    ])('HTTP %s remains %s even without JSON', async (status, code, retryable) => {
        supabase.functions.invoke.mockResolvedValue({ error: { context: {
            status, json: async () => { throw new Error('synthetic sensitive body'); },
        } } });
        let failure;
        try { await invokeAiStage({ stage: 'vision' }); } catch (err) { failure = err; }
        expect(failure.code).toBe(code);
        expect(isRetryableAiError(failure)).toBe(retryable);
        expect(failure.message).not.toContain('sensitive');
    });
    test('a misleading typed body cannot make HTTP 429 retryable', async () => {
        supabase.functions.invoke.mockResolvedValue({ error: { context: {
            status: 429, json: async () => ({ code: 'PROVIDER_UNAVAILABLE' }),
        } } });
        await expect(invokeAiStage({ stage: 'vision' })).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    });
    test.each([true, false])('untrusted error codes and correlation URLs are stripped (HTTP error=%s)', async (httpError) => {
        const body = { ok: false, code: 'synthetic bearer secret', correlationId: 'https://evidence.invalid/private' };
        supabase.functions.invoke.mockResolvedValue(httpError
            ? { error: { context: { status: 500, json: async () => body } } }
            : { data: body, error: null });
        await expect(invokeAiStage({ stage: 'vision' })).rejects.toMatchObject({
            code: httpError ? 'INTERNAL' : 'PROVIDER_BAD_OUTPUT', correlationId: null,
        });
    });
    test('cancels an in-flight SDK request and removes its external listener', async () => {
        const controller = new AbortController();
        const remove = jest.spyOn(controller.signal, 'removeEventListener');
        supabase.functions.invoke.mockImplementation((_name, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('sensitive transport')), { once: true });
        }));
        const run = invokeAiStage({ stage: 'vision' }, { signal: controller.signal });
        const assertion = expect(run).rejects.toMatchObject({ code: 'CANCELLED' });
        controller.abort();
        await assertion;
        expect(supabase.functions.invoke.mock.calls[0][1].signal.aborted).toBe(true);
        expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
        remove.mockRestore();
    });
    test('pre-abort performs no request', async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(invokeAiStage({ stage: 'vision' }, { signal: controller.signal })).rejects.toMatchObject({ code: 'CANCELLED' });
        expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });
});
