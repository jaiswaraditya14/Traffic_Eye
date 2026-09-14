/** @jest-environment node */
// Executes the production handler with mocked auth/database/providers.
// This is a unit test, not verification of a real Supabase JWT or Postgres RLS.
const mockCreateClient = jest.fn();
const mockRunStage = jest.fn();
const mockConfigured = jest.fn();
jest.mock('jsr:@supabase/supabase-js@2.94.0', () => ({ createClient: mockCreateClient }), { virtual: true });
jest.mock('../../supabase/functions/ai-analyze/providers.ts', () => ({
  ...jest.requireActual('../../supabase/functions/ai-analyze/providers.ts'),
  runStage: mockRunStage,
  providerConfiguredFor: mockConfigured,
}));

const mockEnv = new Map();
globalThis.Deno = { env: { get: (name) => mockEnv.get(name) }, serve: jest.fn() };
globalThis.crypto = require('node:crypto').webcrypto;
const { handleRequest } = require('../../supabase/functions/ai-analyze/index.ts');
const { ProviderError } = require('../../supabase/functions/ai-analyze/providers.ts');

const userId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const mockGetUser = jest.fn();
const mockRpc = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();
let logSpy;

function request(body = { stage: 'vision', imageBase64: '/9j/2Q==' }, headers = {}) {
  return new Request('http://localhost/ai-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-session', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv.clear();
  mockEnv.set('SUPABASE_URL', 'http://localhost:54321');
  mockEnv.set('SUPABASE_ANON_KEY', 'test-public-key');
  mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  mockGetUser.mockResolvedValue({ data: { user: { id: userId, is_anonymous: false } }, error: null });
  mockRpc.mockResolvedValue({ data: { eventId }, error: null });
  mockSingle.mockResolvedValue({ data: { id: eventId }, error: null });
  mockEq.mockReturnValue({ select: () => ({ single: mockSingle }) });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
  mockCreateClient.mockImplementation((_url, key) => key === 'test-public-key'
    ? { auth: { getUser: mockGetUser } }
    : { rpc: mockRpc, from: mockFrom });
  mockConfigured.mockReturnValue(true);
  mockRunStage.mockResolvedValue({ text: '{"visible":true}', provider: 'nvidia', model: 'test-model', attempts: 1, latencyMs: 5 });
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => logSpy.mockRestore());

test('authenticated request with no provider keys returns typed NOT_CONFIGURED without spending or reserving', async () => {
  mockConfigured.mockReturnValue(false);
  const response = await handleRequest(request());
  const body = await response.json();
  expect(response.status).toBe(503);
  expect(body).toEqual({ ok: false, code: 'NOT_CONFIGURED', correlationId: expect.any(String) });
  expect(mockGetUser).toHaveBeenCalledTimes(1);
  expect(mockRpc).not.toHaveBeenCalled();
  expect(mockRunStage).not.toHaveBeenCalled();
});

test.each(['', 'Basic test'])('missing bearer identity is rejected even when provider is unconfigured (%s)', async (authorization) => {
  mockConfigured.mockReturnValue(false);
  const response = await handleRequest(request(undefined, { Authorization: authorization }));
  expect(response.status).toBe(401);
  expect((await response.json()).code).toBe('UNAUTHENTICATED');
  expect(mockConfigured).not.toHaveBeenCalled();
});

test.each([
  { data: { user: null }, error: { message: 'private-auth-detail' } },
  { data: { user: { id: userId, is_anonymous: true } }, error: null },
])('invalid or anonymous Supabase identity cannot use the proxy', async (authResult) => {
  mockGetUser.mockResolvedValue(authResult);
  const response = await handleRequest(request());
  expect(response.status).toBe(401);
  expect(mockRpc).not.toHaveBeenCalled();
  expect(mockRunStage).not.toHaveBeenCalled();
});

test('verified Supabase identity owns the reservation; body IDs/provider settings cannot select it', async () => {
  const response = await handleRequest(request({ stage: 'vision', imageBase64: '/9j/2Q==', user_id: 'forged', model: 'forged', provider: 'forged', quota: 999 }));
  expect(response.status).toBe(200);
  expect(mockRpc).toHaveBeenCalledWith('reserve_ai_analysis_event', {
    p_user_id: userId, p_stage: 'vision', p_correlation_id: expect.any(String), p_request_bytes: 4,
  });
  expect(mockRunStage).toHaveBeenCalledWith('vision', expect.any(String), '/9j/2Q==', false);
  expect(mockEq).toHaveBeenCalledWith('id', eventId);
  expect(mockUpdate).toHaveBeenCalledWith({ provider: 'nvidia', model: 'test-model', attempts: 1, latency_ms: 5, outcome: 'success', failure_code: null });
});

test.each([
  [{ data: { code: 'QUOTA_EXCEEDED' }, error: null }, 429, 'QUOTA_EXCEEDED'],
  [{ data: null, error: { message: 'private-sql-detail' } }, 500, 'INTERNAL'],
  [{ data: null, error: null }, 500, 'INTERNAL'],
])('quota exhaustion/unavailable ledger blocks providers', async (rpcResult, status, code) => {
  mockRpc.mockResolvedValue(rpcResult);
  const response = await handleRequest(request());
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ ok: false, code, correlationId: expect.any(String) });
  expect(mockRunStage).not.toHaveBeenCalled();
});

test('failed completion write produces INTERNAL and leaves the reservation counted', async () => {
  mockSingle.mockResolvedValue({ data: null, error: { message: 'private-ledger-detail' } });
  const response = await handleRequest(request());
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, code: 'INTERNAL', correlationId: expect.any(String) });
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

test('provider error records metrics but never exposes upstream messages/bodies in response or logs', async () => {
  const error = new ProviderError('PROVIDER_BAD_OUTPUT', 401, 'private-provider-body');
  error.attempts = 2;
  error.latencyMs = 10;
  mockRunStage.mockRejectedValue(error);
  const response = await handleRequest(request());
  const body = await response.json();
  expect(response.status).toBe(502);
  expect(body).toEqual({ ok: false, code: 'PROVIDER_BAD_OUTPUT', correlationId: expect.any(String) });
  expect(mockUpdate).toHaveBeenCalledWith({ provider: null, model: null, attempts: 2, latency_ms: 10, outcome: 'failure', failure_code: 'PROVIDER_BAD_OUTPUT' });
  expect(JSON.stringify(logSpy.mock.calls)).not.toMatch(/private-provider-body|test-session|test-service-key|imageBase64|\/9j\//);
});

test('unexpected SDK failure returns a sanitized typed error', async () => {
  mockRpc.mockRejectedValue(new Error('private-network-detail'));
  const response = await handleRequest(request());
  expect(await response.json()).toEqual({ ok: false, code: 'INTERNAL', correlationId: expect.any(String) });
  expect(mockRunStage).not.toHaveBeenCalled();
});

test.each([
  [{ stage: 'invalid' }, 400],
  [{ stage: 'vision', imageBase64: 'bad' }, 400],
  [{ stage: 'vision', imageBase64: 'aGVsbG8=' }, 415],
  [{ stage: 'audit', evidenceSummary: '', candidates: [] }, 400],
  [{ stage: 'audit', evidenceSummary: 'summary', candidates: [1] }, 400],
])('rejects malformed stage inputs before quota or provider calls', async (body, status) => {
  expect((await handleRequest(request(body))).status).toBe(status);
  expect(mockRpc).not.toHaveBeenCalled();
  expect(mockRunStage).not.toHaveBeenCalled();
});

test('rejects an oversized streaming body without relying on Content-Length', async () => {
  const body = { stage: 'vision', imageBase64: '/9j/' + 'A'.repeat(12 * 1024 * 1024) };
  const response = await handleRequest(request(body));
  expect(response.status).toBe(413);
  expect(mockRpc).not.toHaveBeenCalled();
});

test('requires JSON content type and handles malformed JSON safely', async () => {
  expect((await handleRequest(request(undefined, { 'Content-Type': 'text/plain' }))).status).toBe(415);
  const response = await handleRequest(new Request('http://localhost/ai-analyze', { method: 'POST', headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' }, body: '{broken' }));
  expect(response.status).toBe(400);
});

test('preflight and method errors do not invoke auth/providers', async () => {
  expect((await handleRequest(new Request('http://localhost/ai-analyze', { method: 'OPTIONS' }))).status).toBe(200);
  expect((await handleRequest(new Request('http://localhost/ai-analyze'))).status).toBe(405);
  expect(mockGetUser).not.toHaveBeenCalled();
});
