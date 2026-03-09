const express = require('express');
const router = express.Router();
const { signup, login, me, logout } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// Brute-force protection: only login and signup are rate-limited
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, me);
router.post('/logout', logout);

module.exports = router;
