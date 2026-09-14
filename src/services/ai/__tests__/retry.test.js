/**
 * retry.test.js — bounded, cancellable transient-failure retry around invokeAiStage
 *
 * These tests exercise the wrapper in isolation. `invokeAiStage` is the only
 * part of ./utils that is mocked; AiStageError and isRetryableAiError are the
 * REAL implementations (via jest.requireActual) so the retryable-vs-terminal
 * classification under test is the exact one shipped in utils.js — not a
 * test-local re-statement of it.
 *
 * Fake timers make the ~1s/3s back-off instant and let us assert its ordering.
 * The afterEach guards prove the wrapper never touches the network or console
 * and never leaves a timer or abort listener dangling.
 */

import { AiStageError, invokeAiStage } from '../utils';
import { invokeAiStageWithRetry, RETRY_DELAYS_MS } from '../retry';

// Real AiStageError / isRetryableAiError / RETRYABLE_CODES; mocked transport.
jest.mock('../utils', () => {
    const actual = jest.requireActual('../utils');
    return { __esModule: true, ...actual, invokeAiStage: jest.fn() };
});
// Keep requireActual('../utils') side-effect free (mirror utils.test.js).
jest.mock('../../../config', () => ({
    AI_CONFIG: jest.requireActual('../../../config/ai.config').AI_CONFIG,
}));
jest.mock('../../supabase', () => ({
    supabase: { functions: { invoke: jest.fn() } },
}));

const OK = { text: '{"plate":"TEST123"}', provider: 'p', model: 'm', latencyMs: 3, correlationId: 'c' };

describe('invokeAiStageWithRetry', () => {
    let directFetch;
    let logSpies;

    beforeEach(() => {
        jest.useFakeTimers();
        invokeAiStage.mockReset();
        directFetch = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Direct network is forbidden in this test'));
        logSpies = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
    });

    afterEach(() => {
        expect(directFetch).not.toHaveBeenCalled();
        for (const spy of logSpies) expect(spy).not.toHaveBeenCalled();
        // No dangling back-off timer or abort listener survives a settled call.
        expect(jest.getTimerCount()).toBe(0);
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    test('default back-off is two retries at ~1s then ~3s', () => {
        expect(RETRY_DELAYS_MS).toEqual([1000, 3000]);
    });

    test('returns the stage result on the first successful attempt (no retry, no timer)', async () => {
        invokeAiStage.mockResolvedValue(OK);
        const onRetry = jest.fn();

        await expect(invokeAiStageWithRetry({ stage: 'vision', imageBase64: 'x' }, { onRetry })).resolves.toEqual(OK);

        expect(invokeAiStage).toHaveBeenCalledTimes(1);
        // Args are forwarded verbatim — the wrapper adds nothing to the transport call.
        expect(invokeAiStage).toHaveBeenCalledWith({ stage: 'vision', imageBase64: 'x' }, { signal: undefined });
        expect(onRetry).not.toHaveBeenCalled();
    });

    test('retries a transient failure once and then succeeds', async () => {
        invokeAiStage
            .mockRejectedValueOnce(new AiStageError('PROVIDER_UNAVAILABLE', 'corr-1', 'down'))
            .mockResolvedValueOnce(OK);
        const onRetry = jest.fn();

        const p = invokeAiStageWithRetry({ stage: 'vision' }, { onRetry });
        await jest.advanceTimersByTimeAsync(1000); // let the 1s back-off elapse

        await expect(p).resolves.toEqual(OK);
        expect(invokeAiStage).toHaveBeenCalledTimes(2);
        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onRetry).toHaveBeenCalledWith({ attempt: 1, delay: 1000, code: 'PROVIDER_UNAVAILABLE' });
    });

    test('backs off in order: ~1s before the 2nd attempt, ~3s before the 3rd', async () => {
        invokeAiStage
            .mockRejectedValueOnce(new AiStageError('PROVIDER_UNAVAILABLE', null, 'down'))
            .mockRejectedValueOnce(new AiStageError('PROVIDER_TIMEOUT', null, 'slow'))
            .mockResolvedValueOnce(OK);
        const onRetry = jest.fn();

        const p = invokeAiStageWithRetry({ stage: 'vision' }, { onRetry });

        // Before 1s elapses the second attempt must NOT have fired.
        await jest.advanceTimersByTimeAsync(999);
        expect(invokeAiStage).toHaveBeenCalledTimes(1);

        // Crossing 1s triggers attempt #2, which fails and enters the 3s back-off.
        await jest.advanceTimersByTimeAsync(1);
        expect(invokeAiStage).toHaveBeenCalledTimes(2);

        // Before 3s more elapses the third attempt must NOT have fired.
        await jest.advanceTimersByTimeAsync(2999);
        expect(invokeAiStage).toHaveBeenCalledTimes(2);

        // Crossing 3s triggers attempt #3, which succeeds.
        await jest.advanceTimersByTimeAsync(1);
        await expect(p).resolves.toEqual(OK);
        expect(invokeAiStage).toHaveBeenCalledTimes(3);

        expect(onRetry.mock.calls.map((c) => c[0])).toEqual([
            { attempt: 1, delay: 1000, code: 'PROVIDER_UNAVAILABLE' },
            { attempt: 2, delay: 3000, code: 'PROVIDER_TIMEOUT' },
        ]);
    });

    test('exhausts exactly two retries then throws the last transient error', async () => {
        invokeAiStage.mockRejectedValue(new AiStageError('NETWORK', 'corr-x', 'unreachable'));
        const onRetry = jest.fn();

        const p = invokeAiStageWithRetry({ stage: 'ocr', imageBase64: 'x' }, { onRetry });
        const assertion = expect(p).rejects.toMatchObject({
            name: 'AiStageError', code: 'NETWORK', correlationId: 'corr-x',
        });
        await jest.advanceTimersByTimeAsync(1000); // 2nd attempt
        await jest.advanceTimersByTimeAsync(3000); // 3rd (final) attempt, no budget left
        await assertion;

        expect(invokeAiStage).toHaveBeenCalledTimes(3); // initial + 2 retries
        expect(onRetry).toHaveBeenCalledTimes(2);
    });

    test.each([
        'QUOTA_EXCEEDED',
        'NOT_CONFIGURED',
        'UNAUTHENTICATED',
        'FORBIDDEN',
        'BAD_REQUEST',
        'INTERNAL',
        'PROVIDER_BAD_OUTPUT',
    ])(
        'does not retry the deterministic error %s — it is thrown on the first attempt', async (code) => {
            invokeAiStage.mockRejectedValue(new AiStageError(code, null, 'no point retrying'));
            const onRetry = jest.fn();

            await expect(invokeAiStageWithRetry({ stage: 'vision' }, { onRetry }))
                .rejects.toMatchObject({ name: 'AiStageError', code });

            expect(invokeAiStage).toHaveBeenCalledTimes(1);
            expect(onRetry).not.toHaveBeenCalled();
        },
    );

    test('does not retry a non-typed Error (only typed transport codes are retryable)', async () => {
        invokeAiStage.mockRejectedValue(new Error('boom'));

        await expect(invokeAiStageWithRetry({ stage: 'vision' })).rejects.toThrow('boom');
        expect(invokeAiStage).toHaveBeenCalledTimes(1);
    });

    test('a pre-aborted signal throws CANCELLED without ever invoking the stage', async () => {
        const controller = new AbortController();
        controller.abort();
        invokeAiStage.mockResolvedValue(OK);

        await expect(invokeAiStageWithRetry({ stage: 'vision' }, { signal: controller.signal }))
            .rejects.toMatchObject({ name: 'AiStageError', code: 'CANCELLED' });

        expect(invokeAiStage).not.toHaveBeenCalled();
    });

    test('aborting during the back-off delay interrupts it, throws CANCELLED, and stops retrying', async () => {
        const controller = new AbortController();
        invokeAiStage.mockRejectedValue(new AiStageError('NETWORK', null, 'unreachable'));

        const p = invokeAiStageWithRetry({ stage: 'vision' }, { signal: controller.signal });
        const assertion = expect(p).rejects.toMatchObject({ name: 'AiStageError', code: 'CANCELLED' });

        // First attempt has failed and we are now inside the 1s back-off.
        await jest.advanceTimersByTimeAsync(500);
        expect(invokeAiStage).toHaveBeenCalledTimes(1);

        controller.abort(); // interrupt the pending delay
        await assertion;

        expect(invokeAiStage).toHaveBeenCalledTimes(1); // never retried after abort
    });

    test('an abort raised from the onRetry callback cancels before the next attempt', async () => {
        const controller = new AbortController();
        invokeAiStage.mockRejectedValue(new AiStageError('PROVIDER_TIMEOUT', null, 'slow'));
        const onRetry = jest.fn(() => controller.abort());

        await expect(invokeAiStageWithRetry({ stage: 'vision' }, { signal: controller.signal, onRetry }))
            .rejects.toMatchObject({ name: 'AiStageError', code: 'CANCELLED' });

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(invokeAiStage).toHaveBeenCalledTimes(1);
    });

    test('honors a custom delays array (retry budget follows its length)', async () => {
        invokeAiStage.mockRejectedValue(new AiStageError('PROVIDER_UNAVAILABLE', null, 'down'));
        const onRetry = jest.fn();

        const p = invokeAiStageWithRetry({ stage: 'vision' }, { delays: [50], onRetry });
        const assertion = expect(p).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
        await jest.advanceTimersByTimeAsync(50);
        await assertion;

        expect(invokeAiStage).toHaveBeenCalledTimes(2); // initial + 1 retry only
        expect(onRetry).toHaveBeenCalledWith({ attempt: 1, delay: 50, code: 'PROVIDER_UNAVAILABLE' });
    });
});


test('an aborted in-flight success cannot escape as a valid result', async () => {
    const controller = new AbortController();
    invokeAiStage.mockImplementation(async () => {
        controller.abort();
        return OK;
    });
    await expect(invokeAiStageWithRetry({ stage: 'vision' }, { signal: controller.signal }))
        .rejects.toMatchObject({ code: 'CANCELLED' });
});
