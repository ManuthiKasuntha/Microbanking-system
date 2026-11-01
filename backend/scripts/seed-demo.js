// Loads realistic demo data through the public API, so every business rule and DB trigger applies.
// Usage (backend running): npm run seed:demo        Override the API with API_URL=http://host:port
require('dotenv').config();

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
const ADMIN = { username: process.env.SEED_ADMIN_USER || 'admin', password: process.env.SEED_ADMIN_PASSWORD || 'admin123' };
const STAFF_PASSWORD = 'Demo1234';

const call = async (method, path, token, body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data.message || res.statusText}`);
  return data;
};

const login = async (username, password) => (await call('POST', '/api/auth/login', null, { username, password })).token;

const branches = [
  { name: 'Colombo Fort', contact_no_1: '0112345678', address: '45 York Street, Colombo 01', email: 'fort@btrust.lk' },
  { name: 'Kandy City', contact_no_1: '0812234567', address: '12 Dalada Veediya, Kandy', email: 'kandy@btrust.lk' },
];

const staff = [
  { role: 'Manager', username: 'manager1', first_name: 'Dilani', last_name: 'Jayasuriya', nic: '198512345678', gender: 'Female', date_of_birth: '1985-04-12', branch: 0 },
  { role: 'Agent', username: 'agent1', first_name: 'Kasun', last_name: 'Fernando', nic: '199234567891', gender: 'Male', date_of_birth: '1992-08-23', branch: 0 },
  { role: 'Agent', username: 'agent2', first_name: 'Ishara', last_name: 'Wickramasinghe', nic: '199645678912', gender: 'Female', date_of_birth: '1996-01-30', branch: 1 },
];

// plan: Children | Teen | Adult | Senior | Joint; deposit: initial deposit; jointWith: index of second holder
const customers = [
  { first_name: 'Nimal', last_name: 'Perera', nic: '197812345671', gender: 'Male', date_of_birth: '1978-02-14', plan: 'Adult', deposit: 85000 },
  { first_name: 'Shanika', last_name: 'Silva', nic: '198823456782', gender: 'Female', date_of_birth: '1988-11-03', plan: 'Adult', deposit: 120000 },
  { first_name: 'Ruwan', last_name: 'Bandara', nic: '195534567893', gender: 'Male', date_of_birth: '1955-06-20', plan: 'Senior', deposit: 450000 },
  { first_name: 'Malini', last_name: 'Gunawardena', nic: '195845678904', gender: 'Female', date_of_birth: '1958-09-09', plan: 'Senior', deposit: 300000 },
  { first_name: 'Tharindu', last_name: 'Rajapaksha', nic: '200956789015', gender: 'Male', date_of_birth: '2009-03-17', plan: 'Teen', deposit: 5000 },
  { first_name: 'Sanduni', last_name: 'Herath', nic: '201667890126', gender: 'Female', date_of_birth: '2016-07-25', plan: 'Children', deposit: 2500 },
  { first_name: 'Chamara', last_name: 'Dissanayake', nic: '198378901237', gender: 'Male', date_of_birth: '1983-12-01', plan: 'Adult', deposit: 64000, branch: 1 },
  { first_name: 'Anusha', last_name: 'Karunaratne', nic: '199089012348', gender: 'Female', date_of_birth: '1990-05-28', plan: 'Joint', deposit: 150000, jointWith: 8 },
  { first_name: 'Pradeep', last_name: 'Karunaratne', nic: '198790123459', gender: 'Male', date_of_birth: '1987-10-15', plan: null },
  { first_name: 'Hiruni', last_name: 'Weerasinghe', nic: '199401234560', gender: 'Female', date_of_birth: '1994-04-04', plan: 'Adult', deposit: 42000, branch: 1 },
];

const main = async () => {
  console.log(`Seeding demo data via ${API}`);
  const admin = await login(ADMIN.username, ADMIN.password);

  const existingUsers = (await call('GET', '/api/admin/users', admin)).users;
  if (existingUsers.some((u) => u.username === 'agent1')) {
    console.log('Demo data already present (user "agent1" exists). Nothing to do.');
    return;
  }

  const branchIds = [];
  for (const b of branches) {
    branchIds.push((await call('POST', '/api/admin/branches', admin, b)).branch_id);
  }
  console.log(`✔ ${branchIds.length} branches`);

  for (const [i, s] of staff.entries()) {
    await call('POST', '/api/admin/register', admin, {
      ...s, password: STAFF_PASSWORD, branch_id: branchIds[s.branch],
      contact_no_1: `07712300${10 + i}`, address: `${10 + i} Temple Road, Colombo`, email: `${s.username}@btrust.lk`,
    });
  }
  console.log(`✔ ${staff.length} staff (password: ${STAFF_PASSWORD})`);

  const agents = [await login('agent1', STAFF_PASSWORD), await login('agent2', STAFF_PASSWORD)];
  const plans = (await call('GET', '/api/public/saving-plans')).saving_plans;
  const planId = (type) => plans.find((p) => p.plan_type === type).saving_plan_id;

  const customerIds = [];
  for (const [i, c] of customers.entries()) {
    const { plan, deposit, jointWith, branch, ...person } = c;
    const res = await call('POST', '/api/agent/customers/register', agents[branch || 0], {
      ...person, contact_no_1: `07123456${String(i).padStart(2, '0')}`,
      address: `${20 + i} Main Street, ${branch ? 'Kandy' : 'Colombo'}`, email: `${c.first_name.toLowerCase()}@example.com`,
    });
    customerIds.push(res.customer_id);
  }
  console.log(`✔ ${customerIds.length} customers`);

  const accounts = [];
  for (const [i, c] of customers.entries()) {
    if (!c.plan) continue;
    const agent = agents[c.branch || 0];
    const res = await call('POST', '/api/agent/accounts/create', agent, {
      customer_id: customerIds[i], saving_plan_id: planId(c.plan), initial_deposit: c.deposit,
      branch_id: branchIds[c.branch || 0], joint_holders: c.jointWith ? [customerIds[c.jointWith]] : [],
    });
    accounts.push({ id: res.account_id, agent, customer: i });
  }
  console.log(`✔ ${accounts.length} savings accounts`);

  const movements = [
    [0, 'Deposit', 15000, 'Salary deposit'], [0, 'Withdrawal', 8000, 'Cash withdrawal'],
    [1, 'Deposit', 25000, 'Business income'], [1, 'Withdrawal', 12000, 'Rent payment'],
    [2, 'Deposit', 50000, 'Pension'], [3, 'Withdrawal', 20000, 'Medical expenses'],
    [4, 'Deposit', 1500, 'Pocket money savings'], [6, 'Deposit', 18000, 'Salary deposit'],
    [7, 'Deposit', 30000, 'Joint savings'], [8, 'Withdrawal', 5000, 'Utility bills'],
  ];
  for (const [idx, type, amount, description] of movements) {
    const acc = accounts[idx];
    await call('POST', '/api/agent/transactions/process', acc.agent, { account_id: acc.id, transaction_type: type, amount, description });
  }
  console.log(`✔ ${movements.length} transactions`);

  const fdPlans = (await call('GET', '/api/public/fd-plans')).fd_plans;
  const fds = [[2, '1 year', 200000, true], [1, '6 months', 50000, false]];
  for (const [idx, option, principal, renew] of fds) {
    const acc = accounts[idx];
    await call('POST', '/api/agent/fixed-deposits/create', acc.agent, {
      customer_id: customerIds[acc.customer], account_id: acc.id,
      fd_plan_id: fdPlans.find((p) => p.fd_options === option).fd_plan_id,
      principal_amount: principal, auto_renewal_status: renew,
    });
  }
  console.log(`✔ ${fds.length} fixed deposits`);
  console.log('\nDone. Log in as admin/admin123, manager1, agent1 or agent2 (password Demo1234).');
};

main().catch((error) => {
  console.error(`✖ ${error.message}`);
  process.exit(1);
});
