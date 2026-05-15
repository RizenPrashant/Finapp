import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Building2, Plus, Trash2, Calendar, Filter, TrendingUp, Percent, Wallet, Tag } from 'lucide-react';
import Header from '../components/Header';
import { getBudgets, saveBudget, getBrokers, getCompoundingSettings, updateCompoundingSettings } from '../api';

export const DELETE_LOCK_KEY = 'finapp_delete_locked';
export const BROKERS_KEY = 'finapp_custom_brokers';
export const FILTER_PREFS_KEY = 'finapp_filter_preferences';
export const CUSTOM_FILTERS_KEY = 'finapp_custom_transaction_filters';

const DEFAULT_FILTER_PREFS = {
  dashboard: 'monthly',
  transactions: 'monthly',
  cashback: 'monthly',
  udhar: 'monthly',
  trading: 'monthly',
}; // 'custom' is also available for all sections

export default function Settings() {
  const [budgets, setBudgets] = useState([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteLocked, setDeleteLocked] = useState(
    () => localStorage.getItem(DELETE_LOCK_KEY) === 'true'
  );
  const [brokers, setBrokers] = useState([]);
  const [newBrokerName, setNewBrokerName] = useState('');
  const [filterPrefs, setFilterPrefs] = useState(() => {
    const saved = localStorage.getItem(FILTER_PREFS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_FILTER_PREFS;
  });

  // Custom Transaction Filters State
  const [customFilters, setCustomFilters] = useState(() => {
    const saved = localStorage.getItem(CUSTOM_FILTERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [newFilter, setNewFilter] = useState({
    name: '',
    type: 'paymentSource', // paymentSource, category, type, budgetCategory
    condition: 'equals', // equals, contains, startsWith
    value: '',
    color: '#3B82F6',
  });

  // Compounding Settings State
  const [compoundingSettings, setCompoundingSettings] = useState({
    autoCompound: true,
    reinvestPercentage: 100,
    applyToTrading: true,
    applyToInvestments: true,
    minReinvestAmount: 100,
  });
  const [compoundingSaved, setCompoundingSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      getBudgets().then((res) => setBudgets(res.data.map((b) => ({ ...b, limitAmount: String(b.limitAmount) })))),
      getBrokers().then((res) => {
        // Merge API brokers with custom brokers from localStorage, filter out empty/null
        const apiBrokers = (res.data || []).filter(b => b && b.trim() !== '');
        const customBrokers = JSON.parse(localStorage.getItem(BROKERS_KEY) || '[]').filter(b => b && b.trim() !== '');
        const merged = [...new Set([...apiBrokers, ...customBrokers])];
        setBrokers(merged);
      }),
      getCompoundingSettings().then((res) => {
        if (res.data) {
          setCompoundingSettings({
            autoCompound: res.data.autoCompound ?? true,
            reinvestPercentage: res.data.reinvestPercentage ?? 100,
            applyToTrading: res.data.applyToTrading ?? true,
            applyToInvestments: res.data.applyToInvestments ?? true,
            minReinvestAmount: res.data.minReinvestAmount ?? 100,
          });
        }
      }).catch(() => {
        // Use defaults if API fails
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

  // Save filter preferences to localStorage
  useEffect(() => {
    localStorage.setItem(FILTER_PREFS_KEY, JSON.stringify(filterPrefs));
  }, [filterPrefs]);

  // Save custom filters to localStorage
  useEffect(() => {
    localStorage.setItem(CUSTOM_FILTERS_KEY, JSON.stringify(customFilters));
  }, [customFilters]);

  const handleAddFilter = () => {
    if (newFilter.name.trim() && newFilter.value.trim()) {
      setCustomFilters([...customFilters, { ...newFilter, id: Date.now() }]);
      setNewFilter({
        name: '',
        type: 'paymentSource',
        condition: 'equals',
        value: '',
        color: '#3B82F6',
      });
    }
  };

  const handleRemoveFilter = (filterId) => {
    setCustomFilters(customFilters.filter(f => f.id !== filterId));
  };

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

          {/* Default Filter Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Filter size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-200">Default Filters</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">Set default date filters for each section</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Dashboard Filter */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Dashboard</p>
                    <p className="text-xs text-gray-400">Default time period</p>
                  </div>
                </div>
                <select
                  value={filterPrefs.dashboard}
                  onChange={(e) => setFilterPrefs({ ...filterPrefs, dashboard: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Transactions Filter */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Transactions</p>
                    <p className="text-xs text-gray-400">Default time period</p>
                  </div>
                </div>
                <select
                  value={filterPrefs.transactions}
                  onChange={(e) => setFilterPrefs({ ...filterPrefs, transactions: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Cashback Filter */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Cashback</p>
                    <p className="text-xs text-gray-400">Default time period</p>
                  </div>
                </div>
                <select
                  value={filterPrefs.cashback}
                  onChange={(e) => setFilterPrefs({ ...filterPrefs, cashback: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Udhar Filter */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Udhar</p>
                    <p className="text-xs text-gray-400">Default time period</p>
                  </div>
                </div>
                <select
                  value={filterPrefs.udhar}
                  onChange={(e) => setFilterPrefs({ ...filterPrefs, udhar: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Trading Filter */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Trading</p>
                    <p className="text-xs text-gray-400">Default time period</p>
                  </div>
                </div>
                <select
                  value={filterPrefs.trading}
                  onChange={(e) => setFilterPrefs({ ...filterPrefs, trading: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Custom Transaction Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Tag size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-200">Custom Transaction Filters</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">Create preset filters for quick transaction filtering</p>
              </div>
            </div>

            {/* Add New Filter */}
            <div className="space-y-3 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFilter.name}
                  onChange={(e) => setNewFilter({ ...newFilter, name: e.target.value })}
                  placeholder="Filter name (e.g., HDFC Bank, Axis CC)"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={newFilter.type}
                  onChange={(e) => setNewFilter({ ...newFilter, type: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="paymentSource">Payment Source</option>
                  <option value="category">Category</option>
                  <option value="budgetCategory">Budget Category</option>
                  <option value="type">Type</option>
                </select>
              </div>
              <div className="flex gap-2">
                <select
                  value={newFilter.condition}
                  onChange={(e) => setNewFilter({ ...newFilter, condition: e.target.value })}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="startsWith">Starts With</option>
                </select>
                <input
                  type="text"
                  value={newFilter.value}
                  onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                  placeholder="Filter value (e.g., HDFC, Credit Card)"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddFilter()}
                />
                <input
                  type="color"
                  value={newFilter.color}
                  onChange={(e) => setNewFilter({ ...newFilter, color: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer"
                  title="Filter color"
                />
                <button
                  onClick={handleAddFilter}
                  disabled={!newFilter.name.trim() || !newFilter.value.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-sm disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            {/* Filters List */}
            <div className="flex flex-wrap gap-2">
              {customFilters.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No custom filters yet. Create your first filter above.</p>
              ) : (
                customFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{ backgroundColor: filter.color + '20', border: `1px solid ${filter.color}` }}
                  >
                    <span className="font-medium" style={{ color: filter.color }}>{filter.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {filter.type === 'paymentSource' ? '💳' :
                       filter.type === 'category' ? '🏷️' :
                       filter.type === 'budgetCategory' ? '📊' :
                       filter.type === 'type' ? '💰' : '🔍'} {filter.condition} "{filter.value}"
                    </span>
                    <button
                      onClick={() => handleRemoveFilter(filter.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove filter"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              These filters will appear as quick buttons on the Transactions page for one-click filtering.
            </p>
          </div>

          {/* Compounding Settings */}
          <div className="mb-8">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-500" />
              Compounding Settings
            </h2>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-5 space-y-5">
              {/* Master Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-all ${compoundingSettings.autoCompound ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-600'}`}>
                    <TrendingUp size={18} className={compoundingSettings.autoCompound ? 'text-green-600 dark:text-green-400' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Auto Compounding</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Automatically reinvest profits</p>
                  </div>
                </div>
                <button
                  onClick={() => setCompoundingSettings(prev => ({ ...prev, autoCompound: !prev.autoCompound }))}
                  className={`relative w-14 h-7 rounded-full transition-all ${compoundingSettings.autoCompound ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${compoundingSettings.autoCompound ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Reinvest Percentage */}
              <div className={`transition-opacity ${compoundingSettings.autoCompound ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Percent size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reinvest Percentage</span>
                  </div>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">{compoundingSettings.reinvestPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={compoundingSettings.reinvestPercentage}
                  onChange={(e) => setCompoundingSettings(prev => ({ ...prev, reinvestPercentage: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Apply To */}
              <div className={`grid grid-cols-2 gap-3 transition-opacity ${compoundingSettings.autoCompound ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${compoundingSettings.applyToTrading ? 'bg-white dark:bg-gray-800 border-green-500' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                  <input
                    type="checkbox"
                    checked={compoundingSettings.applyToTrading}
                    onChange={(e) => setCompoundingSettings(prev => ({ ...prev, applyToTrading: e.target.checked }))}
                    className="w-4 h-4 accent-green-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trading</p>
                    <p className="text-xs text-gray-400">Trade profits</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${compoundingSettings.applyToInvestments ? 'bg-white dark:bg-gray-800 border-green-500' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                  <input
                    type="checkbox"
                    checked={compoundingSettings.applyToInvestments}
                    onChange={(e) => setCompoundingSettings(prev => ({ ...prev, applyToInvestments: e.target.checked }))}
                    className="w-4 h-4 accent-green-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Investments</p>
                    <p className="text-xs text-gray-400">Interest/dividends</p>
                  </div>
                </label>
              </div>

              {/* Minimum Amount */}
              <div className={`transition-opacity ${compoundingSettings.autoCompound ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Minimum Reinvest Amount</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₹</span>
                  <input
                    type="number"
                    value={compoundingSettings.minReinvestAmount}
                    onChange={(e) => setCompoundingSettings(prev => ({ ...prev, minReinvestAmount: parseFloat(e.target.value) || 0 }))}
                    className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl p-2 bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="100"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Profits below this amount won't be reinvested</p>
              </div>

              {/* Save Button */}
              <button
                onClick={async () => {
                  try {
                    await updateCompoundingSettings({
                      autoCompound: compoundingSettings.autoCompound,
                      reinvestPercentage: compoundingSettings.reinvestPercentage,
                      applyToTrading: compoundingSettings.applyToTrading,
                      applyToInvestments: compoundingSettings.applyToInvestments,
                      minReinvestAmount: compoundingSettings.minReinvestAmount,
                    });
                    setCompoundingSaved(true);
                    setTimeout(() => setCompoundingSaved(false), 2000);
                  } catch (err) {
                    console.error('Failed to save compounding settings:', err);
                  }
                }}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition text-sm"
              >
                {compoundingSaved ? '✓ Settings Saved!' : 'Save Compounding Settings'}
              </button>
            </div>
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
