const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const v = require('../validators/auth.validators');
const auth = require('../controllers/auth.controller');

const router = Router();

router.post('/login', loginLimiter, v.validateLogin, auth.login);
router.put('/change-password', verifyToken, v.validateChangePassword, auth.changePassword);

module.exports = router;
