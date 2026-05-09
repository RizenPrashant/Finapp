import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Header from '../components/Header';
import TransactionRow from '../components/TransactionRow';
import EditTransactionModal from '../components/EditTransactionModal';
import { DELETE_LOCK_KEY } from '../pages/Settings';
import { getTransactions, updateTransaction, deleteTransaction } from '../api';
import { exportToXlsx } from '../utils/exportXlsx';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Transactions({ onProfileClick }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const deleteLocked = localStorage.getItem(DELETE_LOCK_KEY) === 'true';

  const now = new Date();
  const [filterType, setFilterType] = useState('monthly'); // daily, monthly, yearly, all
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [allMonths, setAllMonths] = useState(false);

  const fetchTransactions = async (month, year, type, all, fType, date) => {
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
    }
    // all = no date params
    if (type !== 'ALL') params.type = type;
    const res = await getTransactions(params);
    const data = fType === 'daily' ? res.data.filter((t) => t.date === date) : res.data;
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions(selectedMonth, selectedYear, filter, allMonths, filterType, selectedDate);
  }, [selectedMonth, selectedYear, filter, allMonths, filterType, selectedDate]);

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleEdit = async (id, data) => {
    await updateTransaction(id, data);
    fetchTransactions(selectedMonth, selectedYear, filter, allMonths, filterType, selectedDate);
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
          {/* Filter Type Tabs */}
          <div className="flex items-center gap-2">
            {['daily','monthly','yearly','all'].map((f) => (
              <button
                key={f}
                onClick={() => { setFilterType(f); setAllMonths(f === 'all'); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                  filterType === f ? 'bg-slate-900 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'All Time' : f}
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

          {/* Daily Picker */}
          {filterType === 'daily' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
            />
          )}

          {/* Monthly Picker */}
          {filterType === 'monthly' && (
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
          {filterType === 'yearly' && (
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
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Income</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">₹{monthlyIncome.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expenses</p>
            <p className="text-lg font-bold text-red-500 dark:text-red-400">₹{monthlyExpense.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net</p>
            <p className={`text-lg font-bold ${monthlyIncome - monthlyExpense >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
              ₹{Math.abs(monthlyIncome - monthlyExpense).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 p-6 border-b border-gray-50 dark:border-gray-700">
            {['ALL', 'CREDIT', 'DEBIT'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  filter === f ? 'bg-slate-900 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'CREDIT' ? 'Income' : 'Expenses'}
              </button>
            ))}
            <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">{transactions.length} transactions</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {loading ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-12">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-12">No transactions for this period.</p>
            ) : (
              transactions.map((t) => (
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
    </div>
  );
}
