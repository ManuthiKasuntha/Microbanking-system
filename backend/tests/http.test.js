// HTTP-level tests that need no database: routing, security headers, auth and input validation
const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const { tokenFor } = require('./helpers');
const request = require('supertest');
const app = require('../app');
const pool = require('../config/database');

after(() => pool.end());

describe('platform', () => {
  test('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.status, 'error');
  });

  test('security headers are set', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
  });

  test('malformed JSON returns 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
    assert.equal(res.status, 400);
  });
});

describe('authentication and authorisation', () => {
  test('protected routes require a token', async () => {
    const res = await request(app).get('/api/admin/users');
    assert.equal(res.status, 401);
  });

  test('an invalid token is rejected', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', 'Bearer not-a-token');
    assert.equal(res.status, 401);
  });

  test('an Agent cannot call Admin routes', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor('Agent')}`);
    assert.equal(res.status, 403);
  });

  test('a Manager cannot call Agent routes', async () => {
    const res = await request(app).get('/api/agent/customers').set('Authorization', `Bearer ${tokenFor('Manager')}`);
    assert.equal(res.status, 403);
  });

  test('login requires username and password', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Username is required/);
  });

  test('change password requires a token', async () => {
    const res = await request(app).put('/api/auth/change-password').send({});
    assert.equal(res.status, 401);
  });

  test('change password enforces password strength', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${tokenFor('Agent')}`)
      .send({ current_password: 'whatever1', new_password: 'short' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /at least 8 characters/);
  });
});

describe('server-side validation', () => {
  const agent = () => `Bearer ${tokenFor('Agent')}`;
  const admin = () => `Bearer ${tokenFor('Admin')}`;
  const validCustomer = {
    first_name: 'Nimal',
    last_name: 'Perera',
    nic: '199012345678',
    gender: 'Male',
    date_of_birth: '1990-05-01',
    contact_no_1: '0771234567',
    address: '12 Galle Road, Colombo',
    email: 'nimal@example.com',
  };

  const cases = [
    ['invalid NIC', { nic: '12345' }, /NIC must be 12 digits/],
    ['future date of birth', { date_of_birth: '2999-01-01' }, /cannot be in the future/],
    ['invalid phone', { contact_no_1: 'abc' }, /Contact number/],
    ['invalid email', { email: 'not-an-email' }, /Email address is not valid/],
    ['name with digits', { first_name: 'N1mal' }, /First name can only contain letters/],
    ['invalid gender', { gender: 'X' }, /Gender must be/],
  ];
  for (const [name, override, expected] of cases) {
    test(`customer registration rejects ${name}`, async () => {
      const res = await request(app)
        .post('/api/agent/customers/register')
        .set('Authorization', agent())
        .send({ ...validCustomer, ...override });
      assert.equal(res.status, 400);
      assert.match(res.body.message, expected);
      assert.ok(Array.isArray(res.body.errors));
    });
  }

  test('transactions reject non-positive amounts', async () => {
    const res = await request(app)
      .post('/api/agent/transactions/process')
      .set('Authorization', agent())
      .send({ account_id: 1, transaction_type: 'Deposit', amount: -5, description: 'test' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Amount must be greater than 0/);
  });

  test('transactions reject unknown types', async () => {
    const res = await request(app)
      .post('/api/agent/transactions/process')
      .set('Authorization', agent())
      .send({ account_id: 1, transaction_type: 'Interest', amount: 10, description: 'test' });
    assert.equal(res.status, 400);
  });

  test('employee registration enforces password strength', async () => {
    const res = await request(app)
      .post('/api/admin/register')
      .set('Authorization', admin())
      .send({ ...validCustomer, username: 'agent01', password: 'password', role: 'Agent', branch_id: 1 });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Password must be at least 8 characters/);
  });

  test('report date ranges must be ordered', async () => {
    const res = await request(app)
      .get('/api/admin/reports/agent-transactions?startDate=2025-02-01&endDate=2025-01-01')
      .set('Authorization', admin());
    assert.equal(res.status, 400);
  });

  test('ID parameters must be positive integers', async () => {
    const res = await request(app).delete('/api/admin/branches/abc').set('Authorization', admin());
    assert.equal(res.status, 400);
  });
});
