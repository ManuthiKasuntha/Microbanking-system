const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const referenceService = require('../services/reference.service');

const savingPlans = asyncHandler(async (req, res) => {
  ok(res, { saving_plans: await referenceService.savingPlans() });
});

const branches = asyncHandler(async (req, res) => {
  ok(res, { branches: await referenceService.branches() });
});

const fdPlans = asyncHandler(async (req, res) => {
  ok(res, { fd_plans: await referenceService.fdPlans() });
});

const about = (req, res) => ok(res, { data: referenceService.ABOUT });

module.exports = { savingPlans, branches, fdPlans, about };
