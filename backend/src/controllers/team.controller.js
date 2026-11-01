const asyncHandler = require('../utils/asyncHandler');
const { badRequest } = require('../errors/AppError');
const { ok } = require('../utils/respond');
const teamService = require('../services/team.service');

const searchCustomers = asyncHandler(async (req, res) => {
  const term = String(req.query.query || '').trim();
  if (!term) throw badRequest('Search query is required');
  ok(res, { customers: await teamService.searchCustomers(req.user.id, term) });
});

const customersByNic = asyncHandler(async (req, res) => {
  ok(res, { customers: await teamService.findCustomersByNic(req.user.id, req.params.nic) });
});

const agents = asyncHandler(async (req, res) => {
  ok(res, await teamService.listAgentsWithPerformance(req.user.id));
});

const branchTransactions = asyncHandler(async (req, res) => {
  ok(res, await teamService.branchTransactions(req.user.id, req.query.start, req.query.end));
});

const branchAccounts = asyncHandler(async (req, res) => {
  ok(res, await teamService.branchAccounts(req.user.id));
});

module.exports = { searchCustomers, customersByNic, agents, branchTransactions, branchAccounts };
