const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const employeeService = require('../services/employee.service');

const register = asyncHandler(async (req, res) => {
  const ids = await employeeService.register(req.body);
  created(res, { message: 'User created successfully', ...ids });
});

const list = asyncHandler(async (req, res) => {
  ok(res, { users: await employeeService.list() });
});

const update = asyncHandler(async (req, res) => {
  await employeeService.update(req.params.id, req.user.id, req.body);
  ok(res, { message: 'User updated successfully' });
});

const deactivate = asyncHandler(async (req, res) => {
  await employeeService.deactivate(req.params.id, req.user.id);
  ok(res, { message: 'User deactivated successfully' });
});

const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  await employeeService.setStatus(req.params.id, status, req.user.id);
  ok(res, { message: `User ${status === 'Active' ? 'activated' : 'deactivated'} successfully` });
});

module.exports = { register, list, update, deactivate, setStatus };
