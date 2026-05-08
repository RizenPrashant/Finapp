import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Trash2, Pencil, AlertTriangle } from 'lucide-react';

function DeleteConfirmDialog({ transaction, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-xl">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <h3 className="font-bold text-slate-800">Delete Transaction?</h3>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-semibold text-slate-700">{transaction.title}</span>
        </p>
        <p className="text-sm text-gray-400 mb-6">
          ₹{parseFloat(transaction.amount).toLocaleString()} · {transaction.date}
        </p>
        <p className="text-xs text-red-400 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition"
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
      <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-full ${isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
            {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">{transaction.title}</p>
            <p className="text-xs text-gray-400">{transaction.date} · {transaction.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
            {isCredit ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString()}
          </p>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
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
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
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
