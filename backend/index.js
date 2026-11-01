require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Copy .env.example to .env and set it.');
  process.exit(1);
}

const app = require('./app');
const pool = require('./config/database');
const { testConnection } = require('./config/database');
const { startInterestSchedulers } = require('./schedulers/interestScheduler');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log('='.repeat(60));
  console.log('🚀 B-Trust Microbanking System API Server');
  console.log('='.repeat(60));
  console.log(`📍 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed. Check the PG* settings in .env');
  }

  try {
    startInterestSchedulers();
    console.log('✅ Interest schedulers initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize interest schedulers:', error.message);
  }

  console.log('='.repeat(60));
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
