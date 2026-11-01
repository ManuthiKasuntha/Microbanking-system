export type Role = 'Admin' | 'Manager' | 'Agent';

export interface SessionUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: Role;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const EXPIRED_FLAG = 'sessionExpired';

// Saved tabs and sections are reset on sign-in so each role starts on its default view
const VIEW_STATE_KEYS = [
  'adminDashboard.activeSection',
  'agentDashboard.activeSection',
  'managerDashboard.activeSection',
  'transactionProcessing.activeTab',
  'fixedDepositCreation.activeTab',
];

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const getCurrentUser = (): SessionUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
};

const isExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || '')) as { exp?: number };
    return !!payload.exp && Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

export const hasValidSession = (): boolean => {
  const token = getToken();
  return !!token && !isExpired(token) && getCurrentUser() !== null;
};

export const startSession = (token: string, user: SessionUser): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  VIEW_STATE_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const endSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Lets the login page explain why the user was signed out
export const markSessionExpired = (): void => sessionStorage.setItem(EXPIRED_FLAG, '1');

export const consumeSessionExpired = (): boolean => {
  const expired = sessionStorage.getItem(EXPIRED_FLAG) === '1';
  sessionStorage.removeItem(EXPIRED_FLAG);
  return expired;
};
