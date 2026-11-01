const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const { validateIdParam, validateNicParam } = require('../validators/common');
const v = require('../validators/agent.validators');
const customers = require('../controllers/customer.controller');
const accounts = require('../controllers/account.controller');
const transactions = require('../controllers/transaction.controller');
const fixedDeposits = require('../controllers/fixedDeposit.controller');
const analytics = require('../controllers/analytics.controller');

const router = Router();

router.use(authorize('Agent', 'Admin'));

router.post('/customers/register', v.validateCustomerRegistration, customers.register);
router.get('/customers', customers.list);
router.get('/customers/by-nic/:nic', validateNicParam, customers.getByNic);
router.get('/customers/:id', validateIdParam('id', 'Customer ID'), customers.getById);
router.put('/customers/:id', v.validateCustomerUpdate, customers.update);
router.put('/customers/:id/contact', v.validateCustomerContactUpdate, customers.updateContact);

router.post('/accounts/create', v.validateAccountCreation, accounts.open);
router.get('/accounts', accounts.listActive);
router.get('/all-accounts', accounts.listAll);
router.get('/accounts-with-fd', accounts.listEligibleForFd);
router.get('/accounts/search/:searchTerm', accounts.search);
router.get('/accounts/by-nic/:nic', validateNicParam, accounts.listByHolderNic);
router.get('/accounts/:id/details', validateIdParam('id', 'Account ID'), accounts.getDetails);
router.post('/accounts/change-plan', v.validatePlanChange, accounts.changePlan);
router.post('/accounts/deactivate', v.validateAccountDeactivation, accounts.close);

router.post('/transactions/process', v.validateTransaction, transactions.processTransaction);
router.get('/transactions/recent', transactions.listRecent);

router.post('/fixed-deposits/create', v.validateFixedDeposit, fixedDeposits.open);
router.get('/fixed-deposits', fixedDeposits.list);
router.get('/fixed-deposits/search', fixedDeposits.search);
router.get('/fixed-deposits/by-nic/:nic', validateNicParam, fixedDeposits.listByHolderNic);
router.post('/fixed-deposits/deactivate', v.validateFdDeactivation, fixedDeposits.close);

router.get('/performance', analytics.performance);
router.get('/analytics/transaction-types', analytics.transactionTypes);
router.get('/analytics/transaction-trend', analytics.transactionTrend);

module.exports = router;
