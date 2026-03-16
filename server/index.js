require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security Middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── Body Parser ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Public Ping (no auth, bypasses rate limiter) ─────────────
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ── Admin routes get their own generous limiter — mounted BEFORE the global one
app.use('/api/admin',       require('./routes/admin'));

const timerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/timer', timerLimiter);

// ── Rate Limiting (all other /api/* routes) ───────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/students',    require('./routes/students'));
app.use('/api/problems',    require('./routes/problems'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/exec',        require('./routes/exec'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/timer',       require('./routes/timer'));

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── MongoDB + Start ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
let server;

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (!server) {
    process.exit(0);
    return;
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

async function checkJudge0() {
  const base = process.env.JUDGE0_URL || 'https://ce.judge0.com';
  try {
    const res = await fetch(`${base}/languages`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log('✅ Judge0 ready');
  } catch (err) {
    console.error('❌ Judge0 is DOWN — fix before starting exam', err.message);
  }
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      checkJudge0();
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
