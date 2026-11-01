require('dotenv').config();

const toList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

// Values are read on access so tests can adjust process.env after this module is loaded
const config = {
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get port() {
    return Number(process.env.PORT) || 5000;
  },
  get jwtSecret() {
    return process.env.JWT_SECRET;
  },
  jwtExpiresIn: '1h',
  get corsOrigins() {
    return toList(process.env.CORS_ORIGIN || 'http://localhost:3000');
  },
  get trustProxy() {
    const value = process.env.TRUST_PROXY;
    if (!value) return null;
    return Number(value) || value;
  },
  get loginRateLimit() {
    return Number(process.env.LOGIN_RATE_LIMIT || 10);
  },
  get logRequests() {
    return process.env.SUPPRESS_GENERAL_LOGS !== '1' && process.env.NODE_ENV !== 'test';
  },

  db: {
    get user() { return process.env.PGUSER; },
    get host() { return process.env.PGHOST; },
    get database() { return process.env.PGDATABASE; },
    get password() { return process.env.PGPASSWORD; },
    get port() { return Number(process.env.PGPORT) || 5432; },
    get ssl() { return process.env.PGSSL === 'true'; },
  },

  interest: {
    // Debug mode runs both jobs every 10 seconds and shortens the cycle so interest shows up in a demo
    get debug() {
      return process.env.INTEREST_CRON_DEBUG === '1';
    },
    get cycle() {
      return process.env.INTEREST_CYCLE || (this.debug ? '1 minute' : '30 days');
    },
    get fdCron() {
      return this.debug ? '*/10 * * * * *' : process.env.FD_INTEREST_CRON || '0 3 * * *';
    },
    get savingsCron() {
      return this.debug ? '*/10 * * * * *' : process.env.SAVINGS_INTEREST_CRON || '30 3 * * *';
    },
    get systemActorId() {
      return parseInt(process.env.SYSTEM_ACTOR_EMPLOYEE_ID || '1', 10);
    },
  },
};

module.exports = config;
