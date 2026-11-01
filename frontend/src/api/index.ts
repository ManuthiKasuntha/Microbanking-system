// One object per backend domain; every endpoint URL in the app lives here
import { http } from './http';

export { getErrorMessage } from './http';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ContactDetails {
  contact_no_1: string;
  contact_no_2?: string | null;
  address: string;
  email: string;
}

// Reports aggregate large tables, so they get a longer timeout than ordinary requests
const REPORT_TIMEOUT_MS = 30000;

export const authApi = {
  login: (credentials: { username: string; password: string }) => http.post('/api/auth/login', credentials),
  changePassword: (body: { current_password: string; new_password: string }) =>
    http.put('/api/auth/change-password', body),
};

export const referenceApi = {
  savingPlans: () => http.get('/api/public/saving-plans'),
  fdPlans: () => http.get('/api/public/fd-plans'),
  branches: () => http.get('/api/public/branches'),
};

export const customersApi = {
  list: () => http.get('/api/agent/customers'),
  getById: (id: number) => http.get(`/api/agent/customers/${id}`),
  getByNic: (nic: string) => http.get(`/api/agent/customers/by-nic/${encodeURIComponent(nic)}`),
  register: <T extends object>(customer: T) => http.post('/api/agent/customers/register', customer),
  updateContact: (id: number, contact: ContactDetails) => http.put(`/api/agent/customers/${id}/contact`, contact),
};

export const accountsApi = {
  listAll: () => http.get('/api/agent/all-accounts'),
  listEligibleForFd: () => http.get('/api/agent/accounts-with-fd'),
  listByHolderNic: (nic: string) => http.get(`/api/agent/accounts/by-nic/${encodeURIComponent(nic)}`),
  getDetails: (id: number | string) => http.get(`/api/agent/accounts/${id}/details`),
  open: <T extends object>(account: T) => http.post('/api/agent/accounts/create', account),
  changePlan: (body: { account_id: number; new_saving_plan_id: number; reason: string; new_nic?: string }) =>
    http.post('/api/agent/accounts/change-plan', body),
  close: (body: { account_id: number; reason?: string }) => http.post('/api/agent/accounts/deactivate', body),
};

export const transactionsApi = {
  process: (body: { account_id: number; transaction_type: string; amount: number; description: string }) =>
    http.post('/api/agent/transactions/process', body),
  listRecent: () => http.get('/api/agent/transactions/recent'),
};

export const fixedDepositsApi = {
  list: () => http.get('/api/agent/fixed-deposits'),
  listByHolderNic: (nic: string) => http.get(`/api/agent/fixed-deposits/by-nic/${encodeURIComponent(nic)}`),
  open: <T extends object>(fd: T) => http.post('/api/agent/fixed-deposits/create', fd),
  close: (fdId: number) => http.post('/api/agent/fixed-deposits/deactivate', { fd_id: fdId }),
};

export const analyticsApi = {
  performance: () => http.get('/api/agent/performance'),
  transactionTypes: () => http.get('/api/agent/analytics/transaction-types'),
  transactionTrend: () => http.get('/api/agent/analytics/transaction-trend'),
};

export const employeesApi = {
  list: () => http.get('/api/admin/users'),
  register: <T extends object>(employee: T) => http.post('/api/admin/register', employee),
  update: <T extends object>(id: number, employee: T) => http.put(`/api/admin/users/${id}`, employee),
  setStatus: (id: number, status: 'Active' | 'Inactive') => http.patch(`/api/admin/users/${id}/status`, { status }),
};

export const branchesApi = {
  list: () => http.get('/api/admin/branches'),
  create: <T extends object>(branch: T) => http.post('/api/admin/branches', branch),
  update: <T extends object>(id: number, branch: T) => http.put(`/api/admin/branches/${id}`, branch),
  remove: (id: number) => http.delete(`/api/admin/branches/${id}`),
};

export const reportsApi = {
  agentTransactions: (range: DateRange) =>
    http.get('/api/admin/reports/agent-transactions', { params: range, timeout: REPORT_TIMEOUT_MS }),
  accountSummaries: (range: DateRange) =>
    http.get('/api/admin/reports/account-summaries', { params: range, timeout: REPORT_TIMEOUT_MS }),
  activeFixedDeposits: () => http.get('/api/admin/reports/active-fds', { timeout: REPORT_TIMEOUT_MS }),
  interestSummary: (month: number, year: number) =>
    http.get('/api/admin/reports/interest-summary', { params: { month, year }, timeout: REPORT_TIMEOUT_MS }),
  customerActivity: (range: DateRange) =>
    http.get('/api/admin/reports/customer-activity', { params: range, timeout: REPORT_TIMEOUT_MS }),
};

export const interestApi = {
  savingsSummary: () => http.get('/api/admin/savings-interest/summary'),
  fdSummary: () => http.get('/api/admin/fd-interest/summary'),
};

export const teamApi = {
  agents: () => http.get('/api/manager/team/agents'),
  agentTransactions: (agentId: number | string) => http.get(`/api/manager/team/agents/${agentId}/transactions`),
  branchTransactions: (range: { start: string; end: string }) => http.get('/api/manager/transactions', { params: range }),
  branchAccounts: () => http.get('/api/manager/accounts'),
};
