import axios from 'axios';
import { API_BASE_URL } from '../config';

export const TOKEN_KEY = 'authToken';
export const LOGOUT_EVENT = 'auth:logout';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Resolves with the response envelope ({ success, code, message, data, meta, trace_id });
// rejects with a normalized error.
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const body = error.response?.data;
    const message =
      body?.meta?.details?.[0]?.message || body?.message || error.message || 'Unknown error occurred';

    // An expired/invalid token on an authenticated call ends the session.
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event(LOGOUT_EVENT));
    }

    return Promise.reject({ message, status, code: body?.code, traceId: body?.trace_id, isNetworkError: !error.response });
  }
);

export default apiClient;
