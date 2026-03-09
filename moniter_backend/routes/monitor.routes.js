const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :workspaceId
const authMiddleware = require('../middleware/auth.middleware');
const {
    listMonitors,
    getMonitor,
    createMonitor,
    updateMonitor,
    togglePause,
    deleteMonitor,
} = require('../controllers/monitor.controller');

router.use(authMiddleware);

router.get('/', listMonitors);
router.post('/', createMonitor);
router.get('/:id', getMonitor);
router.put('/:id', updateMonitor);
router.patch('/:id/pause', togglePause);
router.delete('/:id', deleteMonitor);

module.exports = router;
