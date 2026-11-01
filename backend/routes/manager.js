const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const manager = require('../controllers/managerController');
const v = require('../middleware/validation');

// JWT is verified in app.js; this adds the role check
router.use(authorize('Manager', 'Admin'));

router.get('/customers/search', manager.searchCustomers);
router.get('/customers/by-nic/:nic', v.validateNicParam, manager.getCustomersByNic);
router.get('/team/agents', manager.getTeamAgents);
router.get('/team/agents/:agentId/transactions', v.validateIdParam('agentId', 'Agent ID'), manager.getAgentTransactions);
router.get('/transactions', v.validateBranchTransactionsQuery, manager.getBranchTransactions);
router.get('/accounts', manager.getBranchAccounts);

module.exports = router;
