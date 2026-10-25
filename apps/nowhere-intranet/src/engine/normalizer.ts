/**
 * VIGILANCE Nowhere Esports Intranet - Request Payload Normalizer
 * Implements bounded normalization without recursive double-decoding vulnerabilities.
 */

export const MAX_INSPECTION_BYTES = 4096;

/**
 * Safely decodes a percent-encoded string.
 * Handles malformed percent-encoding sequences without throwing uncaught exceptions.
 */
export function safeUrlDecode(input: string): string {
  if (!input || !input.includes('%')) {
    return input;
  }

  try {
    return decodeURIComponent(input);
  } catch {
    // If full decodeURIComponent fails on malformed multi-byte sequences, decode valid %XX parts safely
    return input.replace(/%([0-9a-fA-F]{2})/g, (_match, hex) => {
      try {
        const code = parseInt(hex, 16);
        return String.fromCharCode(code);
      } catch {
        return _match;
      }
    });
  }
}

/**
 * Normalizes an input string for regex signature inspection:
 * 1. Bounded to MAX_INSPECTION_BYTES.
 * 2. URL percent decoded safely.
 * 3. Null bytes stripped or replaced with space.
 * 4. Lowercased for case-insensitive matching.
 */
export function normalizeForInspection(raw: unknown, maxBytes: number = MAX_INSPECTION_BYTES): string {
  if (raw === null || raw === undefined) {
    return '';
  }

  let text: string;
  if (typeof raw === 'string') {
    text = raw;
  } else if (typeof raw === 'object') {
    try {
      text = JSON.stringify(raw);
    } catch {
      text = String(raw);
    }
  } else {
    text = String(raw);
  }

  // Bound length to prevent ReDoS and memory exhaustion
  if (text.length > maxBytes) {
    text = text.slice(0, maxBytes);
  }

  // Safe single-pass URL decode
  const decoded = safeUrlDecode(text);

  // Strip null bytes and collapse multiple whitespaces
  const clean = decoded.replace(/\x00/g, ' ').replace(/\s+/g, ' ').trim();

  return clean;
}
