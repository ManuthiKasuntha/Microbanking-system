const express = require('express');
const router = express.Router();
const { getSavingPlans, getBranches, getFDPlans, getAbout } = require('../controllers/publicController');

router.get('/saving-plans', getSavingPlans);

router.get('/branches', getBranches);

router.get('/fd-plans', getFDPlans);

router.get('/about', getAbout);

module.exports = router;
