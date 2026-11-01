const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const authService = require('../services/auth.service');

const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.body.username, req.body.password);
  ok(res, session);
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body.current_password, req.body.new_password);
  ok(res, { message: 'Password changed successfully' });
});

module.exports = { login, changePassword };
