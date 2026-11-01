const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const analyticsService = require('../services/analytics.service');

const performance = asyncHandler(async (req, res) => {
  ok(res, { data: await analyticsService.agentPerformance(req.user.id) });
});

const transactionTypes = asyncHandler(async (req, res) => {
  ok(res, { data: await analyticsService.transactionsByPlanType(req.user.id) });
});

const transactionTrend = asyncHandler(async (req, res) => {
  ok(res, { data: await analyticsService.transactionTrend(req.user.id) });
});

module.exports = { performance, transactionTypes, transactionTrend };
