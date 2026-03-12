require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const monitorRoutes = require('./routes/monitor.routes');
const checkRoutes = require('./routes/check.routes');
const publicRoutes = require('./routes/public.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const incidentRoutes = require('./routes/incident.routes');
const slackRoutes = require('./routes/slack.routes');

const { startScheduler } = require('./lib/scheduler');

// ── Startup guard ─────────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
    console.error('[startup] FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow all origins. `origin: true` reflects the request Origin back which
// is required when `credentials: true` (wildcard '*' is not allowed by browsers
// when sending cookies / Authorization headers).
app.use(cors({
    origin: true,
    credentials: true,
}));

// ── Body / cookie parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Public status page: 60 req/min per IP
const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests.' },
});

app.use('/api', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspaceId/monitors', checkRoutes);
app.use('/api/workspaces/:workspaceId/monitors', monitorRoutes);
app.use('/api/workspaces/:workspaceId/incidents', incidentRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicLimiter, publicRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Monitor API Backend!' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startScheduler();
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
    console.log(`[shutdown] ${signal} received — closing server gracefully`);
    server.close(() => {
        console.log('[shutdown] HTTP server closed');
        process.exit(0);
    });
    // Force-exit after 10 s if connections are still open
    setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

