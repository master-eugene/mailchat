import axios, { isAxiosError } from 'axios';

import { getSetting, setSetting } from '../db/indexedDb';

// Empty means the API is on the same address as the web app (the Docker install).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

export const sessionExpiredEvent = 'mailchat:session-expired';

// The token lives in IndexedDB rather than localStorage because the service worker,
// which has no localStorage, needs it to acknowledge messages that arrive by push.
export const getStoredToken = () => getSetting('token');

export const setStoredToken = async (token: string) => {
  await setSetting('token', token);
  await setSetting('apiBase', API_BASE_URL);
};

export const clearStoredToken = () => setSetting('token', null);

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use(async config => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

httpClient.interceptors.response.use(undefined, async error => {
  if (isAxiosError(error) && error.response?.status === 401 && error.config?.headers.Authorization) {
    await clearStoredToken();
    window.dispatchEvent(new Event(sessionExpiredEvent));
  }

  return Promise.reject(error);
});

export const getApiErrorCode = (error: unknown) =>
  isAxiosError(error) ? (error.response?.data?.code as string | undefined) : undefined;
