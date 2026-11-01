const cron = require('node-cron');
const { processDailyFDInterest, processDailySavingsInterest } = require('../services/interest');

// INTEREST_CRON_DEBUG=1 runs both jobs every 10 seconds (overrides the cron env vars)
const startInterestSchedulers = () => {
  const debug = process.env.INTEREST_CRON_DEBUG === '1';

  const FD_CRON = debug ? '*/10 * * * * *' : (process.env.FD_INTEREST_CRON || '0 3 * * *');
  const SAVINGS_CRON = debug ? '*/10 * * * * *' : (process.env.SAVINGS_INTEREST_CRON || '30 3 * * *');

  cron.schedule(FD_CRON, async () => {
    try {
      await processDailyFDInterest();
    } catch (error) {
      console.error('❌ FD Interest Scheduler Error:', error);
    }
  });

  cron.schedule(SAVINGS_CRON, async () => {
    try {
      await processDailySavingsInterest();
    } catch (error) {
      console.error('❌ Savings Interest Scheduler Error:', error);
    }
  });

  console.log('');
  console.log('⏰ INTEREST SCHEDULERS INITIALIZED');
  console.log('='.repeat(60));
  if (debug) {
  console.warn('⚠️  DEBUG MODE: Interest processors set to run EVERY 10 SECONDS');
    console.warn('⚠️  Set INTEREST_CRON_DEBUG=0 in production!');
  }
  console.log(`✅ FD Interest Processor: Scheduled at '${FD_CRON}'`);
  console.log(`✅ Savings Interest Processor: Scheduled at '${SAVINGS_CRON}'`);
  console.log('='.repeat(60));
  console.log('');
};

module.exports = { startInterestSchedulers };
