/**
 * Shared HTTP helpers for Traffic Eye Edge Functions.
 *
 * Rules enforced here:
 *   - Responses never contain provider payloads, upstream error bodies,
 *     stack traces, SQL text, or secrets.
 *   - Every response carries a correlation id so a user-visible failure can
 *     be traced in server logs without exposing internals to the client.
 */

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/** Stable, typed error codes. The client maps these to friendly copy. */
export const ERR = {
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_BAD_OUTPUT: 'PROVIDER_BAD_OUTPUT',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrCode = (typeof ERR)[keyof typeof ERR];

const STATUS_FOR: Record<string, number> = {
  METHOD_NOT_ALLOWED: 405,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  QUOTA_EXCEEDED: 429,
  PROVIDER_UNAVAILABLE: 502,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_BAD_OUTPUT: 502,
  NOT_CONFIGURED: 503,
  INTERNAL: 500,
};

export function newCorrelationId(req?: Request): string {
  const supplied = req?.headers.get('x-correlation-id');
  if (supplied && /^[A-Za-z0-9_-]{8,64}$/.test(supplied)) return supplied;
  return crypto.randomUUID();
}

export function jsonOk(body: unknown, correlationId: string): Response {
  return new Response(
    JSON.stringify({ ok: true, correlationId, ...(body as Record<string, unknown>) }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
    },
  );
}

export function jsonErr(code: ErrCode, correlationId: string, detail?: string): Response {
  // `detail` is a short, allow-listed hint written by us — never an upstream body.
  return new Response(JSON.stringify({ ok: false, code, correlationId, ...(detail ? { detail } : {}) }), {
    status: STATUS_FOR[code] ?? 500,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  return null;
}

/**
 * Server-side log line. Deliberately structured and free of user content:
 * no image bytes, no coordinates, no prompts, no provider payloads, no tokens.
 */
export function logEvent(fields: Record<string, string | number | boolean | null>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));
}
