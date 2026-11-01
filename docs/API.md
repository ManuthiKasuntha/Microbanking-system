# API Reference

Base URL: `http://localhost:5000` (set `PORT` in `backend/.env`).
All request and response bodies are JSON. Protected routes need `Authorization: Bearer <token>` from `/api/auth/login`.
Tokens expire after 1 hour.

## Responses and errors

Successful responses contain `"status": "success"`. Errors look like this:

```json
{
  "status": "error",
  "message": "NIC must be 12 digits, or 9 digits followed by V",
  "errors": [{ "field": "nic", "message": "NIC must be 12 digits, or 9 digits followed by V" }]
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation failed, or a business rule refused the request (e.g. minimum balance) |
| 401 | Missing, invalid or expired token; wrong username or password |
| 403 | Logged in, but the role is not allowed; or the account is inactive |
| 404 | Record or route not found |
| 409 | Conflict with existing data (duplicate value, record still referenced) |
| 429 | Too many failed login attempts (10 per 15 minutes per IP by default) |
| 500 | Unexpected server error (details are logged, never returned) |

Every write endpoint is validated twice: by `express-validator` rules in
[`backend/middleware/validation.js`](../backend/middleware/validation.js), and again by database constraints and triggers.

## Public and auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/public/saving-plans` | Saving plans (rate, minimum balance) |
| GET | `/api/public/fd-plans` | Fixed deposit plans |
| GET | `/api/public/branches` | Branches |
| GET | `/api/public/about` | Bank information |
| POST | `/api/auth/login` | `{ username, password }` → `{ token, user }` |
| PUT | `/api/auth/change-password` | Any logged-in user. `{ current_password, new_password }` |

## Admin (`Admin` role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List employees with contact details |
| POST | `/api/admin/register` | Create employee (Admin / Manager / Agent) |
| PUT | `/api/admin/users/:id` | Update employee name, role, branch and contact details |
| PATCH | `/api/admin/users/:id/status` | `{ status: "Active" \| "Inactive" }` |
| DELETE | `/api/admin/users/:id` | Deactivate employee (soft delete) |
| GET | `/api/admin/branches` | List branches |
| POST | `/api/admin/branches` | Create branch |
| PUT | `/api/admin/branches/:id` | Update branch |
| DELETE | `/api/admin/branches/:id` | Delete branch (refused while it has employees or accounts) |
| GET | `/api/admin/reports/agent-transactions?startDate&endDate` | Transactions per agent |
| GET | `/api/admin/reports/account-summaries?startDate&endDate` | Deposits/withdrawals per account |
| GET | `/api/admin/reports/active-fds` | Active fixed deposits |
| GET | `/api/admin/reports/interest-summary?month&year` | Interest credited in a month |
| GET | `/api/admin/reports/customer-activity?startDate&endDate` | Activity per customer |
| GET | `/api/admin/savings-interest/summary` | Savings interest dashboard data |
| GET | `/api/admin/fd-interest/summary` | FD interest dashboard data |

## Agent (`Agent` or `Admin` role)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agent/customers/register` | Register customer |
| GET | `/api/agent/customers` | List customers |
| GET | `/api/agent/customers/by-nic/:nic` | Find a customer by exact NIC |
| GET | `/api/agent/customers/:id` | Customer details |
| PUT | `/api/agent/customers/:id` | Update customer |
| PUT | `/api/agent/customers/:id/contact` | Update customer contact details only |
| POST | `/api/agent/accounts/create` | Open savings account `{ customer_id, saving_plan_id, branch_id, initial_deposit, joint_holders? }` |
| GET | `/api/agent/accounts` | Active accounts (for transactions) |
| GET | `/api/agent/all-accounts` | All accounts including closed |
| GET | `/api/agent/accounts-with-fd` | Accounts eligible for a new FD |
| GET | `/api/agent/accounts/search/:searchTerm` | Search accounts |
| GET | `/api/agent/accounts/by-nic/:nic` | Accounts of a customer |
| GET | `/api/agent/accounts/:id/details` | Account, holders and recent transactions |
| POST | `/api/agent/accounts/change-plan` | Upgrade saving plan `{ account_id, new_saving_plan_id, reason, new_nic? }` |
| POST | `/api/agent/accounts/deactivate` | Close account (withdraws full balance) |
| POST | `/api/agent/transactions/process` | `{ account_id, transaction_type: Deposit\|Withdrawal, amount, description }` |
| GET | `/api/agent/transactions/recent` | Agent's recent transactions |
| POST | `/api/agent/fixed-deposits/create` | Open FD from a savings account |
| GET | `/api/agent/fixed-deposits` | List FDs |
| GET | `/api/agent/fixed-deposits/search?query` | Search FDs |
| GET | `/api/agent/fixed-deposits/by-nic/:nic` | FDs of a customer |
| POST | `/api/agent/fixed-deposits/deactivate` | Close FD (returns principal) |
| GET | `/api/agent/performance` | Agent KPIs |
| GET | `/api/agent/analytics/transaction-types` | Transactions by plan type |
| GET | `/api/agent/analytics/transaction-trend` | Daily transactions, last 30 days |

## Manager (`Manager` or `Admin` role, scoped to the manager's branch)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/manager/accounts` | Branch accounts with summary |
| GET | `/api/manager/customers/search?query` | Search branch customers |
| GET | `/api/manager/customers/by-nic/:nic` | Branch customers by NIC |
| GET | `/api/manager/team/agents` | Branch agents with performance |
| GET | `/api/manager/team/agents/:agentId/transactions` | One agent's transactions |
| GET | `/api/manager/transactions?start&end` | Branch transactions and totals |

The Postman collection in [`docs/postman-collection.json`](postman-collection.json) covers the
original endpoints