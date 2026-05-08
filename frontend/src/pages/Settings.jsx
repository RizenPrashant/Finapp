import { useState, useEffect } from 'react';
import { Shield, ShieldOff } from 'lucide-react';
import Header from '../components/Header';
import { getBudgets, saveBudget } from '../api';

export const DELETE_LOCK_KEY = 'finapp_delete_locked';

export default function Settings() {
  const [budgets, setBudgets] = useState([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteLocked, setDeleteLocked] = useState(
    () => localStorage.getItem(DELETE_LOCK_KEY) === 'true'
  );

  useEffect(() => {
    getBudgets()
      .then((res) => setBudgets(res.data.map((b) => ({ ...b, limitAmount: String(b.limitAmount) }))))
      .finally(() => setLoading(false));
  }, []);

  const toggleDeleteLock = () => {
    const next = !deleteLocked;
    setDeleteLocked(next);
    localStorage.setItem(DELETE_LOCK_KEY, String(next));
  };

  const handleChange = (index, field, value) => {
    setBudgets((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const handleSave = async () => {
    await Promise.all(budgets.map((b) => saveBudget({ ...b, limitAmount: parseFloat(b.limitAmount) })));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Settings" subtitle="Manage your budget limits" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl">

          {/* Delete Lock */}
          <div className={`flex items-center justify-between p-5 rounded-2xl mb-8 border-2 transition-all ${
            deleteLocked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${deleteLocked ? 'bg-green-100' : 'bg-gray-200'}`}>
                {deleteLocked
                  ? <Shield size={22} className="text-green-600" />
                  : <ShieldOff size={22} className="text-gray-400" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Delete Lock</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {deleteLocked ? '🔒 Transactions are protected from deletion' : '🔓 Transactions can be deleted'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDeleteLock}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                deleteLocked ? 'bg-green-500 shadow-green-200 shadow-md' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                deleteLocked ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <h2 className="font-bold text-slate-800 mb-6">Budget Limits</h2>

          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading...</p>
          ) : (
            <div className="space-y-6">
              {budgets.map((b, i) => (
                <div key={b.category} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  {/* Category name + color */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">{b.category}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Color</span>
                      <input
                        type="color"
                        value={b.color || '#4CAF50'}
                        onChange={(e) => handleChange(i, 'color', e.target.value)}
                        className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Limit Amount */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Limit Amount (₹)</label>
                    <input
                      type="number"
                      value={b.limitAmount}
                      onChange={(e) => handleChange(i, 'limitAmount', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-slate-300 text-sm"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Note</label>
                    <input
                      type="text"
                      value={b.note || ''}
                      onChange={(e) => handleChange(i, 'note', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-slate-300 text-sm"
                    />
                  </div>

                  {/* Preview bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full w-3/4 transition-all" style={{ background: b.color || '#4CAF50' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-8 w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-700 transition text-sm disabled:opacity-50"
          >
            {saved ? '✓ Saved!' : 'Save Budget Limits'}
          </button>
        </div>
      </div>
    </div>
  );
}
