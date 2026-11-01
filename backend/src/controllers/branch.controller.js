const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const branchService = require('../services/branch.service');

const list = asyncHandler(async (req, res) => {
  ok(res, { branches: await branchService.list() });
});

const create = asyncHandler(async (req, res) => {
  const branchId = await branchService.create(req.body);
  created(res, { message: 'Branch created successfully', branch_id: branchId });
});

const update = asyncHandler(async (req, res) => {
  await branchService.update(req.params.id, req.body);
  ok(res, { message: 'Branch updated successfully' });
});

const remove = asyncHandler(async (req, res) => {
  await branchService.remove(req.params.id);
  ok(res, { message: 'Branch deleted successfully' });
});

module.exports = { list, create, update, remove };
