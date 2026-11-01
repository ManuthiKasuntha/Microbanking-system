import axios, { AxiosError } from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// An expired or revoked token ends the session everywhere, not just on the request that noticed it.
// Only react when the rejected request used the *current* token, so a late response from a previous
// session can't log out a user who has just signed in again.
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const token = localStorage.getItem('token');
    const sentWithCurrentToken = token && error.config?.headers?.Authorization === `Bearer ${token}`;
    if (error.response?.status === 401 && sentWithCurrentToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.setItem('sessionExpired', '1');
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
