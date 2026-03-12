const express = require('express');
const router = express.Router({ mergeParams: true }); // inherit :workspaceId
const authMiddleware = require('../middleware/auth.middleware');
const { listIncidents, getIncident, updateNotes } = require('../controllers/incident.controller');

router.use(authMiddleware);

router.get('/', listIncidents);
router.get('/:incidentId', getIncident);
router.patch('/:incidentId/notes', updateNotes);

module.exports = router;
