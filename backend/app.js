const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agent');
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/manager');
const publicRoutes = require('./routes/public');
const { verifyToken } = require('./middleware/auth');

const app = express();

// Behind a reverse proxy (nginx in docker-compose) the client IP comes from X-Forwarded-For;
// the rate limiter needs it to tell users apart
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.SUPPRESS_GENERAL_LOGS !== '1' && process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT || 10),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts. Please try again in 15 minutes.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);

app.use('/api/agent', verifyToken, agentRoutes);
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/manager', verifyToken, managerRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'B-Trust Microbanking System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'error', message: 'Request body is not valid JSON' });
  }
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.status ? err.message : 'Internal server error',
  });
});

module.exports = app;
