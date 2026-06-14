const rateLimit = require('express-rate-limit')

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,
    message: { error: 'Too many requests, slow down.' }
})

const reviewLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 5,
    message: { error: 'Too many review requests. Wait a moment.' }
})

module.exports = { globalLimiter, reviewLimiter }