/**
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter, Gift, Plus, Search, Tag, Upload, X } from 'lucide-react';
import Header from '../components/Header';
import TransactionRow from '../components/TransactionRow';
import EditTransactionModal from '../components/EditTransactionModal';
import AddTransactionModal from '../components/AddTransactionModal';
import { isDeleteLocked, isEditLocked, FILTER_PREFS_KEY, CUSTOM_FILTERS_KEY } from '../pages/Settings';
import { getTransactionsPage, getTransactionFilterOptions, searchTransactions, updateTransaction, deleteTransaction, createTransaction, getCashbackWallets, getCashbackEntriesByWallet } from '../api';
import ImportModal from '../components/ImportModal';
import { exportToXlsx } from '../utils/exportXlsx';
import { eventEmitter, EVENTS } from '../utils/events';
import { toISODate, monthRange } from '../utils/dates';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Mirrors SEARCH_LIMIT in TransactionController — a full result set means the
// server truncated, so the count is a floor rather than a total.
const SEARCH_RESULT_CAP = 200;

const PAGE_SIZE = 50;
// Export pulls the whole filtered set a page at a time; this bounds how far
// that walk can go so a huge range can't hang the browser silently.
const EXPORT_PAGE_SIZE = 500;
const EXPORT_MAX_ROWS = 5000;

const selectCls ='px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500 max-w-[220px]';

export default function Transactions({ onProfileClick }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const deleteLocked = isDeleteLocked('transactions');
  const editLocked = isEditLocked('transactions');

  const now = new Date();
  const getDefaultFilter = () => {
    const saved = localStorage.getItem(FILTER_PREFS_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      return prefs.transactions || 'monthly';
    }
    return 'monthly';
  };
  const [filterType, setFilterType] = useState(getDefaultFilter()); // daily, monthly, yearly, all, custom
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toISODate(now));
  const [customStartDate, setCustomStartDate] = useState(toISODate(now));
  const [customEndDate, setCustomEndDate] = useState(toISODate(now));
  const [cashbackWallets, setCashbackWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [cashbackMode, setCashbackMode] = useState(false);
  const [customFilters, setCustomFilters] = useState(() => {
    const saved = localStorage.getItem(CUSTOM_FILTERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [activeCustomFilter, setActiveCustomFilter] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportBankModal, setShowImportBankModal] = useState(false);
  const [importType, setImportType] = useState('bank-statement');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageMeta, setPageMeta] = useState({
    page: 0, hasNext: false, totalElements: 0, totalIncome: 0, totalExpense: 0,
  });
  const [filterOptions, setFilterOptions] = useState({ categories: [], budgetCategories: [] });

  useEffect(() => {
    getCashbackWallets().then(r => setCashbackWallets(r.data)).catch(() => {});
  }, []);

  // Sync custom filters from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(CUSTOM_FILTERS_KEY);
      setCustomFilters(saved ? JSON.parse(saved) : []);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleWalletSelect = useCallback(async (walletId) => {
    if (walletId === null) {
      setCashbackMode(false);
      setSelectedWalletId(null);
      return;
    }
    setCashbackMode(true);
    setSelectedWalletId(walletId);
    setLoading(true);
    const res = await getCashbackEntriesByWallet(walletId);
    const mapped = (res.data || []).map(e => ({
      id: e.id,
      title: e.description,
      amount: e.amount,
      type: e.type === 'EARNED' ? 'CREDIT' : 'DEBIT',
      category: e.type === 'EARNED' ? 'Cashback Earned' : 'Cashback Redeemed',
      budgetCategory: 'Cashback',
      date: e.date,
      description: e.source || '',
      paymentSource: e.wallet?.platform || '',
      isCashback: true,
    }));
    setTransactions(mapped);
    setLoading(false);
  }, []);

  const applyCustomFilter = (data, customFilter) => {
    if (!customFilter) return data;
    return data.filter(t => {
      const fieldValue = t[customFilter.type];
      if (!fieldValue) return false;
      const strValue = String(fieldValue).toLowerCase();
      const filterValue = customFilter.value.toLowerCase();
      switch (customFilter.condition) {
        case 'equals': return strValue === filterValue;
        case 'contains': return strValue.includes(filterValue);
        case 'startsWith': return strValue.startsWith(filterValue);
        default: return strValue === filterValue;
      }
    });
  };

  // The filter controls collapse to a single date range, shared by the listing,
  // the totals, the filter options and the search.
  const dateRange = useMemo(() => {
    if (filterType === 'daily') return { startDate: selectedDate, endDate: selectedDate };
    if (filterType === 'monthly') return monthRange(selectedYear, selectedMonth);
    if (filterType === 'yearly') return { startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-12-31` };
    if (filterType === 'custom') return { startDate: customStartDate, endDate: customEndDate };
    return {}; // all time — no date bounds
  }, [filterType, selectedMonth, selectedYear, selectedDate, customStartDate, customEndDate]);

  const filterParams = useMemo(() => {
    const params = { ...dateRange };
    if (filter !== 'ALL') params.type = filter;
    if (categoryFilter !== 'ALL') params.category = categoryFilter;
    if (budgetCategoryFilter !== 'ALL') params.budgetCategory = budgetCategoryFilter;
    return params;
  }, [dateRange, filter, categoryFilter, budgetCategoryFilter]);

  const loadPage = useCallback(async (pageNum, append) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await getTransactionsPage({ ...filterParams, page: pageNum, size: PAGE_SIZE });
      const d = res.data;
      setTransactions(prev => (append ? [...prev, ...d.content] : d.content));
      setPageMeta({
        page: d.page,
        hasNext: d.hasNext,
        totalElements: d.totalElements,
        totalIncome: parseFloat(d.totalIncome || 0),
        totalExpense: parseFloat(d.totalExpense || 0),
      });
    } catch (e) {
      console.error('Failed to load transactions', e);
    } finally {
      setLoadingMore(false);
      setLoading(false);
    }
  }, [filterParams]);

  // Any filter change starts a fresh page 0 — appending onto a different
  // filter's rows would mix two result sets.
  useEffect(() => {
    if (cashbackMode) return;
    loadPage(0, false);
  }, [loadPage, cashbackMode]);

  useEffect(() => {
    if (cashbackMode) return;
    getTransactionFilterOptions(dateRange)
      .then(r => setFilterOptions({
        categories: r.data.categories || [],
        budgetCategories: r.data.budgetCategories || [],
      }))
      .catch(() => setFilterOptions({ categories: [], budgetCategories: [] }));
  }, [dateRange, cashbackMode]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchTransactions(searchQuery.trim(), dateRange);
        setSearchResults(res.data);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery, dateRange]);

  // Mutations reset to page 0 rather than patching the loaded rows: the server
  // owns the totals and the ordering, and a local splice would drift from both.
  const handleDelete = async (id) => {
    await deleteTransaction(id);
    // Emit event to refresh assets
    eventEmitter.emit(EVENTS.TRANSACTION_DELETED, { id });
    loadPage(0, false);
  };

  const handleEdit = async (id, data) => {
    await updateTransaction(id, data);
    // Emit event to refresh assets
    eventEmitter.emit(EVENTS.TRANSACTION_UPDATED, { id, ...data });
    loadPage(0, false);
  };

  const handleSave = async (data) => {
    await createTransaction(data);
    // Emit event to refresh assets
    eventEmitter.emit(EVENTS.TRANSACTION_CREATED, data);
    if (cashbackMode) {
      // Refresh cashback view
      handleWalletSelect(selectedWalletId);
    } else {
      loadPage(0, false);
    }
  };

  // Export must cover the whole filtered set, not just the pages on screen, so
  // walk the pages rather than reusing the loaded rows.
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      let rows = [];
      let page = 0;
      let truncated = false;
      for (;;) {
        const res = await getTransactionsPage({ ...filterParams, page, size: EXPORT_PAGE_SIZE });
        rows = rows.concat(res.data.content);
        if (!res.data.hasNext) break;
        if (rows.length >= EXPORT_MAX_ROWS) { truncated = true; break; }
        page += 1;
      }
      if (activeCustomFilter) rows = applyCustomFilter(rows, activeCustomFilter);
      if (truncated) {
        alert(`This range has more than ${EXPORT_MAX_ROWS} transactions. Exporting the most recent ${rows.length}. Narrow the date range for a complete export.`);
      }
      await exportToXlsx({
        transactions: rows,
        filterType,
        month: selectedMonth,
        year: selectedYear,
        date: selectedDate,
      });
    } catch (e) {
      alert('Export failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setExporting(false);
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  // Keep a stale selection visible instead of blanking the select
  const withSelected = (values, selected) =>
    selected !== 'ALL' && !values.includes(selected) ? [selected, ...values] : values;

  // Options come from the server now — a page only carries its own rows, so
  // deriving them from the loaded list would hide most of the real values.
  const categoryOptions = useMemo(
    () => withSelected(filterOptions.categories, categoryFilter),
    [filterOptions.categories, categoryFilter]
  );
  const budgetCategoryOptions = useMemo(
    () => withSelected(filterOptions.budgetCategories, budgetCategoryFilter),
    [filterOptions.budgetCategories, budgetCategoryFilter]
  );
  const categoryFiltersActive = categoryFilter !== 'ALL' || budgetCategoryFilter !== 'ALL';

  // Quick filters match on arbitrary fields, so they stay client-side and apply
  // to the rows loaded so far — "Load more" widens what they can match.
  const visibleTransactions = useMemo(
    () => (activeCustomFilter ? applyCustomFilter(transactions, activeCustomFilter) : transactions),
    [transactions, activeCustomFilter]
  );
  const visibleSearchResults = useMemo(
    () => (searchResults === null ? null
      : activeCustomFilter ? applyCustomFilter(searchResults, activeCustomFilter) : searchResults),
    [searchResults, activeCustomFilter]
  );
  const visibleList = visibleSearchResults ?? visibleTransactions;

  // Totals cover the whole filtered set. While searching or quick-filtering the
  // server totals no longer describe what's on screen, so sum the rows instead.
  const localTotals = searchResults !== null || activeCustomFilter || cashbackMode;
  const monthlyIncome = useMemo(
    () => (localTotals
      ? visibleList.filter(t => t.type === 'CREDIT').reduce((s, t) => s + parseFloat(t.amount), 0)
      : pageMeta.totalIncome),
    [localTotals, visibleList, pageMeta.totalIncome]
  );
  const monthlyExpense = useMemo(
    () => (localTotals
      ? visibleList.filter(t => t.type === 'DEBIT').reduce((s, t) => s + parseFloat(t.amount), 0)
      : pageMeta.totalExpense),
    [localTotals, visibleList, pageMeta.totalExpense]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Transactions" subtitle="All your transactions" onProfileClick={onProfileClick} />
      <div className="flex-1 overflow-y-auto p-8 space-y-5">

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-3">
          {/* Cashback Wallet Filter */}
          {cashbackWallets.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-gray-100 dark:border-gray-700">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"><Gift size={13} /> Cashback</span>
              <button
                onClick={() => handleWalletSelect(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  !cashbackMode ? 'bg-slate-900 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                All Transactions
              </button>
              {cashbackWallets.map(w => (
                <button key={w.id}
                  onClick={() => handleWalletSelect(w.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    cashbackMode && selectedWalletId === w.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600'
                  }`}>
                  <span>{w.icon}</span> {w.platform}
                  {cashbackMode && selectedWalletId === w.id && (
                    <span className="ml-1 bg-white/20 px-1 rounded text-[10px]">₹{parseFloat(w.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Custom Filters */}
          {customFilters.length > 0 && !cashbackMode && (
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-gray-100 dark:border-gray-700">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"><Tag size={13} /> Filters</span>
              <button
                onClick={() => setActiveCustomFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  !activeCustomFilter ? 'bg-slate-900 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                All
              </button>
              {customFilters.map(f => (
                <button key={f.id}
                  onClick={() => setActiveCustomFilter(activeCustomFilter?.id === f.id ? null : f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeCustomFilter?.id === f.id
                      ? 'text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  style={activeCustomFilter?.id === f.id ? { backgroundColor: f.color } : {}}>
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          )}

        {/* Filter Type Tabs */}
          <div className={`flex items-center gap-2 flex-wrap ${cashbackMode || activeCustomFilter ? 'opacity-40 pointer-events-none' : ''}`}>
            {['daily','monthly','yearly','all','custom'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                  filterType === f ? 'bg-slate-900 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'All Time' : f === 'custom' ? 'Custom Range' : f}
              </button>
            ))}
            <button
              onClick={handleExport}
              disabled={exporting || visibleList.length === 0}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-40"
            >
              <Download size={15} /> {exporting ? 'Exporting...' : 'Export XLSX'}
            </button>
          </div>

          {/* Date Pickers — hidden in cashback mode */}
          {/* Daily Picker */}
          {!cashbackMode && filterType === 'daily' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
            />
          )}

          {/* Monthly Picker */}
          {!cashbackMode && filterType === 'monthly' && (
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-slate-800 dark:text-slate-200 w-32 text-center">{MONTHS[selectedMonth]} {selectedYear}</span>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Yearly Picker */}
          {!cashbackMode && filterType === 'yearly' && (
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedYear((y) => y - 1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-slate-800 dark:text-slate-200 w-20 text-center">{selectedYear}</span>
              <button onClick={() => setSelectedYear((y) => y + 1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Custom Date Range Picker */}
          {!cashbackMode && filterType === 'custom' && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase"><Filter size={13} /> Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={selectCls}
            >
              <option value="ALL">All Categories</option>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={budgetCategoryFilter}
              onChange={(e) => setBudgetCategoryFilter(e.target.value)}
              className={selectCls}
            >
              <option value="ALL">All Budget Categories</option>
              {budgetCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {categoryFiltersActive && (
              <button
                onClick={() => { setCategoryFilter('ALL'); setBudgetCategoryFilter('ALL'); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Summary Strip + Add Button */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
          <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-2 sm:p-3 lg:p-4 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">Income</p>
              <p className="text-sm sm:text-base lg:text-lg font-bold text-green-600 dark:text-green-400 truncate" title={`₹${monthlyIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>₹{monthlyIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-2 sm:p-3 lg:p-4 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">Expenses</p>
              <p className="text-sm sm:text-base lg:text-lg font-bold text-red-500 dark:text-red-400 truncate" title={`₹${monthlyExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>₹{monthlyExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2 sm:p-3 lg:p-4 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">Net</p>
              <p className={`text-sm sm:text-base lg:text-lg font-bold truncate ${monthlyIncome - monthlyExpense >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`} title={`₹${Math.abs(monthlyIncome - monthlyExpense).toLocaleString('en-IN')}`}>
                ₹{Math.abs(monthlyIncome - monthlyExpense).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl overflow-hidden border border-emerald-600">
              <button
                onClick={() => { setImportType('bank-statement'); setShowImportBankModal(true); }}
                className="flex items-center gap-2 px-3 py-2 sm:py-3 bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition text-xs sm:text-sm whitespace-nowrap"
              >
                <Upload size={16} /> 🏦 Bank
              </button>
              <div className="w-px bg-emerald-500 self-stretch" />
              <button
                onClick={() => { setImportType('credit-card'); setShowImportBankModal(true); }}
                className="flex items-center gap-2 px-3 py-2 sm:py-3 bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition text-xs sm:text-sm whitespace-nowrap"
              >
                💳 CC
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-semibold hover:bg-slate-700 transition text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Add Transaction</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 p-4 sm:p-5 border-b border-gray-50 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
              {['ALL', 'CREDIT', 'DEBIT'].map((f) => (
                <button key={f} onClick={() => { setFilter(f); setSearchQuery(''); setSearchResults(null); }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition ${
                    filter === f ? 'bg-slate-900 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  {f === 'ALL' ? 'All' : f === 'CREDIT' ? 'Income' : 'Expenses'}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[180px] relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="Search transactions..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-500" />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap"
              title={searchResults !== null && searchResults.length >= SEARCH_RESULT_CAP
                ? `Only the first ${SEARCH_RESULT_CAP} matches are shown. Narrow the search or the date range.`
                : undefined}>
              {searchLoading ? 'Searching...' : searchResults !== null
                ? `${visibleList.length}${searchResults.length >= SEARCH_RESULT_CAP ? '+' : ''} results`
                : cashbackMode ? `${visibleList.length} entries`
                : activeCustomFilter ? `${visibleList.length} of ${transactions.length} loaded`
                : pageMeta.hasNext ? `${visibleList.length} of ${pageMeta.totalElements} transactions`
                : `${pageMeta.totalElements} transactions`}
            </span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {loading && searchResults === null ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-12">Loading...</p>
            ) : searchLoading ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-12">Searching...</p>
            ) : visibleList.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-12">
                {searchResults !== null ? `No results for "${searchQuery}"`
                  : activeCustomFilter ? `No loaded transactions match filter "${activeCustomFilter.name}".`
                  : categoryFiltersActive ? 'No transactions match the selected categories.'
                  : 'No transactions for this period.'}
              </p>
            ) : (
              visibleList.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onDelete={handleDelete}
                  onEdit={setEditingTransaction}
                  deleteLocked={deleteLocked}
                  editLocked={editLocked}
                />
              ))
            )}
          </div>

          {/* Load more — only for the paged listing; search and cashback come
              back whole, so there is nothing further to fetch. */}
          {searchResults === null && !cashbackMode && pageMeta.hasNext && (
            <div className="p-4 border-t border-gray-50 dark:border-gray-700 text-center">
              <button
                onClick={() => loadPage(pageMeta.page + 1, true)}
                disabled={loadingMore}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : `Load more (${pageMeta.totalElements - transactions.length} left)`}
              </button>
            </div>
          )}
        </div>
      </div>

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleEdit}
        />
      )}

      {showAddModal && (
        <AddTransactionModal
          budgetCategory="Miscellaneous"
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Bank Statement Import Modal */}
      {showImportBankModal && (
        <ImportModal
          isOpen={showImportBankModal}
          onClose={() => {
            setShowImportBankModal(false);
            loadPage(0, false);
          }}
          type={importType}
        />
      )}
    </div>
  );
}
