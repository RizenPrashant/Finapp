import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Trash2, Pencil, AlertTriangle, Building2, Gift, HandCoins, Tag } from 'lucide-react';
import { recategorizeTransaction } from '../api';

const BUDGET_CATEGORIES = [
  'Monthly Spend', 'Monthly Total Savings', 'Monthly Total Expense',
  'Monthly Food Expense', 'Monthly Revenue', 'Miscellaneous', 'Uncategorized'
];

const CATEGORIES = [
  'Food', 'Shopping', 'Salary', 'Fuel', 'Transport', 'Utilities',
  'Entertainment', 'Cash Withdrawal', 'Loan EMI', 'Insurance',
  'Investment', 'Rent', 'Interest', 'Refund', 'Cashback Earned',
  'Cashback Redeemed', 'Trading', 'Savings', 'Health', 'Freelance', 'Uncategorized'
];

function DeleteConfirmDialog({ transaction, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-xl">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Delete Transaction?</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{transaction.title}</span>
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          ₹{parseFloat(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {transaction.date}
        </p>
        <p className="text-xs text-red-400 dark:text-red-500 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 font-semibold border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition dark:text-white">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm transition">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function RecategorizePopup({ transaction, onSave, onClose }) {
  const [category, setCategory] = useState(transaction.category || 'Uncategorized');
  const [budgetCategory, setBudgetCategory] = useState(transaction.budgetCategory || 'Uncategorized');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await recategorizeTransaction(transaction.id, category, budgetCategory);
      onSave({ ...transaction, category, budgetCategory });
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl">
            <Tag size={18} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Re-categorize</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{transaction.title}</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Budget Overview Category</label>
          <select value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400">
            {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Budget Overview updates automatically.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 font-semibold border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition dark:text-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionRow({ transaction: initialTransaction, onDelete, onEdit, deleteLocked, onCategoryChange }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRecategorize, setShowRecategorize] = useState(false);
  const [transaction, setTransaction] = useState(initialTransaction);
  const isCredit = transaction.type === 'CREDIT';

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (deleteLocked) return;
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onDelete(transaction.id);
  };

  const handleCategorySaved = (updated) => {
    setTransaction(updated);
    onCategoryChange?.(updated);
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-full ${isCredit ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-red-100 dark:bg-red-900/20 text-red-500'}`}>
            {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{transaction.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-400 dark:text-gray-500">{transaction.date} · {transaction.category}</p>
              {transaction.paymentSource && (() => {
                const isCashback = transaction.category === 'Cashback Earned' || transaction.category === 'Cashback Redeemed' || transaction.budgetCategory === 'Cashback';
                return (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                    isCashback
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  }`}>
                    {isCashback ? <Gift size={9} /> : <Building2 size={9} />}
                    {transaction.paymentSource}
                  </span>
                );
              })()}
              {transaction.isUdhar && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-semibold">
                  <HandCoins size={9} />
                  Udhar
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className={`font-bold ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {isCredit ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {transaction.balanceAfter != null && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Bal: ₹{parseFloat(transaction.balanceAfter).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
          {!transaction.virtual && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowRecategorize(true); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
              title="Re-categorize"
            >
              <Tag size={15} />
            </button>
          )}
          {onEdit && !transaction.virtual && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
          )}
          {onDelete && !transaction.virtual && (
            <button
              onClick={handleDeleteClick}
              className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                deleteLocked
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
              title={deleteLocked ? 'Delete is locked. Unlock in Settings.' : 'Delete'}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <DeleteConfirmDialog
          transaction={transaction}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {showRecategorize && (
        <RecategorizePopup
          transaction={transaction}
          onSave={handleCategorySaved}
          onClose={() => setShowRecategorize(false)}
        />
      )}
    </>
  );
}
