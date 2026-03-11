const prisma = require('../lib/prisma');
const dns = require('dns').promises;

// ── GET /api/workspaces/:id/custom-domain ─────────────────────────────────────
// Returns saved custom domain info for the workspace (owner only)
async function getCustomDomain(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const workspace = await prisma.workspace.findFirst({
            where: { id, userId },
            select: { customDomain: true, domainVerified: true },
        });
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        return res.json({
            customDomain: workspace.customDomain,
            verified: workspace.domainVerified,
        });
    } catch (err) {
        console.error('[customDomain] getCustomDomain error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// ── POST /api/workspaces/:id/custom-domain ────────────────────────────────────
// Saves (or updates) the customer's desired custom domain
async function saveCustomDomain(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ error: 'domain is required' });
    }

    // Basic format check — must look like a hostname
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
        return res.status(400).json({ error: 'Invalid domain format. Use a format like status.yourcompany.com' });
    }

    try {
        // Make sure caller owns this workspace
        const workspace = await prisma.workspace.findFirst({ where: { id, userId } });
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        // Check if another workspace already claimed this domain
        const conflict = await prisma.workspace.findFirst({
            where: { customDomain: domain, id: { not: id } },
        });
        if (conflict) {
            return res.status(409).json({ error: 'This domain is already in use by another workspace.' });
        }

        // Save it (unverified — they still need to add CNAME and verify)
        const updated = await prisma.workspace.update({
            where: { id },
            data: { customDomain: domain, domainVerified: false },
            select: { customDomain: true, domainVerified: true },
        });

        return res.json({ customDomain: updated.customDomain, verified: false });
    } catch (err) {
        console.error('[customDomain] saveCustomDomain error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// ── POST /api/workspaces/:id/custom-domain/verify ─────────────────────────────
// Checks that the customer's CNAME actually points to us
async function verifyCustomDomain(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    // The hostname that customers must CNAME to (your app's hostname)
    const appHostname = process.env.APP_HOSTNAME || 'app.neuraledgeworks.com';

    try {
        const workspace = await prisma.workspace.findFirst({
            where: { id, userId },
            select: { customDomain: true },
        });
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
        if (!workspace.customDomain) return res.status(400).json({ error: 'No custom domain saved yet' });

        const domain = workspace.customDomain;

        // DNS CNAME lookup
        let cnames = [];
        try {
            cnames = await dns.resolveCname(domain);
        } catch (dnsErr) {
            // Handle no-CNAME case vs. other errors
            if (dnsErr.code === 'ENODATA' || dnsErr.code === 'ENOTFOUND') {
                return res.status(400).json({
                    verified: false,
                    error: `No CNAME record found for "${domain}". Please add the CNAME and wait for DNS propagation.`,
                });
            }
            throw dnsErr;
        }

        const matched = cnames.some(
            (c) => c === appHostname || c === `${appHostname}.`
        );

        if (!matched) {
            return res.status(400).json({
                verified: false,
                error: `CNAME for "${domain}" points to "${cnames[0]}" but should point to "${appHostname}".`,
            });
        }

        // Mark as verified in DB
        await prisma.workspace.update({
            where: { id },
            data: { domainVerified: true },
        });

        return res.json({ verified: true });
    } catch (err) {
        console.error('[customDomain] verifyCustomDomain error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// ── DELETE /api/workspaces/:id/custom-domain ──────────────────────────────────
// Removes the custom domain from a workspace
async function removeCustomDomain(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const workspace = await prisma.workspace.findFirst({ where: { id, userId } });
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        await prisma.workspace.update({
            where: { id },
            data: { customDomain: null, domainVerified: false },
        });

        return res.json({ removed: true });
    } catch (err) {
        console.error('[customDomain] removeCustomDomain error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getCustomDomain,
    saveCustomDomain,
    verifyCustomDomain,
    removeCustomDomain,
};
