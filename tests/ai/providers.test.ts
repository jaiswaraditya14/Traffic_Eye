/** @jest-environment node */

import { ERR } from '../../supabase/functions/_shared/http.ts';
import { providerConfiguredFor, ProviderError, runStage, STAGE_TIMEOUT_MS } from '../../supabase/functions/ai-analyze/providers.ts';

// These tests use deliberately synthetic values and never read process.env or
// make network calls. They execute the production provider transport in Node;
// they are not a deployed Edge Runtime or JWT integration test.
describe('server-owned AI provider transport', () => {
    let secrets: Record<string, string>;
    let originalDeno: unknown;
    let fetchMock: jest.SpyInstance;
    let logSpies: jest.SpyInstance[];

    beforeEach(() => {
        secrets = {};
        originalDeno = (globalThis as any).Deno;
        (globalThis as any).Deno = { env: { get: (name: string) => secrets[name] } };
        fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unconfigured mock transport'));
        logSpies = ['log', 'warn', 'error'].map((method) => jest.spyOn(console, method as 'log').mockImplementation(() => {}));
    });

    afterEach(() => {
        for (const spy of logSpies) expect(spy).not.toHaveBeenCalled();
        jest.restoreAllMocks();
        jest.useRealTimers();
        if (originalDeno === undefined) delete (globalThis as any).Deno;
        else (globalThis as any).Deno = originalDeno;
    });

    function goodResponse(text = '{"plate":"TEST123"}') {
        return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }] }) };
    }

    function goodGeminiResponse(text = '{"vehicle":{"type":"motorcycle"}}') {
        return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) };
    }

    test('no configured key spends no provider credit', async () => {
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({
            name: 'ProviderError', code: ERR.NOT_CONFIGURED, attempts: 0,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('configuration is checked for the requested stage', () => {
        expect(providerConfiguredFor('vision')).toBe(false);
        expect(providerConfiguredFor('ocr')).toBe(false);
        expect(providerConfiguredFor('audit')).toBe(false);
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-openrouter-key-1';
        expect(providerConfiguredFor('vision')).toBe(true);
        expect(providerConfiguredFor('ocr')).toBe(true);
        expect(providerConfiguredFor('audit')).toBe(true);
    });

    test('Gemini 3.5 Flash Lite is primary for vision when GEMINI_API_KEY is configured', async () => {
        secrets.GEMINI_API_KEY = 'synthetic-gemini-key';
        fetchMock.mockResolvedValue(goodGeminiResponse('{"vehicle":{"type":"motorcycle"}}'));

        const result = await runStage('vision', 'Synthetic prompt', 'synthetic-image', false);

        expect(result).toEqual({
            text: '{"vehicle":{"type":"motorcycle"}}',
            provider: 'gemini',
            model: 'gemini-3.5-flash-lite',
            attempts: 1,
            latencyMs: expect.any(Number),
        });
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toContain('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
        expect(url).toContain('key=synthetic-gemini-key');
        expect(options.headers['Content-Type']).toBe('application/json');
        const parsedBody = JSON.parse(options.body);
        expect(parsedBody.contents[0].parts).toEqual([
            { text: 'Synthetic prompt' },
            { inlineData: { mimeType: 'image/jpeg', data: 'synthetic-image' } },
        ]);
        expect(JSON.stringify(result)).not.toContain('synthetic-gemini-key');
    });

    test('Gemini falls back to gemini-2.5-flash on 429 rate limit', async () => {
        secrets.GEMINI_API_KEY = 'synthetic-gemini-key';
        fetchMock
            .mockResolvedValueOnce({ ok: false, status: 429, body: { cancel: async () => {} } })
            .mockResolvedValueOnce(goodGeminiResponse('{"vehicle":{"type":"car"}}'));

        const result = await runStage('vision', 'Synthetic prompt', 'synthetic-image', false);

        expect(result.provider).toBe('gemini');
        expect(result.model).toBe('gemini-2.5-flash');
        expect(result.attempts).toBe(2);
    });

    test('OpenRouter is primary for vision and includes required headers and model without leaking credentials', async () => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-openrouter-key-1';
        secrets.OPENROUTER_API_KEY_2 = 'synthetic-openrouter-key-2';
        fetchMock.mockResolvedValue(goodResponse('{"vehicle":{"type":"motorcycle"}}'));

        const result = await runStage('vision', 'Synthetic prompt', 'synthetic-image', false);

        expect(result).toEqual({
            text: '{"vehicle":{"type":"motorcycle"}}',
            provider: 'openrouter',
            model: 'nvidia/nemotron-3.5-super-vl:free',
            attempts: 1,
            latencyMs: expect.any(Number),
        });
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
        expect(options.headers.Authorization).toBe('Bearer synthetic-openrouter-key-1');
        expect(options.headers['HTTP-Referer']).toBe('https://trafficeye.app');
        expect(options.headers['X-Title']).toBe('Traffic Eye AI');
        expect(JSON.parse(options.body)).toMatchObject({
            model: 'nvidia/nemotron-3.5-super-vl:free',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: 'Synthetic prompt' },
                    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,synthetic-image' } },
                ],
            }],
        });
        expect(JSON.stringify(result)).not.toContain('synthetic-openrouter-key-1');
    });

    test('OpenRouter rotates from Key 1 to Key 2 on 429 rate limit', async () => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-key-1';
        secrets.OPENROUTER_API_KEY_2 = 'synthetic-key-2';
        // Key 1 fails with 429, Key 2 succeeds on the same model
        fetchMock
            .mockResolvedValueOnce({ ok: false, status: 429, body: { cancel: async () => {} } })
            .mockResolvedValueOnce(goodResponse('{"audit":"ok"}'));

        const result = await runStage('audit', 'Synthetic prompt', null, true);

        expect(result.provider).toBe('openrouter');
        expect(result.attempts).toBe(2);
        expect(fetchMock.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer synthetic-key-1');
        expect(fetchMock.mock.calls[1][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
        expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer synthetic-key-2');
    });

    test('OpenRouter falls back to next model when all keys encounter 429 upstream pool exhaustion', async () => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-key-1';
        secrets.OPENROUTER_API_KEY_2 = 'synthetic-key-2';
        // Model 1 fails on both Key 1 & Key 2 with 429, then Model 2 succeeds on Key 1
        fetchMock
            .mockResolvedValueOnce({ ok: false, status: 429, body: { cancel: async () => {} } })
            .mockResolvedValueOnce({ ok: false, status: 429, body: { cancel: async () => {} } })
            .mockResolvedValueOnce(goodResponse('{"vehicle":{"type":"motorcycle"}}'));

        const result = await runStage('vision', 'Synthetic prompt', 'synthetic-image', false);

        expect(result.provider).toBe('openrouter');
        expect(result.model).toBe('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free');
        expect(result.attempts).toBe(3);
    });

    test.each([
        [401, ERR.PROVIDER_BAD_OUTPUT],
        [500, ERR.PROVIDER_UNAVAILABLE],
    ])('HTTP %s discards provider error bodies without parsing or leaking them', async (status, code) => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-test-key';
        const bodyCancel = jest.fn().mockResolvedValue(undefined);
        const json = jest.fn().mockResolvedValue({ secret: 'synthetic-test-key', prompt: 'Synthetic prompt' });
        const text = jest.fn().mockResolvedValue('Synthetic provider response');
        fetchMock.mockResolvedValue({ ok: false, status, body: { cancel: bodyCancel }, json, text });

        const failure = await runStage('audit', 'Synthetic prompt', null, true).catch((error) => error);
        expect(failure).toBeInstanceOf(ProviderError);
        expect(failure).toMatchObject({ code, status, message: `upstream status ${status}`, attempts: 1, latencyMs: expect.any(Number) });
        expect(bodyCancel).toHaveBeenCalledTimes(1);
        expect(json).not.toHaveBeenCalled();
        expect(text).not.toHaveBeenCalled();
        expect(String(failure)).not.toContain('synthetic');
        expect(JSON.stringify(failure)).not.toContain('synthetic');
    });

    test('an HTTP 401 does not rotate through more keys for the same attempt', async () => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-key-one';
        secrets.OPENROUTER_API_KEY_2 = 'synthetic-key-two';
        fetchMock.mockResolvedValue({ ok: false, status: 401, body: { cancel: async () => {} } });
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({ code: ERR.PROVIDER_BAD_OUTPUT });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('a transient quota response (429) can rotate to the next configured key without returning the failed response', async () => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-key-one';
        secrets.OPENROUTER_API_KEY_2 = 'synthetic-key-two';
        fetchMock
            .mockResolvedValueOnce({ ok: false, status: 429, body: { cancel: async () => {} } })
            .mockResolvedValueOnce(goodResponse('{}'));
        await expect(runStage('audit', 'Synthetic prompt', null, true)).resolves.toMatchObject({ text: '{}', attempts: 2 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer synthetic-key-two');
    });

    test.each([{}, { choices: [] }, { choices: [{ message: { content: '' } }] }, { choices: [{ message: { content: 42 } }] }])(
        'invalid completion shapes fail closed (%j)', async (json) => {
            secrets.OPENROUTER_API_KEY_1 = 'synthetic-test-key';
            fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => json });
            await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({
                code: ERR.PROVIDER_BAD_OUTPUT, message: 'empty completion',
            });
        },
    );

    test('non-JSON successful HTTP responses are sanitized', async () => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-test-key';
        fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => { throw new SyntaxError('synthetic provider body and key'); },
        });
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({
            code: ERR.PROVIDER_UNAVAILABLE, message: 'network failure',
        });
    });

    test('oversized completion text fails closed', async () => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-test-key';
        fetchMock.mockResolvedValue(goodResponse('x'.repeat(16_001)));
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({ code: ERR.PROVIDER_BAD_OUTPUT });
    });

    test('network errors never expose URLs, tokens, or upstream details', async () => {
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-test-key';
        fetchMock.mockRejectedValue(new Error('synthetic secret in an upstream URL'));
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({
            code: ERR.PROVIDER_UNAVAILABLE, status: null, message: 'network failure',
        });
    });

    test('provider deadline aborts in-flight requests and returns the typed timeout', async () => {
        jest.useFakeTimers();
        secrets.OPENROUTER_API_KEY_1 = 'synthetic-test-key';
        fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Synthetic timeout', 'AbortError')), { once: true });
        }));

        const result = runStage('audit', 'Synthetic prompt', null, true);
        const assertion = expect(result).rejects.toMatchObject({ code: ERR.PROVIDER_TIMEOUT, message: 'timeout' });
        await jest.advanceTimersByTimeAsync(STAGE_TIMEOUT_MS.audit);
        await assertion;
        expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
        expect(jest.getTimerCount()).toBe(0);
    });
});
