/**
 * lib/notifier.js
 *
 * Sends Slack notifications when a monitor goes DOWN or recovers UP.
 * Uses the per-workspace Incoming Webhook URL obtained via OAuth.
 */

const fetch = require('node-fetch');

/**
 * Format milliseconds into a human-readable duration string.
 * e.g. 375000 → "6 minutes 15 seconds"
 */
function formatDuration(ms) {
    if (!ms) return 'unknown';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    return parts.join(' ');
}

/**
 * Send a Slack message to a workspace's configured webhook.
 *
 * @param {string} webhookUrl  – the workspace's Slack Incoming Webhook URL
 * @param {object} payload     – Slack message payload (blocks/text)
 */
async function sendSlackMessage(webhookUrl, payload) {
    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            console.error(`[notifier] Slack webhook error ${res.status}: ${text}`);
        }
    } catch (err) {
        console.error('[notifier] Failed to send Slack message:', err.message);
    }
}

/**
 * Notify Slack that a monitor went DOWN (incident opened).
 *
 * @param {string} webhookUrl
 * @param {object} monitor    – { name, url }
 * @param {object} incident   – { startedAt }
 * @param {string} error      – error message from the check
 */
async function notifyDown(webhookUrl, monitor, incident, error) {
    if (!webhookUrl) return;

    const startedAt = new Date(incident.startedAt).toLocaleString('en-US', {
        dateStyle: 'medium', timeStyle: 'short',
    });

    await sendSlackMessage(webhookUrl, {
        blocks: [
            {
                type: 'header',
                text: { type: 'plain_text', text: '🔴 Monitor Down', emoji: true },
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Monitor:*\n${monitor.name}` },
                    { type: 'mrkdwn', text: `*URL:*\n${monitor.url}` },
                    { type: 'mrkdwn', text: `*Started at:*\n${startedAt}` },
                    { type: 'mrkdwn', text: `*Error:*\n${error || 'Unknown error'}` },
                ],
            },
            {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: 'Incident opened automatically. You will be notified when it recovers.' }],
            },
        ],
    });
}

/**
 * Notify Slack that a monitor recovered (incident resolved).
 *
 * @param {string} webhookUrl
 * @param {object} monitor    – { name, url }
 * @param {object} incident   – { startedAt, resolvedAt, durationMs }
 */
async function notifyUp(webhookUrl, monitor, incident) {
    if (!webhookUrl) return;

    const resolvedAt = new Date(incident.resolvedAt).toLocaleString('en-US', {
        dateStyle: 'medium', timeStyle: 'short',
    });

    await sendSlackMessage(webhookUrl, {
        blocks: [
            {
                type: 'header',
                text: { type: 'plain_text', text: '✅ Monitor Recovered', emoji: true },
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Monitor:*\n${monitor.name}` },
                    { type: 'mrkdwn', text: `*URL:*\n${monitor.url}` },
                    { type: 'mrkdwn', text: `*Resolved at:*\n${resolvedAt}` },
                    { type: 'mrkdwn', text: `*Total downtime:*\n${formatDuration(incident.durationMs)}` },
                ],
            },
            {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: 'Incident resolved automatically.' }],
            },
        ],
    });
}

module.exports = { notifyDown, notifyUp };
