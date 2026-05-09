import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Building2, Plus, Trash2 } from 'lucide-react';
import Header from '../components/Header';
import { getBudgets, saveBudget, getBrokers } from '../api';

export const DELETE_LOCK_KEY = 'finapp_delete_locked';
export const BROKERS_KEY = 'finapp_custom_brokers';

export default function Settings() {
  const [budgets, setBudgets] = useState([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteLocked, setDeleteLocked] = useState(
    () => localStorage.getItem(DELETE_LOCK_KEY) === 'true'
  );
  const [brokers, setBrokers] = useState([]);
  const [newBrokerName, setNewBrokerName] = useState('');

  useEffect(() => {
    Promise.all([
      getBudgets().then((res) => setBudgets(res.data.map((b) => ({ ...b, limitAmount: String(b.limitAmount) })))),
      getBrokers().then((res) => {
        // Merge API brokers with custom brokers from localStorage, filter out empty/null
        const apiBrokers = (res.data || []).filter(b => b && b.trim() !== '');
        const customBrokers = JSON.parse(localStorage.getItem(BROKERS_KEY) || '[]').filter(b => b && b.trim() !== '');
        const merged = [...new Set([...apiBrokers, ...customBrokers])];
        setBrokers(merged);
      })
    ]).finally(() => setLoading(false));
  }, []);

  // Save custom brokers to localStorage whenever they change
  useEffect(() => {
    if (brokers.length > 0) {
      const apiBrokers = ['ZERODHA', 'UPSTOX', 'ANGELONE', 'COINBASE']; // Default brokers from API
      const customBrokers = brokers.filter(b => b && b.trim() !== '' && !apiBrokers.includes(b));
      localStorage.setItem(BROKERS_KEY, JSON.stringify(customBrokers));
    }
  }, [brokers]);

  const handleAddBroker = async () => {
    if (newBrokerName.trim() && !brokers.includes(newBrokerName.trim().toUpperCase())) {
      const upperName = newBrokerName.trim().toUpperCase();
      setBrokers([...brokers, upperName]);
      setNewBrokerName('');
    }
  };

  const handleRemoveBroker = (brokerToRemove) => {
    setBrokers(brokers.filter(b => b !== brokerToRemove));
  };

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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 max-w-2xl">

          {/* Delete Lock */}
          <div className={`flex items-center justify-between p-5 rounded-2xl mb-8 border-2 transition-all ${
            deleteLocked ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${deleteLocked ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-600'}`}>
                {deleteLocked
                  ? <Shield size={22} className="text-green-600 dark:text-green-400" />
                  : <ShieldOff size={22} className="text-gray-400 dark:text-gray-500" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Delete Lock</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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

          {/* Broker Management */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-200">Brokers</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">Manage your trading brokers</p>
              </div>
            </div>

            {/* Add New Broker */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBrokerName}
                onChange={(e) => setNewBrokerName(e.target.value)}
                placeholder="Enter broker name (e.g., GROWW, FYERS)"
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddBroker()}
              />
              <button
                onClick={handleAddBroker}
                disabled={!newBrokerName.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            {/* Brokers List */}
            <div className="flex flex-wrap gap-2">
              {brokers.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No brokers added yet. Add your first broker above.</p>
              ) : (
                brokers.map((broker) => (
                  <div
                    key={broker}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">{broker}</span>
                    <button
                      onClick={() => handleRemoveBroker(broker)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove broker"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Note: Removing a broker from this list won't affect existing trades. New trades will use the updated list.
            </p>
          </div>

          <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-6">Budget Limits</h2>

          {loading ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">Loading...</p>
          ) : (
            <div className="space-y-6">
              {budgets.map((b, i) => (
                <div key={b.category} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  {/* Category name + color */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{b.category}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Color</span>
                      <input
                        type="color"
                        value={b.color || '#4CAF50'}
                        onChange={(e) => handleChange(i, 'color', e.target.value)}
                        className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Limit Amount */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase block mb-1">Limit Amount (₹)</label>
                    <input
                      type="number"
                      value={b.limitAmount}
                      onChange={(e) => handleChange(i, 'limitAmount', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase block mb-1">Note</label>
                    <input
                      type="text"
                      value={b.note || ''}
                      onChange={(e) => handleChange(i, 'note', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
                    />
                  </div>

                  {/* Preview bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full w-3/4 transition-all" style={{ background: b.color || '#4CAF50' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-8 w-full py-3 bg-slate-900 dark:bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition text-sm disabled:opacity-50"
          >
            {saved ? '✓ Saved!' : 'Save Budget Limits'}
          </button>
        </div>
      </div>
    </div>
  );
}
