const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { login, changePassword } = require('../controllers/authController');
const v = require('../middleware/validation');

router.post('/login', v.validateLogin, login);
router.put('/change-password', verifyToken, v.validateChangePassword, changePassword);

module.exports = router;
