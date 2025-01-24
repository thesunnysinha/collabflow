const API_BASE_URL = '/api';

const apiConfig = {
  getDocument: (id) => `${API_BASE_URL}/documents/${id}`,
  updateDocument: (id) => `${API_BASE_URL}/documents/${id}`,
  registerUser: `${API_BASE_URL}/auth/register`,
  loginUser: `${API_BASE_URL}/auth/login`,
};

module.exports = apiConfig;
