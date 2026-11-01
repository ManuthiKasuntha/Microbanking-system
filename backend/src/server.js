const config = require('./config/env');

if (!config.jwtSecret) {
  console.error('❌ JWT_SECRET is not set. Copy .env.example to .env and set it.');
  process.exit(1);
}

const app = require('./app');
const { pool, testConnection } = require('./db/pool');
const { startInterestSchedulers } = require('./jobs/interestScheduler');

const server = app.listen(config.port, async () => {
  console.log('='.repeat(60));
  console.log('🚀 B-Trust Microbanking System API Server');
  console.log(`📍 Port: ${config.port} · 🌍 Environment: ${config.nodeEnv}`);
  console.log('='.repeat(60));

  if (!(await testConnection())) {
    console.error('❌ Database connection failed. Check the PG* settings in .env');
  }

  try {
    startInterestSchedulers();
  } catch (error) {
    console.error('❌ Failed to initialize interest schedulers:', error.message);
  }
});

const shutdown = (signal) => {
  console.log(`\n👋 ${signal} received: closing HTTP server`);
  server.close(() => {
    pool.end(() => {
      console.log('💤 Database pool closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
