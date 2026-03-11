const router = require('express').Router();
const { publicStatus, lookupDomain } = require('../controllers/public.controller');

// No authMiddleware — these are intentionally public
router.get('/:workspaceId/status', publicStatus);

// Custom domain → workspaceId lookup (called by Next.js middleware)
router.get('/domain/:hostname', lookupDomain);

module.exports = router;

