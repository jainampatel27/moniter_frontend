const prisma = require('../lib/prisma');

const MAX_WORKSPACES_PER_USER = 2;

/**
 * GET /api/workspaces
 * List all workspaces belonging to the authenticated user.
 */
const listWorkspaces = async (req, res) => {
    try {
        const workspaces = await prisma.workspace.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true, name: true, createdAt: true, updatedAt: true,
                _count: { select: { monitors: true } },
            },
        });

        res.json({ workspaces });
    } catch (error) {
        console.error('listWorkspaces error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/workspaces
 * Create a new workspace for the authenticated user.
 * Enforces a maximum of MAX_WORKSPACES_PER_USER per user.
 */
const createWorkspace = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Workspace name is required' });
        }

        const trimmedName = name.trim();
        if (trimmedName.length > 64) {
            return res.status(400).json({ error: 'Workspace name must be 64 characters or fewer' });
        }

        const count = await prisma.workspace.count({ where: { userId: req.user.id } });
        if (count >= MAX_WORKSPACES_PER_USER) {
            return res.status(403).json({
                error: `You can have at most ${MAX_WORKSPACES_PER_USER} workspaces`,
            });
        }

        const workspace = await prisma.workspace.create({
            data: { name: trimmedName, userId: req.user.id },
            select: { id: true, name: true, createdAt: true, updatedAt: true },
        });

        res.status(201).json({ workspace });
    } catch (error) {
        console.error('createWorkspace error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/workspaces/:id
 * Get a single workspace by ID (must belong to the authenticated user).
 */
const getWorkspace = async (req, res) => {
    try {
        const { id } = req.params;

        const workspace = await prisma.workspace.findFirst({
            where: { id, userId: req.user.id },
            select: { id: true, name: true, createdAt: true, updatedAt: true },
        });

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        res.json({ workspace });
    } catch (error) {
        console.error('getWorkspace error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * DELETE /api/workspaces/:id
 * Delete a workspace (must belong to the authenticated user).
 */
const deleteWorkspace = async (req, res) => {
    try {
        const { id } = req.params;

        const workspace = await prisma.workspace.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        await prisma.workspace.delete({ where: { id } });

        res.json({ message: 'Workspace deleted successfully' });
    } catch (error) {
        console.error('deleteWorkspace error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { listWorkspaces, createWorkspace, getWorkspace, deleteWorkspace };
