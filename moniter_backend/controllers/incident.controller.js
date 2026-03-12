/**
 * controllers/incident.controller.js
 *
 * Incident management for authenticated users.
 * Incidents are auto-created by the checker; these endpoints expose them
 * and allow adding notes / postmortems.
 *
 * Routes (all under /api/workspaces/:workspaceId/incidents):
 *   GET  /                     – list all incidents for the workspace
 *   GET  /:incidentId          – get a single incident
 *   PATCH /:incidentId/notes   – update notes/postmortem text
 */

const prisma = require('../lib/prisma');

/**
 * Verify the workspace belongs to the user.
 */
async function assertOwner(res, workspaceId, userId) {
    const ws = await prisma.workspace.findFirst({ where: { id: workspaceId, userId } });
    if (!ws) { res.status(404).json({ error: 'Workspace not found' }); return null; }
    return ws;
}

/**
 * GET /api/workspaces/:workspaceId/incidents
 * Query params:
 *   status  – OPEN | RESOLVED  (optional, returns all if omitted)
 *   take    – max rows         (default 50)
 *   skip    – offset           (default 0)
 */
const listIncidents = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        if (!await assertOwner(res, workspaceId, req.user.id)) return;

        const { status, take = 50, skip = 0 } = req.query;

        // Collect all monitor ids for this workspace
        const monitors = await prisma.monitor.findMany({
            where: { workspaceId },
            select: { id: true },
        });
        const monitorIds = monitors.map((m) => m.id);

        const where = {
            monitorId: { in: monitorIds },
            ...(status && { status }),
        };

        const [incidents, total] = await Promise.all([
            prisma.incident.findMany({
                where,
                orderBy: { startedAt: 'desc' },
                take: Math.min(Number(take), 200),
                skip: Number(skip),
                include: {
                    monitor: { select: { id: true, name: true, url: true } },
                },
            }),
            prisma.incident.count({ where }),
        ]);

        res.json({ incidents, total });
    } catch (err) {
        console.error('listIncidents error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/workspaces/:workspaceId/incidents/:incidentId
 */
const getIncident = async (req, res) => {
    try {
        const { workspaceId, incidentId } = req.params;
        if (!await assertOwner(res, workspaceId, req.user.id)) return;

        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
            include: { monitor: { select: { id: true, name: true, url: true } } },
        });

        if (!incident) return res.status(404).json({ error: 'Incident not found' });

        // Verify incident belongs to this workspace
        const monitors = await prisma.monitor.findMany({
            where: { workspaceId },
            select: { id: true },
        });
        const monitorIds = monitors.map((m) => m.id);
        if (!monitorIds.includes(incident.monitorId)) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        res.json({ incident });
    } catch (err) {
        console.error('getIncident error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * PATCH /api/workspaces/:workspaceId/incidents/:incidentId/notes
 * Body: { notes: string }
 *
 * Allows adding or updating postmortem / incident notes.
 */
const updateNotes = async (req, res) => {
    try {
        const { workspaceId, incidentId } = req.params;
        if (!await assertOwner(res, workspaceId, req.user.id)) return;

        const { notes } = req.body;
        if (typeof notes !== 'string') {
            return res.status(400).json({ error: '`notes` must be a string' });
        }

        const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
        if (!incident) return res.status(404).json({ error: 'Incident not found' });

        // Verify ownership via monitor → workspace
        const monitor = await prisma.monitor.findFirst({
            where: { id: incident.monitorId, workspaceId },
        });
        if (!monitor) return res.status(404).json({ error: 'Incident not found' });

        const updated = await prisma.incident.update({
            where: { id: incidentId },
            data: { notes: notes.trim() || null },
            include: { monitor: { select: { id: true, name: true, url: true } } },
        });

        res.json({ incident: updated });
    } catch (err) {
        console.error('updateNotes error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { listIncidents, getIncident, updateNotes };
