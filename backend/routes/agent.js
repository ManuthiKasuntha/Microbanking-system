const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const agent = require('../controllers/agentController');
const v = require('../middleware/validation');

// JWT is verified in app.js; this adds the role check
router.use(authorize('Agent', 'Admin'));

router.post('/customers/register', v.validateCustomerRegistration, agent.registerCustomer);
router.get('/customers', agent.getCustomers);
router.get('/customers/by-nic/:nic', v.validateNicParam, agent.getCustomerByNic);
router.get('/customers/:id', v.validateIdParam('id', 'Customer ID'), agent.getCustomerById);
router.put('/customers/:id', v.validateCustomerUpdate, agent.updateCustomer);
router.put('/customers/:id/contact', v.validateCustomerContactUpdate, agent.updateCustomerContact);

router.post('/accounts/create', v.validateAccountCreation, agent.createAccount);
router.get('/accounts', agent.getAccounts);
router.get('/all-accounts', agent.getAllAccounts);
router.get('/accounts-with-fd', agent.getAccountsWithFd);
router.get('/accounts/search/:searchTerm', agent.searchAccounts);
router.get('/accounts/by-nic/:nic', v.validateNicParam, agent.getAccountsByCustomerNic);
router.get('/accounts/:id/details', v.validateIdParam('id', 'Account ID'), agent.getAccountDetails);
router.post('/accounts/change-plan', v.validatePlanChange, agent.changeAccountPlan);
router.post('/accounts/deactivate', v.validateAccountDeactivation, agent.deactivateAccount);

router.post('/transactions/process', v.validateTransaction, agent.processTransaction);
router.get('/transactions/recent', agent.getRecentTransactions);

router.post('/fixed-deposits/create', v.validateFixedDeposit, agent.createFixedDeposit);
router.get('/fixed-deposits', agent.getFixedDeposits);
router.get('/fixed-deposits/search', agent.searchFixedDeposits);
router.get('/fixed-deposits/by-nic/:nic', v.validateNicParam, agent.getFixedDepositsByNic);
router.post('/fixed-deposits/deactivate', v.validateFdDeactivation, agent.deactivateFixedDeposit);

router.get('/performance', agent.getPerformance);
router.get('/analytics/transaction-types', agent.getTransactionTypeAnalytics);
router.get('/analytics/transaction-trend', agent.getTransactionTrend);

module.exports = router;
