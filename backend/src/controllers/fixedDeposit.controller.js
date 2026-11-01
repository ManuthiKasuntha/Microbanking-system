const asyncHandler = require('../utils/asyncHandler');
const { badRequest } = require('../errors/AppError');
const { ok, created } = require('../utils/respond');
const fixedDepositService = require('../services/fixedDeposit.service');

const open = asyncHandler(async (req, res) => {
  const fd = await fixedDepositService.open(req.user.id, req.body);
  created(res, { message: 'Fixed Deposit created successfully', ...fd });
});

const list = asyncHandler(async (req, res) => {
  ok(res, { fixed_deposits: await fixedDepositService.list() });
});

const search = asyncHandler(async (req, res) => {
  if (!req.query.query) throw badRequest('Search query is required');
  ok(res, { fixed_deposits: await fixedDepositService.search(req.query.query) });
});

const listByHolderNic = asyncHandler(async (req, res) => {
  ok(res, { fixed_deposits: await fixedDepositService.listByHolderNic(req.params.nic) });
});

const close = asyncHandler(async (req, res) => {
  const result = await fixedDepositService.close(req.user.id, req.body.fd_id);
  ok(res, {
    message: 'Fixed deposit deactivated successfully. Principal amount returned to savings account.',
    ...result,
  });
});

module.exports = { open, list, search, listByHolderNic, close };
