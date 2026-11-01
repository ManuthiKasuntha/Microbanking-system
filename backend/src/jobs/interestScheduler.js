const cron = require('node-cron');
const config = require('../config/env');
const { processDailyFDInterest, processDailySavingsInterest } = require('../services/interest.service');

const startInterestSchedulers = () => {
  const { fdCron, savingsCron, debug } = config.interest;

  // The processors report failures in their result, so a bad run never stops the schedule
  cron.schedule(fdCron, processDailyFDInterest);
  cron.schedule(savingsCron, processDailySavingsInterest);

  console.log('⏰ Interest schedulers initialized');
  if (debug) {
    console.warn('⚠️  DEBUG MODE: interest processors run every 10 seconds. Set INTEREST_CRON_DEBUG=0 in production!');
  }
  console.log(`✅ FD interest: '${fdCron}' · Savings interest: '${savingsCron}'`);
};

module.exports = { startInterestSchedulers };
