const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const admin = require('../controllers/adminController');
const v = require('../middleware/validation');

// JWT is verified in app.js; this adds the role check
router.use(authorize('Admin'));

router.post('/register', v.validateEmployeeRegistration, admin.registerEmployee);
router.get('/users', admin.getUsers);
router.put('/users/:id', v.validateEmployeeUpdate, admin.updateUser);
router.patch('/users/:id/status', v.validateUserStatus, admin.updateUserStatus);
router.delete('/users/:id', v.validateIdParam('id', 'User ID'), admin.deleteUser);

router.get('/branches', admin.getBranches);
router.post('/branches', v.validateBranch, admin.createBranch);
router.put('/branches/:id', v.validateBranchUpdate, admin.updateBranch);
router.delete('/branches/:id', v.validateIdParam('id', 'Branch ID'), admin.deleteBranch);

router.get('/reports/agent-transactions', v.validateDateRange, admin.getAgentTransactionsReport);
router.get('/reports/account-summaries', v.validateDateRange, admin.getAccountSummariesReport);
router.get('/reports/active-fds', admin.getActiveFDsReport);
router.get('/reports/interest-summary', v.validateInterestSummary, admin.getInterestSummaryReport);
router.get('/reports/customer-activity', v.validateDateRange, admin.getCustomerActivityReport);

router.get('/savings-interest/summary', admin.getSavingsInterestSummary);
router.get('/fd-interest/summary', admin.getFDInterestSummary);

module.exports = router;
