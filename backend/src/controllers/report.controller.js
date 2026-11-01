const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const reportService = require('../services/report.service');
const interestService = require('../services/interest.service');

const agentTransactions = asyncHandler(async (req, res) => {
  ok(res, { data: await reportService.agentTransactions(req.query.startDate, req.query.endDate) });
});

const accountSummaries = asyncHandler(async (req, res) => {
  ok(res, { data: await reportService.accountSummaries(req.query.startDate, req.query.endDate) });
});

const activeFixedDeposits = asyncHandler(async (req, res) => {
  ok(res, { data: await reportService.activeFixedDeposits() });
});

const interestSummary = asyncHandler(async (req, res) => {
  ok(res, { data: await reportService.monthlyInterest(req.query.month, req.query.year) });
});

const customerActivity = asyncHandler(async (req, res) => {
  ok(res, { data: await reportService.customerActivity(req.query.startDate, req.query.endDate) });
});

// The interest dashboards read these objects directly, without the status envelope
const savingsInterestSummary = asyncHandler(async (req, res) => {
  res.json(await interestService.savingsSummary());
});

const fdInterestSummary = asyncHandler(async (req, res) => {
  res.json(await interestService.fdSummary());
});

module.exports = {
  agentTransactions,
  accountSummaries,
  activeFixedDeposits,
  interestSummary,
  customerActivity,
  savingsInterestSummary,
  fdInterestSummary,
};
