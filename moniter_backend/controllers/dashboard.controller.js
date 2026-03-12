/**
 * controllers/dashboard.controller.js
 *
 * GET /api/dashboard
 * Returns aggregated real-time analytics for the authenticated user:
 *   - Stat cards  (monitor counts, uptime %, avg response, incidents)
 *   - 7-day daily breakdown for charts (response time + uptime trend)
 *   - Per-monitor uptime breakdown for the bar chart
 */

const prisma = require('../lib/prisma');

const CHART_DAYS = 7;

/**
 * Build an array of the last N calendar-day labels in YYYY-MM-DD format,
 * oldest first.
 */
function lastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        d.setUTCDate(d.getUTCDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
}

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // ── 1. Load all workspaces for this user ─────────────────────────────
        const workspaces = await prisma.workspace.findMany({
            where: { userId },
            select: { id: true },
        });
        const workspaceIds = workspaces.map((w) => w.id);

        if (workspaceIds.length === 0) {
            return res.json({
                stats: {
                    totalWorkspaces: 0, totalMonitors: 0,
                    activeMonitors: 0, pausedMonitors: 0,
                    monitorsUp: 0, monitorsDown: 0,
                    overallUptimePct: null, avgResponseMs: null,
                    incidentsLast7d: 0,
                },
                dailyStats: lastNDays(CHART_DAYS).map((date) => ({
                    date, avgResponseMs: null, uptimePct: null, checksRan: 0,
                })),
                monitorBreakdown: [],
            });
        }

        // ── 2. Load all monitors ──────────────────────────────────────────────
        const monitors = await prisma.monitor.findMany({
            where: { workspaceId: { in: workspaceIds } },
            select: { id: true, name: true, paused: true },
        });

        const monitorIds = monitors.map((m) => m.id);
        const activeMonitors = monitors.filter((m) => !m.paused);
        const pausedMonitors = monitors.filter((m) => m.paused);

        // ── 3. Fetch 7-day streak history for all monitors ───────────────────
        const cutoff = new Date(Date.now() - CHART_DAYS * 24 * 60 * 60 * 1000);
        const allChecks = monitorIds.length === 0 ? [] : await prisma.monitorCheck.findMany({
            where: { monitorId: { in: monitorIds }, startedAt: { gte: cutoff } },
            orderBy: { startedAt: 'desc' },
            take: Math.min(monitorIds.length * 40, 8_000),
            select: {
                monitorId: true, ok: true, responseMs: true, startedAt: true,
                checkedAt: true, checkCount: true, error: true,
            },
        });

        // ── 4. Overall stats ─────────────────────────────────────────────────
        // Group by monitor to find latest streak per monitor
        const byMonitor = {};
        for (const c of allChecks) {
            if (!byMonitor[c.monitorId]) byMonitor[c.monitorId] = [];
            byMonitor[c.monitorId].push(c);
        }

        let monitorsUp = 0, monitorsDown = 0;
        let totalUpMs = 0, totalMs = 0;
        let responseMsSum = 0, responseMsCount = 0;

        const now = Date.now();

        const monitorBreakdown = monitors.map((m) => {
            const checks = byMonitor[m.id] ?? [];
            const latest = checks[0] ?? null;

            if (!m.paused && latest) {
                latest.ok ? monitorsUp++ : monitorsDown++;
            }

            // Duration-weighted uptime per monitor
            let upMs = 0, mTotalMs = 0;
            for (let i = 0; i < checks.length; i++) {
                const start = new Date(checks[i].startedAt).getTime();
                const end = i === 0 ? now : new Date(checks[i - 1].startedAt).getTime();
                const dur = Math.max(0, end - start);
                mTotalMs += dur;
                if (checks[i].ok) upMs += dur;
                if (checks[i].responseMs) {
                    responseMsSum += checks[i].responseMs * checks[i].checkCount;
                    responseMsCount += checks[i].checkCount;
                }
            }
            totalUpMs += upMs;
            totalMs += mTotalMs;

            return {
                id: m.id,
                name: m.name,
                paused: m.paused,
                status: m.paused ? 'paused' : (latest ? (latest.ok ? 'up' : 'down') : 'pending'),
                uptimePct: mTotalMs > 0 ? ((upMs / mTotalMs) * 100).toFixed(2) : null,
                avgResponseMs: null, // filled below per-monitor if needed
            };
        });

        const overallUptimePct = totalMs > 0
            ? ((totalUpMs / totalMs) * 100).toFixed(2)
            : null;
        const avgResponseMs = responseMsCount > 0
            ? Math.round(responseMsSum / responseMsCount)
            : null;

        // Real incidents from the Incident table
        const incidentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [incidentsLast7d, openIncidents] = monitorIds.length === 0
            ? [0, 0]
            : await Promise.all([
                prisma.incident.count({
                    where: { monitorId: { in: monitorIds }, startedAt: { gte: incidentCutoff } },
                }),
                prisma.incident.count({
                    where: { monitorId: { in: monitorIds }, status: 'OPEN' },
                }),
            ]);

        // ── 5. Daily breakdown for chart ─────────────────────────────────────
        // For each calendar day, collect all streak segments that overlap it
        const days = lastNDays(CHART_DAYS);

        const dailyStats = days.map((dateStr) => {
            const dayStart = new Date(dateStr + 'T00:00:00.000Z').getTime();
            const dayEnd = dayStart + 86_400_000;

            let dayUpMs = 0, dayTotalMs = 0;
            let dayRespSum = 0, dayRespCount = 0;
            let checksRan = 0;

            for (const monId of monitorIds) {
                const checks = byMonitor[monId] ?? [];
                const reversed = [...checks].reverse(); // oldest → newest

                for (let i = 0; i < reversed.length; i++) {
                    const segStart = new Date(reversed[i].startedAt).getTime();
                    const segEnd = i === reversed.length - 1
                        ? now
                        : new Date(reversed[i + 1].startedAt).getTime();

                    // Clip to the calendar day
                    const overlapStart = Math.max(segStart, dayStart);
                    const overlapEnd = Math.min(segEnd, dayEnd);
                    if (overlapEnd <= overlapStart) continue;

                    const dur = overlapEnd - overlapStart;
                    dayTotalMs += dur;
                    if (reversed[i].ok) dayUpMs += dur;

                    if (reversed[i].responseMs) {
                        // Weight by checkCount proportionally in this segment
                        const fraction = dur / Math.max(segEnd - segStart, 1);
                        const countInDay = Math.round(reversed[i].checkCount * fraction);
                        dayRespSum += reversed[i].responseMs * countInDay;
                        dayRespCount += countInDay;
                    }
                    checksRan += reversed[i].checkCount;
                }
            }

            return {
                date: dateStr,
                label: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
                uptimePct: dayTotalMs > 0 ? parseFloat(((dayUpMs / dayTotalMs) * 100).toFixed(2)) : null,
                avgResponseMs: dayRespCount > 0 ? Math.round(dayRespSum / dayRespCount) : null,
                checksRan,
            };
        });

        res.json({
            stats: {
                totalWorkspaces: workspaces.length,
                totalMonitors: monitors.length,
                activeMonitors: activeMonitors.length,
                pausedMonitors: pausedMonitors.length,
                monitorsUp,
                monitorsDown,
                overallUptimePct,
                avgResponseMs,
                incidentsLast7d,
                openIncidents,
            },
            dailyStats,
            monitorBreakdown,
        });
    } catch (err) {
        console.error('getDashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getDashboard };
