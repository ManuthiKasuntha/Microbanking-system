const { Pool } = require('pg');
const config = require('../config/env');

const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.database,
  password: config.db.password,
  port: config.db.port,
  // SSL only for hosted databases (e.g. Railway)
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

pool.on('error', (err) => {
  console.error('💥 Unexpected error on idle client', err);
});

const testConnection = async (retries = 5, delay = 10000) => {
  console.log('🔌 Testing database connection...');
  console.log('📊 Connection details:', {
    host: config.db.host,
    database: config.db.database,
    user: config.db.user,
    port: config.db.port,
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query('SELECT version()');
      console.log('✅ Connected to PostgreSQL database');
      console.log('📋 PostgreSQL Version:', result.rows[0].version);
      return true;
    } catch (err) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, err.message);
      if (attempt < retries) {
        console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  console.error('💥 All connection attempts failed. Check your environment variables and network connection');
  return false;
};

module.exports = { pool, testConnection };
