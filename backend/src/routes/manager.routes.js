const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const { validateIdParam, validateNicParam } = require('../validators/common');
const v = require('../validators/manager.validators');
const team = require('../controllers/team.controller');
const transactions = require('../controllers/transaction.controller');

const router = Router();

router.use(authorize('Manager', 'Admin'));

router.get('/customers/search', team.searchCustomers);
router.get('/customers/by-nic/:nic', validateNicParam, team.customersByNic);
router.get('/team/agents', team.agents);
router.get('/team/agents/:agentId/transactions', validateIdParam('agentId', 'Agent ID'), transactions.listByAgent);
router.get('/transactions', v.validateBranchTransactionsQuery, team.branchTransactions);
router.get('/accounts', team.branchAccounts);

module.exports = router;
