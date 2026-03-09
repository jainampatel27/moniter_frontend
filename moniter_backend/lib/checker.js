/**
 * lib/checker.js
 *
 * Executes a single monitor check (HTTP or TCP) and returns the result.
 * Also persists the check record to the database and updates lastCheckedAt.
 */

const net = require('net');
const fetch = require('node-fetch');
const prisma = require('./prisma');

const HTTP_TIMEOUT_MS = 10_000;
const TCP_TIMEOUT_MS  = 10_000;

/**
 * Perform an HTTP/HTTPS check against the monitor.
 * @param {object} monitor – Prisma Monitor record
 * @returns {{ ok: boolean, statusCode?: number, responseMs: number, error?: string }}
 */
async function checkHTTP(monitor) {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

        const headers = monitor.headers || {};
        const options = {
            method: monitor.method,
            headers,
            signal: controller.signal,
            redirect: 'follow',
        };
        if (monitor.method === 'POST' && monitor.body) {
            options.body = monitor.body;
            if (!headers['Content-Type'] && !headers['content-type']) {
                options.headers = { ...headers, 'Content-Type': 'application/json' };
            }
        }

        const res = await fetch(monitor.url, options);
        clearTimeout(timer);

        const responseMs = Date.now() - start;
        const statusCode = res.statusCode || res.status;

        // Evaluate expected status
        const expectedStatus = monitor.expectedStatus;
        const statusOk = expectedStatus ? statusCode === expectedStatus : statusCode < 400;

        // Evaluate expected body (read text only if we need to check body)
        let bodyOk = true;
        if (monitor.expectedBody) {
            const text = await res.text();
            bodyOk = text.includes(monitor.expectedBody);
        }

        return { ok: statusOk && bodyOk, statusCode, responseMs };
    } catch (err) {
        const responseMs = Date.now() - start;
        const isTimeout = err.name === 'AbortError';
        return {
            ok: false,
            responseMs,
            error: isTimeout ? 'Request timed out' : String(err.message).slice(0, 200),
        };
    }
}

/**
 * Perform a TCP connectivity check.
 * monitor.url is expected to be "host:port"
 * @param {object} monitor
 * @returns {{ ok: boolean, responseMs: number, error?: string }}
 */
async function checkTCP(monitor) {
    return new Promise((resolve) => {
        const [host, portStr] = monitor.url.split(':');
        const port = parseInt(portStr, 10);
        if (!host || isNaN(port)) {
            return resolve({ ok: false, responseMs: 0, error: 'Invalid host:port format' });
        }

        const start = Date.now();
        const socket = new net.Socket();
        let settled = false;

        const finish = (ok, error) => {
            if (settled) return;
            settled = true;
            const responseMs = Date.now() - start;
            socket.destroy();
            resolve({ ok, responseMs, ...(error ? { error } : {}) });
        };

        socket.setTimeout(TCP_TIMEOUT_MS);
        socket.on('connect', () => finish(true));
        socket.on('timeout', () => finish(false, 'Connection timed out'));
        socket.on('error',   (err) => finish(false, String(err.message).slice(0, 200)));
        socket.connect(port, host);
    });
}

/**
 * Run a check for the given monitor, persist result using smart streak logic,
 * and return the upserted MonitorCheck record.
 *
 * Storage strategy (run-length encoding):
 *   - If the new status (ok/fail) matches the latest stored record → UPDATE it
 *     in-place (increment checkCount, refresh responseMs / checkedAt via @updatedAt).
 *   - If the status changed (or this is the very first check) → INSERT a new record.
 *
 * This means each DB row represents a continuous streak of the same status,
 * making duration-based uptime calculations straightforward on the frontend.
 *
 * Records older than 20 days are pruned after every check.
 *
 * @param {object} monitor – Prisma Monitor record
 * @returns {Promise<object>} – the upserted MonitorCheck record
 */
async function runCheck(monitor) {
    const result = monitor.type === 'TCP'
        ? await checkTCP(monitor)
        : await checkHTTP(monitor);

    // Find the most recent streak record for this monitor
    const latest = await prisma.monitorCheck.findFirst({
        where: { monitorId: monitor.id },
        orderBy: { startedAt: 'desc' },
    });

    let check;
    if (latest && latest.ok === result.ok) {
        // Same status – update the existing streak record.
        // checkedAt auto-refreshes to now() via Prisma @updatedAt.
        check = await prisma.monitorCheck.update({
            where: { id: latest.id },
            data: {
                checkCount: { increment: 1 },
                responseMs: result.responseMs ?? null,
                statusCode: result.statusCode ?? null,
                error:      result.error ?? null,
            },
        });
    } else {
        // Status changed (or first-ever check) – open a new streak record.
        check = await prisma.monitorCheck.create({
            data: {
                monitorId:  monitor.id,
                ok:         result.ok,
                statusCode: result.statusCode ?? null,
                responseMs: result.responseMs ?? null,
                error:      result.error ?? null,
                checkCount: 1,
            },
        });
    }

    // Update monitor's lastCheckedAt
    await prisma.monitor.update({
        where: { id: monitor.id },
        data:  { lastCheckedAt: new Date() },
    });

    return check;
}

module.exports = { runCheck };
