const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const { validateIdParam } = require('../validators/common');
const v = require('../validators/admin.validators');
const employees = require('../controllers/employee.controller');
const branches = require('../controllers/branch.controller');
const reports = require('../controllers/report.controller');

const router = Router();

router.use(authorize('Admin'));

router.post('/register', v.validateEmployeeRegistration, employees.register);
router.get('/users', employees.list);
router.put('/users/:id', v.validateEmployeeUpdate, employees.update);
router.patch('/users/:id/status', v.validateUserStatus, employees.setStatus);
router.delete('/users/:id', validateIdParam('id', 'User ID'), employees.deactivate);

router.get('/branches', branches.list);
router.post('/branches', v.validateBranch, branches.create);
router.put('/branches/:id', v.validateBranchUpdate, branches.update);
router.delete('/branches/:id', validateIdParam('id', 'Branch ID'), branches.remove);

router.get('/reports/agent-transactions', v.validateDateRange, reports.agentTransactions);
router.get('/reports/account-summaries', v.validateDateRange, reports.accountSummaries);
router.get('/reports/active-fds', reports.activeFixedDeposits);
router.get('/reports/interest-summary', v.validateInterestSummary, reports.interestSummary);
router.get('/reports/customer-activity', v.validateDateRange, reports.customerActivity);

router.get('/savings-interest/summary', reports.savingsInterestSummary);
router.get('/fd-interest/summary', reports.fdInterestSummary);

module.exports = router;
