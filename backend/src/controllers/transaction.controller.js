const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const transactionService = require('../services/transaction.service');

const processTransaction = asyncHandler(async (req, res) => {
  const result = await transactionService.processTransaction(req.user.id, req.body);
  created(res, { message: 'Transaction processed successfully', ...result });
});

const listRecent = asyncHandler(async (req, res) => {
  ok(res, { transactions: await transactionService.listRecent() });
});

const listByAgent = asyncHandler(async (req, res) => {
  ok(res, { transactions: await transactionService.listByEmployee(req.params.agentId) });
});

module.exports = { processTransaction, listRecent, listByAgent };
