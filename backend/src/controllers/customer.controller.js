const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const customerService = require('../services/customer.service');

const register = asyncHandler(async (req, res) => {
  const customerId = await customerService.register(req.body);
  created(res, { message: 'Customer registered successfully', customer_id: customerId });
});

const list = asyncHandler(async (req, res) => {
  ok(res, { customers: await customerService.list() });
});

const getByNic = asyncHandler(async (req, res) => {
  ok(res, { customer: await customerService.findByNic(req.params.nic) });
});

const getById = asyncHandler(async (req, res) => {
  ok(res, { customer: await customerService.findById(req.params.id) });
});

const update = asyncHandler(async (req, res) => {
  await customerService.update(req.params.id, req.body);
  ok(res, { message: 'Customer updated successfully' });
});

const updateContact = asyncHandler(async (req, res) => {
  await customerService.updateContactDetails(req.params.id, req.body);
  ok(res, { message: 'Customer contact updated successfully' });
});

module.exports = { register, list, getByNic, getById, update, updateContact };
