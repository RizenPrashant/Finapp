/**
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Gift, Plus, Search, Tag, Upload, X } from 'lucide-react';
import Header from '../components/Header';
import TransactionRow from '../components/TransactionRow';
import EditTransactionModal from '../components/EditTransactionModal';
import AddTransactionModal from '../components/AddTransactionModal';
import { isDeleteLocked, FILTER_PREFS_KEY, CUSTOM_FILTERS_KEY } from '../pages/Settings';
import { getTransactions, searchTransactions, updateTransaction, deleteTransaction, createTransaction, getCashbackWallets, getCashbackEntriesByWallet } from '../api';
import ImportModal from '../components/ImportModal';
import { exportToXlsx } from '../utils/exportXlsx';
import { eventEmitter, EVENTS } from '../utils/events';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Transactions({ onProfileClick }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const deleteLocked = isDeleteLocked('transactions');

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
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [allMonths, setAllMonths] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(now.toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(now.toISOString().split('T')[0]);
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

  const fetchTransactions = async (month, year, type, all, fType, date, startDate, endDate, customFilter) => {
    setLoading(true);
    const params = {};
    if (fType === 'daily') {
      params.month = new Date(date).getMonth() + 1;
      params.year = new Date(date).getFullYear();
    } else if (fType === 'monthly') {
      params.month = month + 1;
      params.year = year;
    } else if (fType === 'yearly') {
      params.year = year;
    } else if (fType === 'custom') {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    // all = no date params
    if (type !== 'ALL') params.type = type;
    const res = await getTransactions(params);
    let data = fType === 'daily' ? res.data.filter((t) => t.date === date) : res.data;
    // Apply custom filter if active
    if (customFilter) {
      data = applyCustomFilter(data, customFilter);
    }
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    if (cashbackMode) return;
    fetchTransactions(selectedMonth, selectedYear, filter, allMonths, filterType, selectedDate, customStartDate, customEndDate, activeCustomFilter);
  }, [selectedMonth, selectedYear, filter, allMonths, filterType, selectedDate, customStartDate, customEndDate, cashbackMode, activeCustomFilter]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = {};
        if (filterType === 'monthly') {
          params.startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2,'0')}-01`;
          params.endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
        } else if (filterType === 'yearly') {
          params.startDate = `${selectedYear}-01-01`;
          params.endDate = `${selectedYear}-12-31`;
        } else if (filterType === 'custom') {
          params.startDate = customStartDate;
          params.endDate = customEndDate;
        }
        const res = await searchTransactions(searchQuery.trim(), params);
        setSearchResults(res.data);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery, filterType, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    // Emit event to refresh assets
    eventEmitter.emit(EVENTS.TRANSACTION_DELETED, { id });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleEdit = async (id, data) => {
    await updateTransaction(id, data);
    // Emit event to refresh assets
    eventEmitter.emit(EVENTS.TRANSACTION_UPDATED, { id, ...data });
    fetchTransactions(selectedMonth, selectedYear, filter, allMonths, filterType, selectedDate, customStartDate, customEndDate, activeCustomFilter);
  };

  const handleSave = async (data) => {
    await createTransaction(data);
    // Emit event to refresh assets
    eventEmitter.emit(EVENTS.TRANSACTION_CREATED, data);
    if (cashbackMode) {
      // Refresh cashback view
      handleWalletSelect(selectedWalletId);
    } else {
      fetchTransactions(selectedMonth, selectedYear, filter, allMonths, filterType, selectedDate, customStartDate, customEndDate, activeCustomFilter);
    }
  };

  const handleExport = async () => {
    await exportToXlsx({
      transactions,
      filterType,
      month: selectedMonth,
      year: selectedYear,
      date: selectedDate,
    });
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  const monthlyIncome = useMemo(() => transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + parseFloat(t.amount), 0), [transactions]);
  const monthlyExpense = useMemo(() => transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + parseFloat(t.amount), 0), [transactions]);

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
                onClick={() => { setFilterType(f); setAllMonths(f === 'all'); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                  filterType === f ? 'bg-slate-900 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'All Time' : f === 'custom' ? 'Custom Range' : f}
              </button>
            ))}
            <button
              onClick={handleExport}
              disabled={transactions.length === 0}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-40"
            >
              <Download size={15} /> Export XLSX
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
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {searchLoading ? 'Searching...' : searchResults !== null
                ? `${searchResults.length} results`
                : `${transactions.length} transactions`}
            </span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {loading && searchResults === null ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-12">Loading...</p>
            ) : searchLoading ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-12">Searching...</p>
            ) : (searchResults ?? transactions).length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-12">
                {searchResults !== null ? `No results for "${searchQuery}"` : activeCustomFilter ? `No transactions match filter "${activeCustomFilter.name}".` : 'No transactions for this period.'}
              </p>
            ) : (
              (searchResults ?? transactions).map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onDelete={handleDelete}
                  onEdit={setEditingTransaction}
                  deleteLocked={deleteLocked}
                />
              ))
            )}
          </div>
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
            fetchTransactions();
          }}
          type={importType}
        />
      )}
    </div>
  );
}
