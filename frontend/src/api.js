import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:2002/api' });

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getDashboardSummary = () => api.get('/dashboard/summary');

export const getTransactions = (params = {}) => api.get('/transactions', { params });
export const getTransactionsByBudget = (budgetCategory) => api.get(`/transactions/budget/${encodeURIComponent(budgetCategory)}`);
export const getTransactionsByType = (type) => api.get(`/transactions/type/${type}`);
export const createTransaction = (data) => api.post('/transactions', data);
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

export const getBudgets = () => api.get('/budgets');
export const saveBudget = (data) => api.post('/budgets', data);
export const deleteBudget = (id) => api.delete(`/budgets/${id}`);

export const getAssets = () => api.get('/assets');
export const getAssetsByType = (type) => api.get(`/assets/type/${type}`);
export const createAsset = (data) => api.post('/assets', data);
export const updateAsset = (id, data) => api.put(`/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/assets/${id}`);

export const getMonthlyAnalytics = (year) => api.get('/transactions/analytics/monthly', { params: { year } });
export const getWeeklyAnalytics = (weeks = 8) => api.get('/transactions/analytics/weekly', { params: { weeks } });
export const getCategoryAnalytics = (params = {}) => api.get('/transactions/analytics/category', { params });
