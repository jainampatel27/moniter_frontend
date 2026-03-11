const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
    listWorkspaces,
    createWorkspace,
    getWorkspace,
    deleteWorkspace,
} = require('../controllers/workspace.controller');
const {
    getCustomDomain,
    saveCustomDomain,
    verifyCustomDomain,
    removeCustomDomain,
} = require('../controllers/customDomain.controller');

// All workspace routes require authentication
router.use(authMiddleware);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.delete('/:id', deleteWorkspace);

// Custom domain routes
router.get('/:id/custom-domain', getCustomDomain);
router.post('/:id/custom-domain', saveCustomDomain);
router.post('/:id/custom-domain/verify', verifyCustomDomain);
router.delete('/:id/custom-domain', removeCustomDomain);

module.exports = router;

