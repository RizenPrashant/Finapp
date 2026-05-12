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
export const getTransactionsBySource = (source) => api.get(`/transactions/source/${encodeURIComponent(source)}`);
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

// Trading APIs
export const getTrades = () => api.get('/trading/trades');
export const getTradesByStatus = (status) => api.get(`/trading/trades/status/${status}`);
export const getTradesBySegment = (segment) => api.get(`/trading/trades/segment/${segment}`);
export const getTradesByBroker = (broker) => api.get(`/trading/trades/broker/${broker}`);
export const getBrokers = () => api.get('/trading/brokers');
export const createTrade = (data) => api.post('/trading/trades', data);
export const updateTrade = (id, data) => api.put(`/trading/trades/${id}`, data);
export const deleteTrade = (id) => api.delete(`/trading/trades/${id}`);

export const getTradingAnalytics = () => api.get('/trading/analytics');
export const getTradingCapital = () => api.get('/trading/capital');

export const getCompoundingHistory = () => api.get('/trading/compounding');
export const createCompoundingHistory = (data) => api.post('/trading/compounding', data);
export const deleteCompoundingHistory = (id) => api.delete(`/trading/compounding/${id}`);

// Investment APIs
export const getInvestments = () => api.get('/investments');
export const getInvestmentsByType = (type) => api.get(`/investments/type/${type}`);
export const getInvestmentById = (id) => api.get(`/investments/${id}`);
export const createInvestment = (data) => api.post('/investments', data);
export const updateInvestment = (id, data) => api.put(`/investments/${id}`, data);
export const deleteInvestment = (id) => api.delete(`/investments/${id}`);
export const getInvestmentAnalytics = () => api.get('/investments/analytics');

// Profile APIs
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);

export default api;
