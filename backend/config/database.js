const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
  // SSL only for hosted databases (e.g. Railway)
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

const testConnection = async (retries = 5, delay = 10000) => {
  console.log('🔌 Testing database connection...');
  console.log('📊 Connection details:', {
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    port: process.env.PGPORT || 5432
  });
  
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT version()');
      console.log('✅ Connected to PostgreSQL database');
      console.log('📋 PostgreSQL Version:', result.rows[0].version);
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, err.message);
      
      if (i < retries - 1) {
        console.log(`🔄 Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💥 All connection attempts failed');
        console.error('🔧 Check your environment variables and network connection');
        return false;
      }
    }
  }
};


pool.on('error', (err) => {
  console.error('💥 Unexpected error on idle client', err);
});

module.exports = pool;
module.exports.testConnection = testConnection;
