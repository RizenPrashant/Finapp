import { useState } from 'react';
import { X } from 'lucide-react';

const categoryOptions = {
  'Monthly Food Expense': ['Groceries', 'Dining Out', 'Cafe', 'Food Delivery'],
  'Monthly Spend': ['Rent', 'Utilities', 'Transport', 'Housing', 'Bills'],
  'Monthly Investment': ['Mutual Fund', 'Stocks', 'Gold', 'FD'],
  'Monthly Total Savings': ['Savings Deposit'],
  'Miscellaneous': ['Entertainment', 'Health', 'Shopping', 'Others'],
  'Income': ['Salary', 'Freelance', 'Business', 'Others'],
};

export default function AddTransactionModal({ budgetCategory, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'DEBIT',
    category: categoryOptions[budgetCategory]?.[0] || 'Others',
    budgetCategory: budgetCategory,
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ ...form, amount: parseFloat(form.amount) });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition">
          <X size={22} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">Add Transaction — {budgetCategory}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Transaction Type</label>
            <div className="flex gap-6">
              {['DEBIT', 'CREDIT'].map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm font-medium dark:text-gray-300">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={form.type === t}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="accent-black dark:accent-white"
                  />
                  {t === 'DEBIT' ? 'Debit (Expense)' : 'Credit (Income)'}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Description</label>
            <input
              required
              type="text"
              placeholder="Enter description"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Amount (₹)</label>
            <input
              required
              type="number"
              min="1"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
            >
              {(categoryOptions[budgetCategory] || ['Others']).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-semibold border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition dark:text-white">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-700 text-sm transition disabled:opacity-60">
              {loading ? 'Saving...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
