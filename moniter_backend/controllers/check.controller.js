/**
 * controllers/check.controller.js
 *
 * Handlers for reading monitor check history and triggering manual checks.
 *
 * Each MonitorCheck row represents a *streak* of the same status (up/down).
 * Duration-weighted uptime is calculated from streak start/end times rather
 * than simple pass/fail counts.
 */

const prisma     = require('../lib/prisma');
const { runCheck } = require('../lib/checker');

const HISTORY_DAYS = 20;   // used for detail page / listChecks
const STATUS_DAYS  = 7;    // used for dashboard status cards (lighter query)

/**
 * Verify that the workspace belongs to the authenticated user
 * AND that the monitor belongs to that workspace.
 */
const assertOwnership = async (res, workspaceId, monitorId, userId) => {
    const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, userId },
    });
    if (!workspace) {
        res.status(404).json({ error: 'Workspace not found' });
        return null;
    }
    const monitor = await prisma.monitor.findFirst({
        where: { id: monitorId, workspaceId },
    });
    if (!monitor) {
        res.status(404).json({ error: 'Monitor not found' });
        return null;
    }
    return monitor;
};

/**
 * GET /api/workspaces/:workspaceId/monitors/:id/checks
 * Returns all streak records for the last 20 days (newest first).
 * Each record = one continuous up/down period.
 */
const listChecks = async (req, res) => {
    try {
        const { workspaceId, id } = req.params;

        const monitor = await assertOwnership(res, workspaceId, id, req.user.id);
        if (!monitor) return;

        const cutoff = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
        const checks = await prisma.monitorCheck.findMany({
            where: { monitorId: id, startedAt: { gte: cutoff } },
            orderBy: { startedAt: 'desc' },
            select: {
                id:         true,
                ok:         true,
                statusCode: true,
                responseMs: true,
                error:      true,
                startedAt:  true,
                checkedAt:  true,
                checkCount: true,
            },
        });

        // Duration-weighted uptime (each streak weighted by its time span)
        const now = Date.now();
        let upMs = 0, totalMs = 0;
        for (let i = 0; i < checks.length; i++) {
            const start = new Date(checks[i].startedAt).getTime();
            const end   = i === 0 ? now : new Date(checks[i - 1].startedAt).getTime();
            const dur   = Math.max(0, end - start);
            totalMs += dur;
            if (checks[i].ok) upMs += dur;
        }
        const uptimePct   = totalMs > 0 ? ((upMs / totalMs) * 100).toFixed(2) : null;
        const totalChecks = checks.reduce((s, c) => s + c.checkCount, 0);

        res.json({ checks, latest: checks[0] ?? null, uptimePct, total: totalChecks });
    } catch (err) {
        console.error('listChecks error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/workspaces/:workspaceId/monitors/:id/checks
 * Trigger an immediate manual check.
 */
const triggerCheck = async (req, res) => {
    try {
        const { workspaceId, id } = req.params;

        const monitor = await assertOwnership(res, workspaceId, id, req.user.id);
        if (!monitor) return;

        if (monitor.paused) {
            return res.status(400).json({ error: 'Monitor is paused. Resume it first.' });
        }

        const check = await runCheck(monitor);
        res.json({ check });
    } catch (err) {
        console.error('triggerCheck error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/workspaces/:workspaceId/monitors/status
 * Returns latest streak + duration-weighted uptime for ALL monitors in one
 * batch query (no N+1).
 */
const bulkStatus = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const workspace = await prisma.workspace.findFirst({
            where: { id: workspaceId, userId: req.user.id },
        });
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        const monitors = await prisma.monitor.findMany({
            where: { workspaceId },
            select: { id: true },
        });

        if (monitors.length === 0) return res.json({ status: {} });

        const monitorIds = monitors.map((m) => m.id);
        // Use a shorter window for the status dashboard (lighter query).
        // Full 20-day history is available on the detail page via listChecks.
        const cutoff = new Date(Date.now() - STATUS_DAYS * 24 * 60 * 60 * 1000);

        // Single query for all monitors; Prisma translates to one SQL IN() call.
        // Row cap: prevents pathological monitors with thousands of streak changes
        // from blowing up this response. 40 streaks × N monitors is an upper bound.
        const rowCap  = Math.min(monitorIds.length * 40, 8_000);
        const allChecks = await prisma.monitorCheck.findMany({
            where: { monitorId: { in: monitorIds }, startedAt: { gte: cutoff } },
            orderBy: { startedAt: 'desc' },
            take: rowCap,
            select: {
                id: true, monitorId: true, ok: true,
                statusCode: true, responseMs: true, error: true,
                startedAt: true, checkedAt: true, checkCount: true,
            },
        });

        // Group by monitorId
        const byMonitor = {};
        for (const c of allChecks) {
            if (!byMonitor[c.monitorId]) byMonitor[c.monitorId] = [];
            byMonitor[c.monitorId].push(c);
        }

        const now = Date.now();
        const results = monitors.map(({ id }) => {
            const checks = byMonitor[id] ?? [];
            let upMs = 0, totalMs = 0;
            for (let i = 0; i < checks.length; i++) {
                const start = new Date(checks[i].startedAt).getTime();
                const end   = i === 0 ? now : new Date(checks[i - 1].startedAt).getTime();
                const dur   = Math.max(0, end - start);
                totalMs += dur;
                if (checks[i].ok) upMs += dur;
            }
            return {
                monitorId: id,
                latest:    checks[0] ?? null,
                uptimePct: totalMs > 0 ? ((upMs / totalMs) * 100).toFixed(2) : null,
            };
        });

        const statusMap = Object.fromEntries(results.map((r) => [r.monitorId, r]));
        res.json({ status: statusMap });
    } catch (err) {
        console.error('bulkStatus error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { listChecks, triggerCheck, bulkStatus };
