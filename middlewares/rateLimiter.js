const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// Helper to compose multiple express-rate-limit middlewares into one
const composeLimiters = (middlewares) => {
  return (req, res, next) => {
    let idx = 0;
    const runNext = () => {
      const mw = middlewares[idx++];
      if (!mw) return next();
      mw(req, res, (err) => {
        if (err) return next(err);
        if (res.headersSent) return;
        runNext();
      });
    };
    runNext();
  };
};

// ----------------------
// Auth (login) limiter: sliding-window-like
// ----------------------
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const id = req.body && (req.body.email || req.body.username);
    if (id) return `auth:${String(id).toLowerCase()}`;
    return ipKeyGenerator(req.ip);
  },
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const retryAfter = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : 60;
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "Too many authentication attempts. Try later.",
      retryAfter,
    });
  },
});

// ----------------------
// Registration limiter: strict per-IP
// ----------------------
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const retryAfter = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : 3600;
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "Too many registration attempts. Try later.",
      retryAfter,
    });
  },
});

// ----------------------
// Public API limiter: token-bucket-like via layered limiters
// ----------------------
const publicBurstLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip),
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const retryAfter = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : 10;
    res.set("Retry-After", String(retryAfter));
    return res
      .status(429)
      .json({ message: "Too many requests (burst). Slow down.", retryAfter });
  },
});

const publicSustainedLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip),
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const retryAfter = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : 60;
    res.set("Retry-After", String(retryAfter));
    return res
      .status(429)
      .json({ message: "Too many requests. Slow down.", retryAfter });
  },
});

const publicApiLimiter = composeLimiters([
  publicBurstLimiter,
  publicSustainedLimiter,
]);

// ----------------------
// Admin limiter: leaky-bucket-like via per-second limiter + per-minute cap
// ----------------------
const adminPerSecondLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip),
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const retryAfter = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : 1;
    res.set("Retry-After", String(retryAfter));
    return res
      .status(429)
      .json({ message: "Too many requests (rate). Try later.", retryAfter });
  },
});

const adminPerMinuteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip),
  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;
    const retryAfter = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : 60;
    res.set("Retry-After", String(retryAfter));
    return res
      .status(429)
      .json({ message: "Too many admin requests. Try later.", retryAfter });
  },
});

const adminLimiter = composeLimiters([
  adminPerSecondLimiter,
  adminPerMinuteLimiter,
]);

module.exports = {
  authLimiter,
  registerLimiter,
  publicApiLimiter,
  adminLimiter,
};
