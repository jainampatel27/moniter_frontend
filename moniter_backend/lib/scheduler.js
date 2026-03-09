/**
 * lib/scheduler.js
 *
 * Global cron scheduler for monitor checks.
 *
 * Strategy:
 *   - A single cron "tick" fires every minute  (* * * * *)
 *   - Each tick, we load all non-paused monitors from the DB
 *   - For every monitor we check whether enough time has passed
 *     since its last run:  (now - lastCheckedAt) >= interval_minutes * 60s
 *   - Monitors that have never been checked (lastCheckedAt = null) run immediately
 *   - Checks run concurrently per tick but we don't await cross-tick
 *
 * Hot-reload helpers (scheduleImmediately, cancelMonitor) are exported so
 * the monitor controller can trigger a check right after creation.
 */

const cron = require('node-cron');
const prisma  = require('./prisma');
const { runCheck } = require('./checker');

// Max simultaneous outbound checks per tick.
// At 2000 monitors, firing all at once saturates OS file descriptors and
// exhausts the DB connection pool.  50 concurrent = safe ceiling.
const CONCURRENCY = 50;

/**
 * Run fn(item) for each item, at most CONCURRENCY at a time.
 * Behaves like Promise.allSettled but with a sliding window.
 */
async function runBatched(items, fn) {
    for (let i = 0; i < items.length; i += CONCURRENCY) {
        await Promise.allSettled(items.slice(i, i + CONCURRENCY).map(fn));
    }
}

// Track which monitorIds are currently being checked to avoid overlap
const inFlight = new Set();

/**
 * Decide if a monitor is due for a check right now.
 * @param {object} monitor
 * @returns {boolean}
 */
function isDue(monitor) {
    if (!monitor.lastCheckedAt) return true; // never checked
    const elapsedMs = Date.now() - new Date(monitor.lastCheckedAt).getTime();
    return elapsedMs >= monitor.interval * 60 * 1000;
}

/**
 * Run a check for a monitor, guarded against concurrent runs.
 */
async function safeRun(monitor) {
    if (inFlight.has(monitor.id)) return;
    inFlight.add(monitor.id);
    try {
        await runCheck(monitor);
    } catch (err) {
        console.error(`[scheduler] check failed for monitor ${monitor.id}:`, err.message);
    } finally {
        inFlight.delete(monitor.id);
    }
}

/**
 * The main per-minute tick.
 */
async function tick() {
    try {
        const monitors = await prisma.monitor.findMany({
            where: { paused: false },
        });

        const due = monitors.filter(isDue);
        if (due.length === 0) return;

        console.log(`[scheduler] tick: ${due.length} monitor(s) due`);

        // Run in batches of CONCURRENCY (not all at once) to protect the
        // outbound connection limit and the DB connection pool.
        await runBatched(due, safeRun);

    } catch (err) {
        console.error('[scheduler] tick error:', err.message);
    }
}

/**
 * Run a single monitor immediately (used on create/unpause).
 * @param {string} monitorId
 */
async function scheduleImmediately(monitorId) {
    try {
        const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
        if (!monitor || monitor.paused) return;
        await safeRun(monitor);
    } catch (err) {
        console.error(`[scheduler] immediate check failed for ${monitorId}:`, err.message);
    }
}

/**
 * Delete all MonitorCheck records older than 25 days.
 * Runs once at startup (to catch any missed days) and then daily at midnight.
 */
async function pruneOldChecks() {
    try {
        const cutoff = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);
        const { count } = await prisma.monitorCheck.deleteMany({
            where: { startedAt: { lt: cutoff } },
        });
        if (count > 0) console.log(`[scheduler] daily prune: deleted ${count} check record(s) older than 25 days`);
    } catch (err) {
        console.error('[scheduler] daily prune error:', err.message);
    }
}

/**
 * Start the global cron scheduler.
 * Should be called once at server startup.
 */
function startScheduler() {
    // Run once immediately on startup to check any overdue monitors
    tick();

    // Then tick every minute
    cron.schedule('* * * * *', tick);

    // Daily cleanup at midnight — removes checks older than 25 days
    pruneOldChecks();
    cron.schedule('0 0 * * *', pruneOldChecks);

    console.log('[scheduler] started — ticking every minute, pruning daily at midnight');
}

module.exports = { startScheduler, scheduleImmediately };
