/**
 * controllers/slack.controller.js
 *
 * Handles the Slack OAuth 2.0 flow for the "Add to Slack" integration.
 *
 * Flow:
 *  1. User clicks "Add to Slack" on the frontend.
 *  2. Frontend redirects to GET /api/slack/install?workspaceId=xxx
 *  3. Backend builds the Slack OAuth URL and redirects the browser to Slack.
 *  4. User authorises in Slack, picks a channel.
 *  5. Slack redirects to GET /api/slack/callback?code=xxx&state=workspaceId
 *  6. Backend exchanges code for token, stores webhookUrl + channel on workspace.
 *  7. Backend redirects browser to the frontend success page.
 */

const fetch = require('node-fetch');
const prisma = require('../lib/prisma');

const {
    SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET,
    SLACK_REDIRECT_URI,
    FRONTEND_URL = 'http://localhost:3000',
} = process.env;

/**
 * GET /api/slack/install?workspaceId=xxx
 *
 * Redirects the user to Slack's OAuth authorisation page.
 * We encode the workspaceId in the `state` param so we can
 * retrieve it in the callback.
 */
const install = (req, res) => {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const params = new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        scope: 'incoming-webhook',
        redirect_uri: SLACK_REDIRECT_URI,
        state: workspaceId,          // passed back in callback
    });

    res.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
};

/**
 * GET /api/slack/callback?code=xxx&state=workspaceId
 *
 * Slack calls this URL after the user authorises (or cancels).
 * - Exchanges the short-lived `code` for an access token.
 * - Saves the incoming_webhook URL + channel to the workspace.
 * - Redirects the user back to the frontend.
 */
const callback = async (req, res) => {
    const { code, state: workspaceId, error } = req.query;

    // User cancelled the authorisation
    if (error) {
        return res.redirect(`${FRONTEND_URL}/workspace/${workspaceId}/settings?slack=cancelled`);
    }

    if (!code || !workspaceId) {
        return res.status(400).json({ error: 'Missing code or state' });
    }

    try {
        // Exchange code for access token
        const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                code,
                redirect_uri: SLACK_REDIRECT_URI,
            }),
        });

        const data = await tokenRes.json();

        if (!data.ok) {
            console.error('[slack] oauth.v2.access error:', data.error);
            return res.redirect(`${FRONTEND_URL}/workspace/${workspaceId}/settings?slack=error&reason=${data.error}`);
        }

        // data.incoming_webhook.url     – webhook URL to POST messages to
        // data.incoming_webhook.channel – channel name e.g. #alerts
        const webhookUrl = data.incoming_webhook?.url;
        const channel = data.incoming_webhook?.channel;

        if (!webhookUrl) {
            return res.redirect(`${FRONTEND_URL}/workspace/${workspaceId}/settings?slack=error&reason=no_webhook`);
        }

        // Persist to workspace
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { slackWebhookUrl: webhookUrl, slackChannel: channel },
        });

        console.log(`[slack] connected workspace ${workspaceId} → ${channel}`);

        // Redirect back to frontend with success flag
        res.redirect(`${FRONTEND_URL}/workspace/${workspaceId}/settings?slack=connected&channel=${encodeURIComponent(channel)}`);
    } catch (err) {
        console.error('[slack] callback error:', err.message);
        res.redirect(`${FRONTEND_URL}/workspace/${workspaceId}/settings?slack=error&reason=server_error`);
    }
};

/**
 * DELETE /api/slack/disconnect
 * Body: { workspaceId }
 *
 * Removes the stored Slack webhook from the workspace (authenticated).
 */
const disconnect = async (req, res) => {
    try {
        const { workspaceId } = req.body;
        if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

        // Verify ownership
        const workspace = await prisma.workspace.findFirst({
            where: { id: workspaceId, userId: req.user.id },
        });
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { slackWebhookUrl: null, slackChannel: null },
        });

        res.json({ message: 'Slack disconnected successfully' });
    } catch (err) {
        console.error('[slack] disconnect error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/slack/status?workspaceId=xxx
 *
 * Returns whether Slack is connected for a workspace (authenticated).
 */
const status = async (req, res) => {
    try {
        const { workspaceId } = req.query;
        if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

        const workspace = await prisma.workspace.findFirst({
            where: { id: workspaceId, userId: req.user.id },
            select: { slackWebhookUrl: true, slackChannel: true },
        });
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        res.json({
            connected: !!workspace.slackWebhookUrl,
            channel: workspace.slackChannel ?? null,
        });
    } catch (err) {
        console.error('[slack] status error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { install, callback, disconnect, status };
