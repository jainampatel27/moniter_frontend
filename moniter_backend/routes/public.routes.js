const router  = require('express').Router();
const { publicStatus } = require('../controllers/public.controller');

// No authMiddleware — these are intentionally public
router.get('/:workspaceId/status', publicStatus);

module.exports = router;
