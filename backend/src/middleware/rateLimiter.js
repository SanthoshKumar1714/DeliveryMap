const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Key by logged-in user id when available, fall back to a safe IP key
// (login/register happen BEFORE a user has a token)
const keyByUserOrIP = (req) => {
  return req.user?.id || ipKeyGenerator(req);
};

const jsonHandler = (req, res, _next, options) => {
  res.status(options.statusCode).json({
    error: options.message || 'Too many requests, please try again later.',
  });
};

// ---- General API limiter (applied globally as a safety net) ----
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIP,
  handler: jsonHandler,
  message: 'Too many requests. Please slow down and try again shortly.',
});

// ---- Strict limiter for auth (login/register) — prevents brute force ----
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: jsonHandler,
  message: 'Too many login/registration attempts. Please try again in 15 minutes.',
});

// ---- Location ping limiter ----
const locationPingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIP,
  handler: jsonHandler,
  message: 'Location updates are being sent too frequently.',
});

// ---- Search/browse limiter ----
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIP,
  handler: jsonHandler,
  message: 'Too many search requests. Please slow down.',
});

// ---- Write limiter ----
const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIP,
  handler: jsonHandler,
  message: 'Too many write requests. Please slow down.',
});

module.exports = {
  generalLimiter,
  authLimiter,
  locationPingLimiter,
  searchLimiter,
  writeLimiter,
};