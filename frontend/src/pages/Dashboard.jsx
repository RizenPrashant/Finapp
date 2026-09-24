/**
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeft, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import BudgetCard from '../components/BudgetCard';
import TransactionRow from '../components/TransactionRow';
import AddTransactionModal from '../components/AddTransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import Header from '../components/Header';
import { isDeleteLocked, FILTER_PREFS_KEY } from '../pages/Settings';
import {
  getDashboardSummary,
  getBudgets,
  getTransactionsByBudget,
  getTransactionsByType,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCashbackWallets,
  getCashbackEntries,
  getTradingAnalytics,
} from '../api';
import { eventEmitter, EVENTS } from '../utils/events';

export default function Dashboard({ onNavigate, onProfileClick }) {
  const [summary, setSummary] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [budgetSpent, setBudgetSpent] = useState({});
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cashbackTotal, setCashbackTotal] = useState(0);
  const deleteLocked = isDeleteLocked('transactions');

  // Date filters for dashboard
  const now = new Date();
  const getDefaultFilter = () => {
    const saved = localStorage.getItem(FILTER_PREFS_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      return prefs.dashboard || 'monthly';
    }
    return 'monthly';
  };
  const [filterType, setFilterType] = useState(getDefaultFilter());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState(now.toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(now.toISOString().split('T')[0]);

  // Helper to get date range params based on filter type
  const getDateRangeParams = useCallback(() => {
    if (filterType === 'daily') {
      return { startDate: selectedDate, endDate: selectedDate };
    } else if (filterType === 'weekly') {
      const d = new Date(selectedDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
      const weekStart = new Date(d.setDate(diff));
      const weekEnd = new Date(d.setDate(weekStart.getDate() + 6));
      return {
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0]
      };
    } else if (filterType === 'monthly') {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else if (filterType === 'yearly') {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`
      };
    } else if (filterType === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    // 'all' - no date params
    return {};
  }, [filterType, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const fetchSummary = useCallback(async () => {
    const params = getDateRangeParams();
    const res = await getDashboardSummary(params);
    setSummary(res.data);
  }, [getDateRangeParams]);

  const fetchBudgets = useCallback(async () => {
    const res = await getBudgets();
    setBudgets(res.data);
    const dateParams = getDateRangeParams();
    const spentMap = {};
    const budgetTxResults = await Promise.all(
      res.data.map(b => getTransactionsByBudget(b.category, dateParams))
    );
    res.data.forEach((b, i) => {
      const txs = budgetTxResults[i].data;
      if (b.category === 'Monthly Revenue') {
        spentMap[b.category] = txs
          .filter(tx => tx.type === 'CREDIT')
          .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      } else {
        spentMap[b.category] = txs
          .filter(tx => tx.type === 'DEBIT')
          .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      }
    });
    // Monthly Total Expense = sum of its 3 sub-categories
    const combinedCats = ['Monthly Food Expense', 'Monthly Spend', 'Miscellaneous'];
    if (combinedCats.every(c => spentMap[c] !== undefined)) {
      spentMap['Monthly Total Expense'] = combinedCats.reduce((sum, c) => sum + (spentMap[c] || 0), 0);
    }

    // Add cashback + trading to Monthly Revenue separately (non-blocking)
    const { startDate, endDate } = dateParams;
    const inRange = (dateStr) => {
      if (!startDate || !endDate) return true;
      const d = String(dateStr).substring(0, 10);
      return d >= startDate && d <= endDate;
    };
    setBudgetSpent({ ...spentMap });

    // Fetch cashback + trading in background and update Monthly Revenue
    Promise.all([
      getCashbackEntries().catch(() => ({ data: [] })),
      getTradingAnalytics().catch(() => ({ data: { monthlyPnL: {} } })),
    ]).then(([cashbackRes, analyticsRes]) => {
      const cashbackSum = (cashbackRes.data || [])
        .filter(e => e.type === 'EARNED' && inRange(e.date))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const monthlyPnL = analyticsRes.data?.monthlyPnL || {};
      let tradingSum = 0;
      Object.entries(monthlyPnL).forEach(([monthKey, pnl]) => {
        const pnlNum = parseFloat(pnl);
        if (pnlNum > 0 && inRange(`${monthKey}-01`)) tradingSum += pnlNum;
      });
      if (cashbackSum > 0 || tradingSum > 0) {
        setBudgetSpent(prev => ({
          ...prev,
          'Monthly Revenue': (prev['Monthly Revenue'] || 0) + cashbackSum + tradingSum,
        }));
      }
    });
  }, [getDateRangeParams]);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchBudgets()]).finally(() => setLoading(false));
    getCashbackWallets().then(r => {
      const total = (r.data || []).reduce((s, w) => s + parseFloat(w.balance || 0), 0);
      setCashbackTotal(total);
    }).catch(() => {});
  }, [fetchSummary, fetchBudgets]);

  // Refetch when date filters change
  useEffect(() => {
    if (!loading) {
      fetchSummary();
      fetchBudgets();
    }
  }, [filterType, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Listen for transaction events from other pages to refresh dashboard
  useEffect(() => {
    const handleTransactionChange = () => {
      // Refresh dashboard data when transactions change on other pages
      fetchSummary();
      fetchBudgets();
      // Also refresh cashback total
      getCashbackWallets().then(r => {
        const total = (r.data || []).reduce((s, w) => s + parseFloat(w.balance || 0), 0);
        setCashbackTotal(total);
      }).catch(() => {});
    };

    const unsubscribeCreate = eventEmitter.on(EVENTS.TRANSACTION_CREATED, handleTransactionChange);
    const unsubscribeUpdate = eventEmitter.on(EVENTS.TRANSACTION_UPDATED, handleTransactionChange);
    const unsubscribeDelete = eventEmitter.on(EVENTS.TRANSACTION_DELETED, handleTransactionChange);
    const unsubscribeImport = eventEmitter.on(EVENTS.TRANSACTIONS_IMPORTED, handleTransactionChange);

    return () => {
      unsubscribeCreate();
      unsubscribeUpdate();
      unsubscribeDelete();
      unsubscribeImport();
    };
  }, [fetchSummary, fetchBudgets]);

  const COMBINED_EXPENSE_CATEGORIES = ['Monthly Food Expense', 'Monthly Spend', 'Miscellaneous'];
  const REVENUE_CATEGORY = 'Monthly Revenue';

  const handleBudgetClick = async (budget) => {
    setSelectedBudget(budget);
    const dateParams = getDateRangeParams();
    if (budget.category === 'Monthly Total Expense') {
      const results = await Promise.all(
        COMBINED_EXPENSE_CATEGORIES.map(cat => getTransactionsByBudget(cat, dateParams))
      );
      const all = results.flatMap(r => r.data).sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(all);
    } else if (budget.category === REVENUE_CATEGORY) {
      const [txRes, cashbackRes, analyticsRes] = await Promise.all([
        getTransactionsByBudget(REVENUE_CATEGORY, dateParams),
        getCashbackEntries().catch(() => ({ data: [] })),
        getTradingAnalytics().catch(() => ({ data: { monthlyPnL: {} } })),
      ]);
      const creditTxs = txRes.data.filter(tx => tx.type === 'CREDIT');
      const { startDate, endDate } = dateParams;

      const inRange = (dateStr) => {
        if (!startDate || !endDate) return true;
        const d = String(dateStr).substring(0, 10);
        return d >= startDate && d <= endDate;
      };

      const cashbackVirtual = (cashbackRes.data || [])
        .filter(e => e.type === 'EARNED' && inRange(e.date))
        .map(e => ({
          id: `cb-${e.id}`,
          title: `Cashback: ${e.source || e.description}`,
          amount: e.amount,
          type: 'CREDIT',
          category: 'Cashback',
          budgetCategory: REVENUE_CATEGORY,
          date: String(e.date).substring(0, 10),
          description: e.description,
          paymentSource: 'Cashback Wallet',
          virtual: true,
        }));

      const tradingVirtual = [];
      const monthlyPnL = analyticsRes.data?.monthlyPnL || {};
      Object.entries(monthlyPnL).forEach(([monthKey, pnl]) => {
        const pnlNum = parseFloat(pnl);
        if (pnlNum <= 0) return;
        const entryDate = `${monthKey}-01`;
        if (!inRange(entryDate)) return;
        tradingVirtual.push({
          id: `trade-${monthKey}`,
          title: `Trading Profit (${monthKey})`,
          amount: pnlNum,
          type: 'CREDIT',
          category: 'Trading',
          budgetCategory: REVENUE_CATEGORY,
          date: entryDate,
          description: `Realized P&L for ${monthKey}`,
          paymentSource: 'Trading Account',
          virtual: true,
        });
      });

      const all = [...creditTxs, ...cashbackVirtual, ...tradingVirtual]
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(all);
    } else {
      const res = await getTransactionsByBudget(budget.category, dateParams);
      setTransactions(res.data);
    }
  };

  const handleStatClick = async (type) => {
    if (type === 'BALANCE') {
      setSelectedBudget({ category: 'Balance Breakdown', virtual: true, isBalance: true });
      const [creditRes, debitRes] = await Promise.all([
        getTransactionsByType('CREDIT'),
        getTransactionsByType('DEBIT'),
      ]);
      setTransactions([...creditRes.data, ...debitRes.data].sort((a, b) => new Date(b.date) - new Date(a.date)));
      return;
    }
    if (type === 'SAVINGS') {
      setSelectedBudget({ category: 'Savings Overview', virtual: true, isSavings: true });
      const res = await getTransactionsByBudget('Monthly Total Savings');
      setTransactions(res.data);
      return;
    }
    setSelectedBudget({ category: type === 'CREDIT' ? 'All Income' : 'All Expenses', virtual: true });
    const res = await getTransactionsByType(type);
    setTransactions(res.data);
  };

  const handleSaveTransaction = async (data) => {
    await createTransaction(data);
    eventEmitter.emit(EVENTS.TRANSACTION_CREATED, data);
    if (selectedBudget?.category === REVENUE_CATEGORY) {
      await handleBudgetClick(selectedBudget);
    } else {
      const dateParams = getDateRangeParams();
      const res = await getTransactionsByBudget(selectedBudget.category, dateParams);
      setTransactions(res.data);
    }
    fetchSummary();
    fetchBudgets();
  };

  const handleEdit = async (id, data) => {
    await updateTransaction(id, data);
    eventEmitter.emit(EVENTS.TRANSACTION_UPDATED, { id, ...data });
    if (selectedBudget?.category === REVENUE_CATEGORY) {
      await handleBudgetClick(selectedBudget);
    } else {
      const dateParams = getDateRangeParams();
      const res = await getTransactionsByBudget(selectedBudget.category, dateParams);
      setTransactions(res.data);
    }
    fetchSummary();
    fetchBudgets();
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    eventEmitter.emit(EVENTS.TRANSACTION_DELETED, { id });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    fetchSummary();
    fetchBudgets();
  };

  const fmt = (val) => { const n = parseFloat(val ?? 0); return isNaN(n) ? '₹0.00' : '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">Loading...</div>;

  if (selectedBudget) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Financial Dashboard" subtitle="October 2025" budgets={budgets} budgetSpent={budgetSpent} onProfileClick={onProfileClick} />
      <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-50 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedBudget(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-slate-200">{selectedBudget.category}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{transactions.length} transactions</p>
                </div>
              </div>
              {!selectedBudget.virtual && selectedBudget.category !== 'Monthly Total Expense' && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition text-sm"
                >
                  <Plus size={16} /> Add Transaction
                </button>
              )}
            </div>

            {/* Monthly Total Expense Breakdown */}
            {selectedBudget.category === 'Monthly Total Expense' && (
              <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-50 dark:border-gray-700">
                {COMBINED_EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{cat}</p>
                    <p className="text-lg font-bold text-red-500 dark:text-red-400">{fmt(budgetSpent[cat] || 0)}</p>
                  </div>
                ))}
              </div>
            )}
            {selectedBudget.isBalance && (
              <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-50 dark:border-gray-700">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(summary?.totalIncome)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
                  <p className="text-lg font-bold text-red-500 dark:text-red-400">{fmt(summary?.totalExpenses)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net Balance</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(summary?.totalBalance)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Income − Expenses</p>
                </div>
              </div>
            )}

            {/* Savings Breakdown */}
            {selectedBudget.isSavings && (
              <div className="grid grid-cols-2 gap-4 p-6 border-b border-gray-50 dark:border-gray-700">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Savings</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(summary?.totalSavings)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Savings Rate</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary?.savingsRate?.toFixed(1) ?? 0}%</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">of Total Income</p>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 py-12">No transactions found.</p>
              ) : (
                transactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} onDelete={handleDelete} onEdit={setEditingTransaction} deleteLocked={deleteLocked} />
                ))
              )}
            </div>
          </div>
        </div>
        {showModal && (
          <AddTransactionModal
            budgetCategory={selectedBudget.category}
            onClose={() => setShowModal(false)}
            onSave={handleSaveTransaction}
          />
        )}
        {editingTransaction && (
          <EditTransactionModal
            transaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
            onSave={handleEdit}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Financial Dashboard" subtitle="October 2025" budgets={budgets} budgetSpent={budgetSpent} onProfileClick={onProfileClick} />
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Date Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-gray-400 mr-2">
              <Calendar size={16} />
              <span className="text-xs font-medium uppercase">Period</span>
            </div>
            {['daily', 'weekly', 'monthly', 'yearly', 'all', 'custom'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  filterType === type
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}

            {/* Date Navigation */}
            {filterType === 'daily' && (
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                />
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRight size={16} /></button>
              </div>
            )}

            {filterType === 'monthly' && (
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => {
                  if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
                  else setSelectedMonth(m => m - 1);
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[100px] text-center">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][selectedMonth]} {selectedYear}
                </span>
                <button onClick={() => {
                  if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
                  else setSelectedMonth(m => m + 1);
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRight size={16} /></button>
              </div>
            )}

            {filterType === 'yearly' && (
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[60px] text-center">{selectedYear}</span>
                <button onClick={() => setSelectedYear(y => y + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRight size={16} /></button>
              </div>
            )}

            {filterType === 'custom' && (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          <StatsCard title="Total Balance" value={fmt(summary?.totalBalance)} change="+12.5%" positive icon="💰" onClick={() => handleStatClick('BALANCE')} />
          <StatsCard title="Total Income" value={fmt(summary?.totalIncome)} change="+5.2%" positive icon="📈" onClick={() => handleStatClick('CREDIT')} />
          <StatsCard title="Total Expenses" value={fmt(summary?.totalExpenses)} change="+8.1%" positive={false} icon="📉" onClick={() => handleStatClick('DEBIT')} />
          <StatsCard title="Savings Rate" value={`${summary?.savingsRate?.toFixed(1) ?? 0}%`} change="+2.3%" positive icon="🏦" onClick={() => handleStatClick('SAVINGS')} />
          <StatsCard title="Cashback Balance" value={`₹${cashbackTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} change="" positive icon="🎁" onClick={() => onNavigate('Cashback')} />
        </div>

        {/* Budget Overview */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Budget Overview</h2>
            <button onClick={() => onNavigate('Settings')} className="text-sm font-semibold border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-white">
              Set New Limits
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {budgets.map((b) => (
              <BudgetCard
                key={b.id}
                budget={b}
                spent={budgetSpent[b.category] || 0}
                onClick={() => handleBudgetClick(b)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
