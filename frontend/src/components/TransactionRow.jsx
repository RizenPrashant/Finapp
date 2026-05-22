import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Trash2, Pencil, AlertTriangle, Building2, CreditCard, Gift, HandCoins } from 'lucide-react';

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
          ₹{parseFloat(transaction.amount).toLocaleString()} · {transaction.date}
        </p>
        <p className="text-xs text-red-400 dark:text-red-500 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 font-semibold border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionRow({ transaction, onDelete, onEdit, deleteLocked }) {
  const [showConfirm, setShowConfirm] = useState(false);
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
              {isCredit ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString()}
            </p>
            {transaction.balanceAfter != null && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Bal: ₹{parseFloat(transaction.balanceAfter).toLocaleString()}
              </p>
            )}
          </div>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
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
    </>
  );
}
