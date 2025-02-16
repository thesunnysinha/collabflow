import axios from 'axios';
import { API_BASE_URL } from '../config';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for auth tokens (if added later)
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced response interceptor
apiClient.interceptors.response.use(
  response => {
    // Handle Kafka event metadata if needed
    if (response.data?.kafkaMetadata) {
      console.debug('Kafka event ID:', response.data.kafkaMetadata.eventId);
    }
    return response.data;
  },
  error => {
    const errorMessage = error.response?.data?.message ||
      error.message ||
      'Unknown error occurred';

    console.error(`API Error [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`, {
      message: errorMessage,
      status: error.response?.status,
      code: error.code
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Redirect to login if authentication is added
    }

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      code: error.code,
      isNetworkError: !error.response
    });
  }
);

export default apiClient;