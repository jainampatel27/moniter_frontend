const router = require('express').Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth.middleware');
const { listChecks, triggerCheck, bulkStatus } = require('../controllers/check.controller');

router.use(authMiddleware);

// Bulk status for all monitors in a workspace
router.get('/status', bulkStatus);

// Per-monitor check history
router.get('/:id/checks',  listChecks);
router.post('/:id/checks', triggerCheck);

module.exports = router;
