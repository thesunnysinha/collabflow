import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error(error.response?.data?.message || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
