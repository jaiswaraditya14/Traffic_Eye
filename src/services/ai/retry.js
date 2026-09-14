/**
 * ai/retry.js — transient-failure retry wrapper around invokeAiStage
 *
 * The transport in ./utils.js performs exactly one round trip and fails closed.
 * This wrapper adds a small, bounded retry policy on top WITHOUT changing that
 * contract or touching the server (`ai-analyze` / providers.ts):
 *
 *   • Retries ONLY typed transient transport errors — PROVIDER_UNAVAILABLE,
 *     PROVIDER_TIMEOUT, NETWORK (see isRetryableAiError). Auth, validation,
 *     quota/rate-limit and deterministic bad-output errors are re-thrown
 *     immediately — a second attempt cannot change their outcome.
 *   • Two retries after the initial attempt, with ~1s then ~3s back-off
 *     (three attempts total).
 *   • Cancellable: an aborted AbortSignal short-circuits before the next
 *     attempt and interrupts an in-flight back-off delay, so a screen that
 *     unmounts (or a user who cancels) does not keep retrying in the
 *     background. A cancelled run throws AiStageError('CANCELLED'), which is
 *     not retryable and is easy for callers to ignore.
 *
 * Overlapping loops are the caller's responsibility to prevent (one in-flight
 * wrapper per logical request); this module keeps no shared state.
 */

import { invokeAiStage, AiStageError, isRetryableAiError } from './utils';

// Two retries after the initial attempt: ~1s then ~3s.
export const RETRY_DELAYS_MS = [1000, 3000];

const makeCancelled = () => new AiStageError('CANCELLED', null, 'AI request cancelled.');

/**
 * Resolve after `ms`, or reject with a CANCELLED AiStageError if `signal`
 * aborts first. Always clears its timer and abort listener.
 */
const cancellableDelay = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) {
        reject(makeCancelled());
        return;
    }
    let settled = false;
    const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (signal && typeof signal.removeEventListener === 'function') {
            signal.removeEventListener('abort', onAbort);
        }
        fn(arg);
    };
    const onAbort = () => finish(reject, makeCancelled());
    const timer = setTimeout(() => finish(resolve), ms);
    if (signal && typeof signal.addEventListener === 'function') {
        signal.addEventListener('abort', onAbort);
    }
});

/**
 * Run one AI stage with bounded, cancellable retry on transient failures.
 *
 * @param {object} args - forwarded verbatim to invokeAiStage
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - abort to cancel pending retries/delays
 * @param {number[]}    [options.delays] - back-off delays in ms (default 1s, 3s)
 * @param {(info: { attempt: number, delay: number, code: string }) => void} [options.onRetry]
 *        - notified just before each back-off delay (attempt is 1-based)
 * @returns {Promise<{ text, provider, model, latencyMs, correlationId }>}
 * @throws {AiStageError} the last error if retries are exhausted / non-retryable,
 *         or AiStageError('CANCELLED') if the signal aborts.
 */
export async function invokeAiStageWithRetry(args, { signal, delays = RETRY_DELAYS_MS, onRetry } = {}) {
    let attempt = 0; // number of retries already scheduled

    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (signal?.aborted) throw makeCancelled();

        try {
            const result = await invokeAiStage(args, { signal });
            if (signal?.aborted) throw makeCancelled();
            return result;
        } catch (err) {
            if (signal?.aborted) throw makeCancelled();
            const hasBudget = attempt < delays.length;
            if (!hasBudget || !isRetryableAiError(err) || signal?.aborted) {
                throw err;
            }
            const delay = delays[attempt];
            attempt += 1;
            if (onRetry) onRetry({ attempt, delay, code: err.code });
            // Throws CANCELLED if aborted mid-delay.
            await cancellableDelay(delay, signal);
        }
    }
}

export default invokeAiStageWithRetry;
