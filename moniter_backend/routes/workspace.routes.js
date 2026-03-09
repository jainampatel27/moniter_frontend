const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
    listWorkspaces,
    createWorkspace,
    getWorkspace,
    deleteWorkspace,
} = require('../controllers/workspace.controller');

// All workspace routes require authentication
router.use(authMiddleware);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.delete('/:id', deleteWorkspace);

module.exports = router;
