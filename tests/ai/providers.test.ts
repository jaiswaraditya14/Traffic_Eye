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

    test('no configured key spends no provider credit', async () => {
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({
            name: 'ProviderError', code: ERR.NOT_CONFIGURED, attempts: 0,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('configuration is checked for the requested stage, not an unrelated provider', () => {
        expect(providerConfiguredFor('vision')).toBe(false);
        expect(providerConfiguredFor('ocr')).toBe(false);
        expect(providerConfiguredFor('audit')).toBe(false);
        secrets.GROQ_API_KEY_1 = 'synthetic-groq-key';
        expect(providerConfiguredFor('audit')).toBe(true);
        expect(providerConfiguredFor('vision')).toBe(false);
        expect(providerConfiguredFor('ocr')).toBe(false);
        secrets.GEMINI_API_KEY_1 = 'synthetic-gemini-key';
        expect(providerConfiguredFor('vision')).toBe(true);
        expect(providerConfiguredFor('ocr')).toBe(true);
    });

    test('audit uses the fixed Groq endpoint/model and does not return credentials or full provider payloads', async () => {
        secrets.GROQ_API_KEY_1 = 'synthetic-test-key';
        fetchMock.mockResolvedValue(goodResponse());

        const result = await runStage('audit', 'Synthetic prompt', null, true);

        expect(result).toEqual({
            text: '{"plate":"TEST123"}',
            provider: 'groq',
            model: 'openai/gpt-oss-20b',
            attempts: 1,
            latencyMs: expect.any(Number),
        });
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
        expect(options.headers.Authorization).toBe('Bearer synthetic-test-key');
        expect(JSON.parse(options.body)).toMatchObject({
            model: 'openai/gpt-oss-20b',
            messages: [{ role: 'user', content: 'Synthetic prompt' }],
            response_format: { type: 'json_object' },
        });
        expect(JSON.stringify(result)).not.toContain('synthetic-test-key');
    });

    test('Gemini credentials are sent only as a header, never in the URL or returned result', async () => {
        secrets.GEMINI_API_KEY_1 = 'synthetic-gemini-test-key';
        fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }], privateDetail: 'synthetic private metadata' }),
        });

        const result = await runStage('vision', 'Synthetic prompt', 'synthetic-image', true);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toMatch(/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/[A-Za-z0-9.-]+:generateContent$/);
        expect(url).not.toContain('synthetic-gemini-test-key');
        expect(options.headers['x-goog-api-key']).toBe('synthetic-gemini-test-key');
        expect(JSON.stringify(result)).not.toContain('synthetic');
    });

    test.each([
        [401, ERR.PROVIDER_BAD_OUTPUT],
        [500, ERR.PROVIDER_UNAVAILABLE],
    ])('HTTP %s discards provider error bodies without parsing or leaking them', async (status, code) => {
        secrets.GROQ_API_KEY_1 = 'synthetic-test-key';
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

    test('an HTTP 401 does not rotate through more keys for the same audit attempt', async () => {
        secrets.GROQ_API_KEY_1 = 'synthetic-key-one';
        secrets.GROQ_API_KEY_2 = 'synthetic-key-two';
        fetchMock.mockResolvedValue({ ok: false, status: 401, body: { cancel: async () => {} } });
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({ code: ERR.PROVIDER_BAD_OUTPUT });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('a transient quota response can rotate to the next configured key without returning the failed response', async () => {
        secrets.GROQ_API_KEY_1 = 'synthetic-key-one';
        secrets.GROQ_API_KEY_2 = 'synthetic-key-two';
        fetchMock
            .mockResolvedValueOnce({ ok: false, status: 429, body: { cancel: async () => {} } })
            .mockResolvedValueOnce(goodResponse('{}'));
        await expect(runStage('audit', 'Synthetic prompt', null, true)).resolves.toMatchObject({ text: '{}', attempts: 2 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer synthetic-key-two');
    });

    test.each([{}, { choices: [] }, { choices: [{ message: { content: '' } }] }, { choices: [{ message: { content: 42 } }] }])(
        'invalid completion shapes fail closed (%j)', async (json) => {
            secrets.GROQ_API_KEY_1 = 'synthetic-test-key';
            fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => json });
            await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({
                code: ERR.PROVIDER_BAD_OUTPUT, message: 'empty completion',
            });
        },
    );

    test('non-JSON successful HTTP responses are sanitized', async () => {
        secrets.GROQ_API_KEY_1 = 'synthetic-test-key';
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
        secrets.GROQ_API_KEY_1 = 'synthetic-test-key';
        fetchMock.mockResolvedValue(goodResponse('x'.repeat(16_001)));
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({ code: ERR.PROVIDER_BAD_OUTPUT });
    });

    test('network errors never expose URLs, tokens, or upstream details', async () => {
        secrets.GROQ_API_KEY_1 = 'synthetic-test-key';
        fetchMock.mockRejectedValue(new Error('synthetic secret in an upstream URL'));
        await expect(runStage('audit', 'Synthetic prompt', null, true)).rejects.toMatchObject({
            code: ERR.PROVIDER_UNAVAILABLE, status: null, message: 'network failure',
        });
    });

    test('provider deadline aborts in-flight requests and returns the typed timeout', async () => {
        jest.useFakeTimers();
        secrets.GROQ_API_KEY_1 = 'synthetic-test-key';
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
