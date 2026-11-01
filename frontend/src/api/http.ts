import axios, { AxiosError } from 'axios';
import { endSession, getToken, markSessionExpired } from '@/features/auth/session';

// The single HTTP client for the app; feature code calls the typed functions in this folder instead
export const http = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or revoked token ends the session everywhere, not just on the request that noticed it.
// Only react when the rejected request used the *current* token, so a late response from a previous
// session can't log out a user who has just signed in again.
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const token = getToken();
    const sentWithCurrentToken = token && error.config?.headers?.Authorization === `Bearer ${token}`;
    if (error.response?.status === 401 && sentWithCurrentToken) {
      endSession();
      markSessionExpired();
      window.location.assign('/');
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as AxiosError<{ message?: string }>;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check that the backend is running.';
  return fallback;
};
