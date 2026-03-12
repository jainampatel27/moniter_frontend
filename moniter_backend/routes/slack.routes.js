const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { install, callback, disconnect, status } = require('../controllers/slack.controller');

// Public — Slack redirects here, no auth token possible in query params
router.get('/install', install);
router.get('/callback', callback);

// Authenticated
router.get('/status', authMiddleware, status);
router.delete('/disconnect', authMiddleware, disconnect);

module.exports = router;
