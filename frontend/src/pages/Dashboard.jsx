import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import BudgetCard from '../components/BudgetCard';
import TransactionRow from '../components/TransactionRow';
import AddTransactionModal from '../components/AddTransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import Header from '../components/Header';
import { DELETE_LOCK_KEY } from '../pages/Settings';
import {
  getDashboardSummary,
  getBudgets,
  getTransactionsByBudget,
  getTransactionsByType,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../api';

export default function Dashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [budgetSpent, setBudgetSpent] = useState({});
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const deleteLocked = localStorage.getItem(DELETE_LOCK_KEY) === 'true';

  const fetchSummary = useCallback(async () => {
    const res = await getDashboardSummary();
    setSummary(res.data);
  }, []);

  const fetchBudgets = useCallback(async () => {
    const res = await getBudgets();
    setBudgets(res.data);
    const spentMap = {};
    await Promise.all(
      res.data.map(async (b) => {
        const t = await getTransactionsByBudget(b.category);
        spentMap[b.category] = t.data
          .filter((tx) => tx.type === 'DEBIT')
          .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      })
    );
    setBudgetSpent(spentMap);
  }, []);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchBudgets()]).finally(() => setLoading(false));
  }, [fetchSummary, fetchBudgets]);

  const handleBudgetClick = async (budget) => {
    setSelectedBudget(budget);
    const res = await getTransactionsByBudget(budget.category);
    setTransactions(res.data);
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
    const res = await getTransactionsByBudget(selectedBudget.category);
    setTransactions(res.data);
    fetchSummary();
    fetchBudgets();
  };

  const handleEdit = async (id, data) => {
    await updateTransaction(id, data);
    const res = await getTransactionsByBudget(selectedBudget.category);
    setTransactions(res.data);
    fetchSummary();
    fetchBudgets();
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    fetchSummary();
    fetchBudgets();
  };

  const fmt = (val) => val != null ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '₹0';

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>;

  if (selectedBudget) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Financial Dashboard" subtitle="October 2025" budgets={budgets} budgetSpent={budgetSpent} />
      <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedBudget(null)} className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200 transition">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="font-bold text-slate-800">{selectedBudget.category}</h2>
                  <p className="text-xs text-gray-400">{transactions.length} transactions</p>
                </div>
              </div>
              {!selectedBudget.virtual && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition text-sm"
                >
                  <Plus size={16} /> Add Transaction
                </button>
              )}
            </div>

            {/* Balance Breakdown */}
            {selectedBudget.isBalance && (
              <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-50">
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Income</p>
                  <p className="text-lg font-bold text-green-600">{fmt(summary?.totalIncome)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
                  <p className="text-lg font-bold text-red-500">{fmt(summary?.totalExpenses)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Net Balance</p>
                  <p className="text-lg font-bold text-blue-600">{fmt(summary?.totalBalance)}</p>
                  <p className="text-xs text-gray-400">Income − Expenses</p>
                </div>
              </div>
            )}

            {/* Savings Breakdown */}
            {selectedBudget.isSavings && (
              <div className="grid grid-cols-2 gap-4 p-6 border-b border-gray-50">
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Savings</p>
                  <p className="text-lg font-bold text-green-600">{fmt(summary?.totalSavings)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Savings Rate</p>
                  <p className="text-lg font-bold text-blue-600">{summary?.savingsRate?.toFixed(1) ?? 0}%</p>
                  <p className="text-xs text-gray-400">of Total Income</p>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No transactions found.</p>
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
      <Header title="Financial Dashboard" subtitle="October 2025" budgets={budgets} budgetSpent={budgetSpent} />
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatsCard title="Total Balance" value={fmt(summary?.totalBalance)} change="+12.5%" positive icon="💰" onClick={() => handleStatClick('BALANCE')} />
          <StatsCard title="Total Income" value={fmt(summary?.totalIncome)} change="+5.2%" positive icon="📈" onClick={() => handleStatClick('CREDIT')} />
          <StatsCard title="Total Expenses" value={fmt(summary?.totalExpenses)} change="+8.1%" positive={false} icon="📉" onClick={() => handleStatClick('DEBIT')} />
          <StatsCard title="Savings Rate" value={`${summary?.savingsRate?.toFixed(1) ?? 0}%`} change="+2.3%" positive icon="🏦" onClick={() => handleStatClick('SAVINGS')} />
        </div>

        {/* Budget Overview */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-800">Budget Overview</h2>
            <button onClick={() => onNavigate('Settings')} className="text-sm font-semibold border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition">
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
