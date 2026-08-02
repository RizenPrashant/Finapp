/**
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

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

export const getDashboardSummary = (params = {}) => api.get('/dashboard/summary', { params });

export const getTransactions = (params = {}) => api.get('/transactions', { params });
export const searchTransactions = (q, params = {}) => api.get('/transactions/search', { params: { q, ...params } });
export const getTransactionsByBudget = (budgetCategory, params = {}) => api.get(`/transactions/budget/${encodeURIComponent(budgetCategory)}`, { params });
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

// New Unified Compounding APIs
export const getCompoundingSettings = () => api.get('/compounding/settings');
export const updateCompoundingSettings = (data) => api.put('/compounding/settings', data);
export const getCompoundingCapital = () => api.get('/compounding/capital');
export const getCompoundingProfits = () => api.get('/compounding/profits');
export const getUnifiedCompoundingHistory = () => api.get('/compounding/history');
export const processManualCompounding = (amount, source, description) =>
    api.post(`/compounding/process?amount=${amount}&source=${source}&description=${description || ''}`);

// Process investment profit with separate profit and reinvest amount
export const processInvestmentCompounding = (profit, reinvestAmount, description) =>
    api.post(`/compounding/process-investment?profit=${profit}&reinvestAmount=${reinvestAmount}&description=${description || ''}`);

// Investment APIs
export const getInvestments = () => api.get('/investments');
export const getInvestmentsByType = (type) => api.get(`/investments/type/${type}`);
export const getInvestmentById = (id) => api.get(`/investments/${id}`);
export const createInvestment = (data) => api.post('/investments', data);
export const updateInvestment = (id, data) => api.put(`/investments/${id}`, data);
export const deleteInvestment = (id) => api.delete(`/investments/${id}`);
export const getInvestmentAnalytics = () => api.get('/investments/analytics');

// Cashback APIs
export const getCashbackWallets = () => api.get('/cashback/wallets');
export const createCashbackWallet = (data) => api.post('/cashback/wallets', data);
export const updateCashbackWallet = (id, data) => api.put(`/cashback/wallets/${id}`, data);
export const deleteCashbackWallet = (id) => api.delete(`/cashback/wallets/${id}`);
export const getCashbackEntries = () => api.get('/cashback/entries');
export const getCashbackEntriesByWallet = (walletId) => api.get(`/cashback/entries/wallet/${walletId}`);
export const createCashbackEntry = (data) => api.post('/cashback/entries', data);
export const deleteCashbackEntry = (id) => api.delete(`/cashback/entries/${id}`);

// Udhar APIs
export const getUdharRecords = () => api.get('/udhar/records');
export const getUdharRecordsByType = (type) => api.get(`/udhar/records/type/${type}`);
export const createUdharRecord = (data) => api.post('/udhar/records', data);
export const deleteUdharRecord = (id) => api.delete(`/udhar/records/${id}`);
export const settleUdhar = (data) => api.post('/udhar/settle', data);
export const getUdharTransactions = (id) => api.get(`/udhar/records/${id}/transactions`);
export const getUdharSummary = () => api.get('/udhar/summary');

// Tax APIs
export const getTaxProfile = (financialYear) => api.get(`/tax/profile/${financialYear}`);
export const saveTaxProfile = (data) => api.post('/tax/profile', data);
export const calculateTax = (data) => api.post('/tax/calculate', data);
export const compareTaxRegimes = (data) => api.post('/tax/compare', data);
export const autoCalculateTax = (financialYear) => api.get(`/tax/auto-calculate/${financialYear}`);
export const getFinancialYears = () => api.get('/tax/financial-years');

// Toggle transaction tax inclusion
export const toggleTransactionTaxInclude = (id, includeInTax) =>
    api.put(`/transactions/${id}/tax-toggle?includeInTax=${includeInTax}`);

// Profile APIs
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const changePassword = (data) => api.put('/auth/change-password', data);

// Import Format APIs
export const getImportFormats = () => api.get('/import-formats');
export const getImportFormatsByType = (type) => api.get(`/import-formats/type/${type}`);
export const getImportFormatsBanks = () => api.get('/import-formats/banks');
export const getImportFormatsBrokers = () => api.get('/import-formats/brokers');
export const getImportFormatById = (id) => api.get(`/import-formats/${id}`);
export const createImportFormat = (data) => api.post('/import-formats', data);
export const updateImportFormat = (id, data) => api.put(`/import-formats/${id}`, data);
export const deleteImportFormat = (id) => api.delete(`/import-formats/${id}`);

// Import APIs
export const previewTradesImport = (formData) => api.post('/import/preview/trades', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const importTrades = (formData) => api.post('/import/trades', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const previewBankStatementImport = (formData) => api.post('/import/preview/bank-statement', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const importBankStatement = (formData) => api.post('/import/bank-statement', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const importBankStatementJson = (payload) => api.post('/import/bank-statement/json', payload);
export const importTradesJson = (payload) => api.post('/import/trades/json', payload);

export default api;
