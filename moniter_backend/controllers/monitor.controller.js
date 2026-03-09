const prisma = require('../lib/prisma');
const { scheduleImmediately } = require('../lib/scheduler');

const VALID_TYPES = ['HTTP', 'TCP'];
const VALID_METHODS = ['GET', 'POST', 'HEAD'];
const VALID_INTERVALS = [1, 3, 5, 10, 30];

/**
 * Assert the workspace exists and belongs to the authenticated user.
 * Returns the workspace or sends a 404 response.
 */
const assertWorkspaceOwner = async (res, workspaceId, userId) => {
    const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, userId },
    });
    if (!workspace) {
        res.status(404).json({ error: 'Workspace not found' });
        return null;
    }
    return workspace;
};

/**
 * GET /api/workspaces/:workspaceId/monitors
 */
const listMonitors = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const workspace = await assertWorkspaceOwner(res, workspaceId, req.user.id);
        if (!workspace) return;

        const monitors = await prisma.monitor.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ monitors });
    } catch (error) {
        console.error('listMonitors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/workspaces/:workspaceId/monitors
 */
const createMonitor = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const workspace = await assertWorkspaceOwner(res, workspaceId, req.user.id);
        if (!workspace) return;

        const { name, url, type, method, interval, headers, body, expectedStatus, expectedBody } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Monitor name is required' });
        }
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
            return res.status(400).json({ error: 'URL is required' });
        }
        if (type && !VALID_TYPES.includes(type)) {
            return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
        }
        if (method && !VALID_METHODS.includes(method)) {
            return res.status(400).json({ error: `method must be one of: ${VALID_METHODS.join(', ')}` });
        }
        if (interval !== undefined && !VALID_INTERVALS.includes(Number(interval))) {
            return res.status(400).json({ error: `interval must be one of: ${VALID_INTERVALS.join(', ')} minutes` });
        }
        if (expectedStatus !== undefined && expectedStatus !== null) {
            const code = Number(expectedStatus);
            if (!Number.isInteger(code) || code < 100 || code > 599) {
                return res.status(400).json({ error: 'expectedStatus must be a valid HTTP status code (100–599)' });
            }
        }
        if (headers !== undefined && headers !== null && typeof headers !== 'object') {
            return res.status(400).json({ error: 'headers must be a JSON object' });
        }

        const monitor = await prisma.monitor.create({
            data: {
                workspaceId,
                name: name.trim(),
                url: url.trim(),
                type: type || 'HTTP',
                method: method || 'GET',
                interval: interval ? Number(interval) : 5,
                headers: headers || null,
                body: body || null,
                expectedStatus: expectedStatus ? Number(expectedStatus) : null,
                expectedBody: expectedBody || null,
                paused: false,
            },
        });

        // Kick off a first check right away (non-blocking)
        scheduleImmediately(monitor.id).catch(() => {});

        res.status(201).json({ monitor });
    } catch (error) {
        console.error('createMonitor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * PUT /api/workspaces/:workspaceId/monitors/:id
 */
const updateMonitor = async (req, res) => {
    try {
        const { workspaceId, id } = req.params;

        const workspace = await assertWorkspaceOwner(res, workspaceId, req.user.id);
        if (!workspace) return;

        const existing = await prisma.monitor.findFirst({ where: { id, workspaceId } });
        if (!existing) return res.status(404).json({ error: 'Monitor not found' });

        const { name, url, type, method, interval, headers, body, expectedStatus, expectedBody } = req.body;

        if (type && !VALID_TYPES.includes(type)) {
            return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
        }
        if (method && !VALID_METHODS.includes(method)) {
            return res.status(400).json({ error: `method must be one of: ${VALID_METHODS.join(', ')}` });
        }
        if (interval !== undefined && !VALID_INTERVALS.includes(Number(interval))) {
            return res.status(400).json({ error: `interval must be one of: ${VALID_INTERVALS.join(', ')} minutes` });
        }

        const monitor = await prisma.monitor.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(url && { url: url.trim() }),
                ...(type && { type }),
                ...(method && { method }),
                ...(interval !== undefined && { interval: Number(interval) }),
                ...(headers !== undefined && { headers: headers || null }),
                ...(body !== undefined && { body: body || null }),
                ...(expectedStatus !== undefined && { expectedStatus: expectedStatus ? Number(expectedStatus) : null }),
                ...(expectedBody !== undefined && { expectedBody: expectedBody || null }),
            },
        });

        res.json({ monitor });
    } catch (error) {
        console.error('updateMonitor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * PATCH /api/workspaces/:workspaceId/monitors/:id/pause
 * Toggle paused state.
 */
const togglePause = async (req, res) => {
    try {
        const { workspaceId, id } = req.params;

        const workspace = await assertWorkspaceOwner(res, workspaceId, req.user.id);
        if (!workspace) return;

        const existing = await prisma.monitor.findFirst({ where: { id, workspaceId } });
        if (!existing) return res.status(404).json({ error: 'Monitor not found' });

        const monitor = await prisma.monitor.update({
            where: { id },
            data: { paused: !existing.paused },
        });

        // If we just unpaused, run an immediate check
        if (!monitor.paused) {
            scheduleImmediately(monitor.id).catch(() => {});
        }

        res.json({ monitor });
    } catch (error) {
        console.error('togglePause error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * DELETE /api/workspaces/:workspaceId/monitors/:id
 */
const deleteMonitor = async (req, res) => {
    try {
        const { workspaceId, id } = req.params;

        const workspace = await assertWorkspaceOwner(res, workspaceId, req.user.id);
        if (!workspace) return;

        const existing = await prisma.monitor.findFirst({ where: { id, workspaceId } });
        if (!existing) return res.status(404).json({ error: 'Monitor not found' });

        await prisma.monitor.delete({ where: { id } });

        res.json({ message: 'Monitor deleted successfully' });
    } catch (error) {
        console.error('deleteMonitor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/workspaces/:workspaceId/monitors/:id
 */
const getMonitor = async (req, res) => {
    try {
        const { workspaceId, id } = req.params;

        const workspace = await assertWorkspaceOwner(res, workspaceId, req.user.id);
        if (!workspace) return;

        const monitor = await prisma.monitor.findFirst({ where: { id, workspaceId } });
        if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

        res.json({ monitor });
    } catch (error) {
        console.error('getMonitor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { listMonitors, getMonitor, createMonitor, updateMonitor, togglePause, deleteMonitor };
