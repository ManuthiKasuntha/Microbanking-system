const { Router } = require('express');
const config = require('../config/env');
const { verifyToken } = require('../middleware/auth');

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'B-Trust Microbanking System API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/public', require('./public.routes'));

// Everything below needs a valid JWT; each router then checks the role
router.use('/agent', verifyToken, require('./agent.routes'));
router.use('/admin', verifyToken, require('./admin.routes'));
router.use('/manager', verifyToken, require('./manager.routes'));

module.exports = router;
