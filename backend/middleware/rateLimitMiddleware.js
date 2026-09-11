const rateLimit = require("express-rate-limit");
const config = require("../config/env");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later."
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Greatly increase the limit during development to prevent hot-reload lockouts
  limit: config.nodeEnv === "development" ? 3000 : 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};