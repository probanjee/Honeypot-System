import rateLimit from 'express-rate-limit';

// ---------------------------------------------------------------------------
// Stricter rate limiter for authentication routes.
// Applied in addition to the global API rate limiter.
//
// Limits: 10 requests per 15 minutes per IP on login/register endpoints.
// This limits brute-force and credential stuffing attacks.
// ---------------------------------------------------------------------------

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    status: 429,
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind a proxy, fall back to socket remote address
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])?.trim()
      : req.socket?.remoteAddress;
    return ip ?? 'unknown';
  },
});

export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 1 hour.',
    status: 429,
  },
});
