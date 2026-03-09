/**
 * controllers/public.controller.js
 *
 * Public (no-auth) endpoints for the workspace status page.
 * Only exposes data that the workspace owner has made visible by sharing the URL.
 */

const prisma = require('../lib/prisma');

const HISTORY_DAYS = 20;

/**
 * GET /api/public/:workspaceId/status
 *
 * Returns workspace name + all monitors with their current status and
 * 20-day streak history.  No authentication required.
 */
const publicStatus = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true, name: true },
        });
        if (!workspace) return res.status(404).json({ error: 'Not found' });

        const monitors = await prisma.monitor.findMany({
            where: { workspaceId, paused: false },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true, name: true, url: true, type: true,
                method: true, interval: true, lastCheckedAt: true,
            },
        });

        const monitorIds = monitors.map((m) => m.id);
        const cutoff     = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);

        // Cap rows to prevent oversized responses on large workspaces
        const rowCap = Math.min(monitorIds.length * 40, 8_000);
        const allChecks = monitorIds.length === 0 ? [] : await prisma.monitorCheck.findMany({
            where: { monitorId: { in: monitorIds }, startedAt: { gte: cutoff } },
            orderBy: { startedAt: 'desc' },
            take: rowCap,
            select: {
                id: true, monitorId: true, ok: true,
                statusCode: true, responseMs: true, error: true,
                startedAt: true, checkedAt: true, checkCount: true,
            },
        });

        // Group by monitor
        const byMonitor = {};
        for (const c of allChecks) {
            if (!byMonitor[c.monitorId]) byMonitor[c.monitorId] = [];
            byMonitor[c.monitorId].push(c);
        }

        const now = Date.now();
        const statuses = monitors.map((m) => {
            const checks = byMonitor[m.id] ?? [];
            let upMs = 0, totalMs = 0;
            for (let i = 0; i < checks.length; i++) {
                const pStart = new Date(checks[i].startedAt).getTime();
                const pEnd   = i === 0 ? now : new Date(checks[i - 1].startedAt).getTime();
                const dur    = Math.max(0, pEnd - pStart);
                totalMs += dur;
                if (checks[i].ok) upMs += dur;
            }
            return {
                monitor:   m,
                latest:    checks[0] ?? null,
                uptimePct: totalMs > 0 ? ((upMs / totalMs) * 100).toFixed(2) : null,
                checks,      // full 20-day streak history
            };
        });

        // Overall system status
        const anyDown    = statuses.some((s) => s.latest && !s.latest.ok);
        const anyPending = statuses.every((s) => !s.latest);
        const systemStatus = anyPending ? 'pending'
            : anyDown      ? 'degraded'
            : 'operational';

        res.json({ workspace, statuses, systemStatus });
    } catch (err) {
        console.error('publicStatus error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { publicStatus };
