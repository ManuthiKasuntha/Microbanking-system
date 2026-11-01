// End-to-end API flow against a real PostgreSQL database.
// Runs only when TEST_PGDATABASE is set (it must contain "test", so it can never touch real data):
//   psql -U postgres -v dbname=microbanking_test -f ../database/setup.sql
//   TEST_PGDATABASE=microbanking_test npm test
require('dotenv').config();
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const testDb = process.env.TEST_PGDATABASE;
const skip = !testDb || !testDb.includes('test') ? 'set TEST_PGDATABASE to a *test* database to run' : false;
if (!skip) {
  process.env.PGDATABASE = testDb;
  for (const key of ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD']) {
    if (process.env[`TEST_${key}`]) process.env[key] = process.env[`TEST_${key}`];
  }
}
require('./helpers');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { processDailySavingsInterest } = require('../src/services/interest.service');

const unique = Date.now().toString().slice(-8);
const randomNic = () => `19${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
const contact = { contact_no_1: '0771234567', address: '12 Galle Road, Colombo 03', email: 'test@example.com' };
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('banking workflow (integration)', { skip }, () => {
  const ctx = {};

  const accountBalance = async () => {
    const res = await request(app).get(`/api/agent/accounts/${ctx.accountId}/details`).set(auth(ctx.agent));
    assert.equal(res.status, 200);
    return Number(res.body.account.balance);
  };

  before(async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    assert.equal(res.status, 200, 'admin login failed - is the test database freshly set up?');
    ctx.admin = res.body.token;
  });

  after(() => pool.end());

  test('admin creates, updates and lists a branch', async () => {
    const created = await request(app).post('/api/admin/branches').set(auth(ctx.admin))
      .send({ name: `Kandy ${unique}`, ...contact });
    assert.equal(created.status, 201);
    ctx.branchId = created.body.branch_id;

    const updated = await request(app).put(`/api/admin/branches/${ctx.branchId}`).set(auth(ctx.admin))
      .send({ name: `Kandy City ${unique}`, ...contact, contact_no_2: '0812345678' });
    assert.equal(updated.status, 200);

    const list = await request(app).get('/api/admin/branches').set(auth(ctx.admin));
    const branch = list.body.branches.find((b) => b.branch_id === ctx.branchId);
    assert.equal(branch.name, `Kandy City ${unique}`);
    assert.equal(branch.contact_no_2, '0812345678');
  });

  test('duplicate branch names are rejected', async () => {
    const res = await request(app).post('/api/admin/branches').set(auth(ctx.admin))
      .send({ name: `kandy city ${unique}`, ...contact });
    assert.equal(res.status, 400);
  });

  test('admin registers an agent who can log in', async () => {
    ctx.agentUser = `agt${unique}`;
    const res = await request(app).post('/api/admin/register').set(auth(ctx.admin)).send({
      role: 'Agent', username: ctx.agentUser, password: 'Agent1234', first_name: 'Kamal', last_name: 'Silva',
      nic: randomNic(), gender: 'Male', date_of_birth: '1995-03-10', branch_id: ctx.branchId, ...contact,
    });
    assert.equal(res.status, 201);
    ctx.agentId = res.body.employee_id;

    const login = await request(app).post('/api/auth/login').send({ username: ctx.agentUser, password: 'Agent1234' });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, 'Agent');
    ctx.agent = login.body.token;
  });

  test('the database rejects under-age employees', async () => {
    const res = await request(app).post('/api/admin/register').set(auth(ctx.admin)).send({
      role: 'Agent', username: `kid${unique}`, password: 'Agent1234', first_name: 'Young', last_name: 'Person',
      nic: randomNic(), gender: 'Female', date_of_birth: '2015-01-01', branch_id: ctx.branchId, ...contact,
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /at least 18/);
  });

  test('admin edits the agent', async () => {
    const res = await request(app).put(`/api/admin/users/${ctx.agentId}`).set(auth(ctx.admin)).send({
      first_name: 'Kamal', last_name: 'De Silva', role: 'Agent', branch_id: ctx.branchId, ...contact,
    });
    assert.equal(res.status, 200);
  });

  test('agent registers a customer; duplicate NIC is rejected', async () => {
    const customer = {
      first_name: 'Nimal', last_name: 'Perera', nic: randomNic(), gender: 'Male', date_of_birth: '1990-05-01', ...contact,
    };
    const res = await request(app).post('/api/agent/customers/register').set(auth(ctx.agent)).send(customer);
    assert.equal(res.status, 201);
    ctx.customerId = res.body.customer_id;

    const dup = await request(app).post('/api/agent/customers/register').set(auth(ctx.agent)).send(customer);
    assert.ok([400, 409].includes(dup.status), `expected 400/409, got ${dup.status}`);
  });

  test('agent opens an Adult savings account with an initial deposit', async () => {
    const plans = await request(app).get('/api/public/saving-plans');
    const adult = plans.body.saving_plans.find((p) => p.plan_type === 'Adult');
    const res = await request(app).post('/api/agent/accounts/create').set(auth(ctx.agent)).send({
      customer_id: ctx.customerId, saving_plan_id: adult.saving_plan_id, initial_deposit: 5000, branch_id: ctx.branchId,
    });
    assert.equal(res.status, 201);
    ctx.accountId = res.body.account_id;
    assert.equal(await accountBalance(), 5000);
  });

  test('deposits and withdrawals update the balance', async () => {
    const deposit = await request(app).post('/api/agent/transactions/process').set(auth(ctx.agent))
      .send({ account_id: ctx.accountId, transaction_type: 'Deposit', amount: 1000, description: 'Cash deposit' });
    assert.equal(deposit.status, 201);
    assert.equal(deposit.body.new_balance, 6000);

    const withdrawal = await request(app).post('/api/agent/transactions/process').set(auth(ctx.agent))
      .send({ account_id: ctx.accountId, transaction_type: 'Withdrawal', amount: 2000, description: 'Cash withdrawal' });
    assert.equal(withdrawal.status, 201);
    assert.equal(withdrawal.body.new_balance, 4000);
  });

  test('a withdrawal below the plan minimum balance is refused by the database', async () => {
    const res = await request(app).post('/api/agent/transactions/process').set(auth(ctx.agent))
      .send({ account_id: ctx.accountId, transaction_type: 'Withdrawal', amount: 3500, description: 'Too much' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /minimum balance/i);
    assert.equal(await accountBalance(), 4000);
  });

  test('savings interest is credited once per cycle', async () => {
    process.env.INTEREST_CYCLE = '0 seconds';
    assert.equal((await processDailySavingsInterest()).success, true);
    ctx.balanceAfterInterest = await accountBalance();
    assert.ok(ctx.balanceAfterInterest > 4000, `expected interest, balance is ${ctx.balanceAfterInterest}`);

    process.env.INTEREST_CYCLE = '30 days';
    await processDailySavingsInterest();
    assert.equal(await accountBalance(), ctx.balanceAfterInterest);
  });

  test('a branch with accounts cannot be deleted', async () => {
    const res = await request(app).delete(`/api/admin/branches/${ctx.branchId}`).set(auth(ctx.admin));
    assert.equal(res.status, 400);
  });

  test('closing an account withdraws the full balance and blocks new transactions', async () => {
    const res = await request(app).post('/api/agent/accounts/deactivate').set(auth(ctx.agent))
      .send({ account_id: ctx.accountId, reason: 'Customer request' });
    assert.equal(res.status, 200);
    assert.equal(res.body.withdrawal_amount, ctx.balanceAfterInterest);

    const again = await request(app).post('/api/agent/transactions/process').set(auth(ctx.agent))
      .send({ account_id: ctx.accountId, transaction_type: 'Deposit', amount: 100, description: 'After close' });
    assert.equal(again.status, 400);
  });

  test('agent changes their password', async () => {
    const wrong = await request(app).put('/api/auth/change-password').set(auth(ctx.agent))
      .send({ current_password: 'Wrong1234', new_password: 'NewPass123' });
    assert.equal(wrong.status, 400);

    const ok = await request(app).put('/api/auth/change-password').set(auth(ctx.agent))
      .send({ current_password: 'Agent1234', new_password: 'NewPass123' });
    assert.equal(ok.status, 200);

    const login = await request(app).post('/api/auth/login').send({ username: ctx.agentUser, password: 'NewPass123' });
    assert.equal(login.status, 200);
  });

  test('a deactivated user cannot log in', async () => {
    const res = await request(app).patch(`/api/admin/users/${ctx.agentId}/status`).set(auth(ctx.admin))
      .send({ status: 'Inactive' });
    assert.equal(res.status, 200);
    const login = await request(app).post('/api/auth/login').send({ username: ctx.agentUser, password: 'NewPass123' });
    assert.equal(login.status, 403);
  });
});
