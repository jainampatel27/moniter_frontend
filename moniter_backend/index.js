require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const cookieParser = require('cookie-parser');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const authRoutes      = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const monitorRoutes   = require('./routes/monitor.routes');
const checkRoutes     = require('./routes/check.routes');
const publicRoutes    = require('./routes/public.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const { startScheduler } = require('./lib/scheduler');

// ── Startup guard ─────────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
    console.error('[startup] FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}

const app  = express();
const port = process.env.PORT || 3000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// Set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com in .env
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, cb) => {
        // Allow server-to-server / curl requests (no Origin header)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
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
// Check routes must be mounted BEFORE monitor routes so GET /status is not
// swallowed by the generic GET /:id route in monitorRoutes.
app.use('/api/workspaces/:workspaceId/monitors', checkRoutes);
app.use('/api/workspaces/:workspaceId/monitors', monitorRoutes);
app.use('/api/dashboard', dashboardRoutes);
// Public (no-auth) routes
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
process.on('SIGINT',  () => shutdown('SIGINT'));

