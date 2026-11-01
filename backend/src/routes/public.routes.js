const { Router } = require('express');
const reference = require('../controllers/reference.controller');

const router = Router();

router.get('/saving-plans', reference.savingPlans);
router.get('/branches', reference.branches);
router.get('/fd-plans', reference.fdPlans);
router.get('/about', reference.about);

module.exports = router;
