/**
 * VIGILANCE Nowhere Esports Intranet - Sensitive Data Redaction Engine
 * Scrubs credentials, tokens, session cookies, and secrets prior to evidence persistence.
 */

const SENSITIVE_HEADER_PATTERNS = [
  /authorization/i,
  /proxy-authorization/i,
  /cookie/i,
  /set-cookie/i,
  /x-api-key/i,
];

const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwd',
  'pass',
  'pwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'credit_card',
  'cvv',
  'ssn',
]);

/**
 * Redacts high-risk HTTP headers while preserving header presence and benign metadata.
 */
export function redactHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, rawVal] of Object.entries(headers)) {
    if (rawVal === undefined) continue;
    const val = Array.isArray(rawVal) ? rawVal.join(', ') : String(rawVal);
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_HEADER_PATTERNS.some(rx => rx.test(lowerKey))) {
      if (lowerKey === 'cookie') {
        sanitized[key] = '[REDACTED_COOKIE]';
      } else {
        sanitized[key] = '[REDACTED_SECRET]';
      }
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Recursively redacts sensitive keys in JSON-serializable objects (query params, parsed body).
 */
export function redactObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item)) as unknown as T;
  }

  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELD_NAMES.has(key.toLowerCase())) {
      copy[key] = '[REDACTED_SECRET]';
    } else if (typeof value === 'object' && value !== null) {
      copy[key] = redactObject(value);
    } else {
      copy[key] = value;
    }
  }

  return copy as T;
}

/**
 * Truncates and safely bounds raw body text.
 */
export function boundAndRedactRawBody(body: unknown, maxBytes = 4096): { text: string | null; bytes: number } {
  if (body === null || body === undefined) {
    return { text: null, bytes: 0 };
  }

  let str: string;
  if (typeof body === 'string') {
    str = body;
  } else if (Buffer.isBuffer(body)) {
    str = body.toString('utf-8');
  } else {
    try {
      str = JSON.stringify(redactObject(body));
    } catch {
      str = String(body);
    }
  }

  const totalBytes = Buffer.byteLength(str, 'utf-8');
  if (totalBytes > maxBytes) {
    return {
      text: str.slice(0, maxBytes) + '... [TRUNCATED_AT_4KB]',
      bytes: totalBytes,
    };
  }

  return {
    text: str,
    bytes: totalBytes,
  };
}
