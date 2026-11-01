const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const accountService = require('../services/account.service');

const open = asyncHandler(async (req, res) => {
  const account = await accountService.open(req.user.id, req.body);
  created(res, { message: 'Account created successfully', ...account });
});

const listActive = asyncHandler(async (req, res) => {
  ok(res, { accounts: await accountService.listActive() });
});

const listAll = asyncHandler(async (req, res) => {
  ok(res, { accounts: await accountService.listAll() });
});

const listEligibleForFd = asyncHandler(async (req, res) => {
  ok(res, { accounts: await accountService.listEligibleForFd() });
});

const search = asyncHandler(async (req, res) => {
  ok(res, { accounts: await accountService.search(req.params.searchTerm) });
});

const listByHolderNic = asyncHandler(async (req, res) => {
  ok(res, { accounts: await accountService.listByHolderNic(req.params.nic) });
});

const getDetails = asyncHandler(async (req, res) => {
  ok(res, { account: await accountService.getDetails(req.params.id) });
});

const changePlan = asyncHandler(async (req, res) => {
  const newPlan = await accountService.changePlan(req.user.id, req.body);
  ok(res, { message: 'Plan changed successfully', new_plan: newPlan });
});

const close = asyncHandler(async (req, res) => {
  const result = await accountService.close(req.user.id, req.body);
  const amount = result.withdrawal_amount;
  ok(res, {
    message: amount > 0
      ? `Account deactivated successfully. Full balance of LKR ${amount.toLocaleString()} withdrawn and account closed.`
      : 'Account deactivated successfully. Account closed with zero balance.',
    ...result,
  });
});

module.exports = { open, listActive, listAll, listEligibleForFd, search, listByHolderNic, getDetails, changePlan, close };
