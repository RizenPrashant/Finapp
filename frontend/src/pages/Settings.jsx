import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Building2, Plus, Trash2, Calendar, Filter, TrendingUp, Percent, Wallet, Tag, FileInput } from 'lucide-react';
import Header from '../components/Header';
import { getBudgets, saveBudget, getBrokers, getCompoundingSettings, updateCompoundingSettings, getImportFormats, createImportFormat, updateImportFormat, deleteImportFormat, getAssets } from '../api';

export const DELETE_LOCK_KEY = 'finapp_delete_locked'; // legacy, kept for compat
export const DELETE_LOCKS_KEY = 'finapp_delete_locks';

export const DELETE_LOCK_MODULES = [
  { id: 'transactions', label: 'Transactions',  emoji: '💸' },
  { id: 'assets',       label: 'Assets',         emoji: '🏠' },
  { id: 'investments',  label: 'Investments',     emoji: '📈' },
  { id: 'trades',       label: 'Trades',          emoji: '📊' },
  { id: 'cashback',     label: 'Cashback',        emoji: '🎁' },
  { id: 'compounding',  label: 'Compounding',     emoji: '💹' },
  { id: 'udhar',        label: 'Udhar',           emoji: '🤝' },
];

const DEFAULT_DELETE_LOCKS = Object.fromEntries(DELETE_LOCK_MODULES.map(m => [m.id, true]));

export function getDeleteLocks() {
  const saved = localStorage.getItem(DELETE_LOCKS_KEY);
  return saved ? { ...DEFAULT_DELETE_LOCKS, ...JSON.parse(saved) } : { ...DEFAULT_DELETE_LOCKS };
}

export function isDeleteLocked(module) {
  return getDeleteLocks()[module] ?? true;
}
export const BROKERS_KEY = 'finapp_custom_brokers';
export const FILTER_PREFS_KEY = 'finapp_filter_preferences';
export const CUSTOM_FILTERS_KEY = 'finapp_custom_transaction_filters';
export const IMPORT_FORMATS_KEY = 'finapp_custom_import_formats';
export const CUSTOM_BANK_TYPES_KEY   = 'finapp_custom_bank_types';
export const CUSTOM_BROKER_TYPES_KEY = 'finapp_custom_broker_types';

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
  const [deleteLocks, setDeleteLocks] = useState(() => getDeleteLocks());
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

  // Import Formats State (backend-driven)
  const EMPTY_BANK_FORMAT = {
    name: '', type: 'BANK', skipRows: 1, dateFormat: 'dd/MM/yyyy', fileType: 'csv',
    dateColumn: '', descriptionColumn: '', debitColumn: '', creditColumn: '',
  };
  const EMPTY_BROKER_FORMAT = {
    name: '', type: 'BROKER', skipRows: 1, dateFormat: 'dd-MM-yyyy', fileType: 'csv',
    dateColumn: '', symbolColumn: '', quantityColumn: '', priceColumn: '', tradeTypeColumn: '',
  };
  const [allFormats, setAllFormats] = useState([]);
  const [formatsLoading, setFormatsLoading] = useState(false);
  const [newFormat, setNewFormat] = useState(EMPTY_BANK_FORMAT);
  const [editingFormat, setEditingFormat] = useState(null);
  const [expandedFormatId, setExpandedFormatId] = useState(null);
  const [assetsList, setAssetsList] = useState([]);
  const [formatTab, setFormatTab] = useState('BANK');

  // Custom Bank & Broker Types State
  const [customBankTypes, setCustomBankTypes] = useState(() => {
    const saved = localStorage.getItem(CUSTOM_BANK_TYPES_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [customBrokerTypes, setCustomBrokerTypes] = useState(() => {
    const saved = localStorage.getItem(CUSTOM_BROKER_TYPES_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [newBankType, setNewBankType] = useState('');
  const [newBrokerType, setNewBrokerType] = useState('');

  // Compounding Settings State
  const [compoundingSettings, setCompoundingSettings] = useState({
    autoCompound: true,
    reinvestPercentage: 100,
    applyToTrading: true,
    applyToInvestments: true,
    minReinvestAmount: 100,
  });
  const [compoundingSaved, setCompoundingSaved] = useState(false);

  const fetchImportFormats = () => {
    setFormatsLoading(true);
    getImportFormats().then(res => setAllFormats(res.data || [])).catch(() => {}).finally(() => setFormatsLoading(false));
  };

  useEffect(() => {
    fetchImportFormats();
    getAssets().then(res => setAssetsList(res.data || [])).catch(() => {});
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

  // Save custom bank/broker types to localStorage
  useEffect(() => {
    localStorage.setItem(CUSTOM_BANK_TYPES_KEY, JSON.stringify(customBankTypes));
  }, [customBankTypes]);
  useEffect(() => {
    localStorage.setItem(CUSTOM_BROKER_TYPES_KEY, JSON.stringify(customBrokerTypes));
  }, [customBrokerTypes]);

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

  const handleAddImportFormat = async () => {
    const f = { ...newFormat };
    if (f.name === '__custom__') f.name = (f._customName || '').trim();
    delete f._customName;
    const isBankOk   = f.type === 'BANK'   && f.name.trim() && f.dateColumn.trim() && f.descriptionColumn.trim() && (f.debitColumn.trim() || f.creditColumn.trim());
    const isBrokerOk = f.type === 'BROKER' && f.name.trim() && f.dateColumn.trim() && f.symbolColumn.trim() && f.quantityColumn.trim() && f.priceColumn.trim() && f.tradeTypeColumn.trim();
    if (!isBankOk && !isBrokerOk) return;
    try {
      await createImportFormat(f);
      setNewFormat(f.type === 'BANK' ? { ...EMPTY_BANK_FORMAT } : { ...EMPTY_BROKER_FORMAT });
      fetchImportFormats();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save format');
    }
  };

  const handleDeleteImportFormat = async (id) => {
    try {
      await deleteImportFormat(id);
      fetchImportFormats();
    } catch (e) {
      alert(e.response?.data?.message || 'Cannot delete this format');
    }
  };

  const handleUpdateImportFormat = async () => {
    if (!editingFormat) return;
    try {
      await updateImportFormat(editingFormat.id, editingFormat);
      setEditingFormat(null);
      fetchImportFormats();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update format');
    }
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

  const toggleModuleLock = (moduleId) => {
    setDeleteLocks(prev => {
      const next = { ...prev, [moduleId]: !prev[moduleId] };
      localStorage.setItem(DELETE_LOCKS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleChange = (index, field, value) => {
    setBudgets((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const handleSave = async () => {
    await Promise.all(budgets.map((b) => saveBudget({ ...b, limitAmount: parseFloat(b.limitAmount) })));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Sidebar nav sections ──────────────────────────────────────────────────
  const NAV_SECTIONS = [
    { id: 'general',      icon: Shield,     label: 'General',        color: 'emerald' },
    { id: 'brokers',      icon: Building2,  label: 'Brokers',        color: 'blue' },
    { id: 'filters',      icon: Filter,     label: 'Filters',        color: 'purple' },
    { id: 'quickfilters', icon: Tag,        label: 'Quick Filters',  color: 'indigo' },
    { id: 'importtypes',  icon: FileInput,  label: 'Import Types',   color: 'cyan' },
    { id: 'importfmts',   icon: FileInput,  label: 'Import Formats', color: 'orange' },
    { id: 'compounding',  icon: TrendingUp, label: 'Compounding',    color: 'green' },
    { id: 'budgets',      icon: Wallet,     label: 'Budgets',        color: 'rose' },
  ];
  const COLOR_MAP = {
    emerald: { active: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', icon: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500' },
    blue:    { active: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-700 dark:text-blue-400',       icon: 'text-blue-500 dark:text-blue-400',    border: 'border-blue-500' },
    purple:  { active: 'bg-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20',   text: 'text-purple-700 dark:text-purple-400',   icon: 'text-purple-500 dark:text-purple-400', border: 'border-purple-500' },
    indigo:  { active: 'bg-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',   text: 'text-indigo-700 dark:text-indigo-400',   icon: 'text-indigo-500 dark:text-indigo-400', border: 'border-indigo-500' },
    cyan:    { active: 'bg-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-900/20',       text: 'text-cyan-700 dark:text-cyan-400',       icon: 'text-cyan-500 dark:text-cyan-400',    border: 'border-cyan-500' },
    orange:  { active: 'bg-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20',   text: 'text-orange-700 dark:text-orange-400',   icon: 'text-orange-500 dark:text-orange-400', border: 'border-orange-500' },
    green:   { active: 'bg-green-500',   bg: 'bg-green-50 dark:bg-green-900/20',     text: 'text-green-700 dark:text-green-400',     icon: 'text-green-500 dark:text-green-400',  border: 'border-green-500' },
    rose:    { active: 'bg-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20',       text: 'text-rose-700 dark:text-rose-400',       icon: 'text-rose-500 dark:text-rose-400',    border: 'border-rose-500' },
  };
  const [activeSection, setActiveSection] = useState('general');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Settings" subtitle="Manage your preferences" />
      <div className="flex-1 flex overflow-hidden p-4 gap-4">

        {/* ── Left sidebar nav ── */}
        <nav className="w-60 shrink-0 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-y-auto py-5 px-3 space-y-1">
          {NAV_SECTIONS.map(({ id, icon: Icon, label, color }) => {
            const isActive = activeSection === id;
            const c = COLOR_MAP[color];
            return (
              <button key={id}
                onClick={() => setActiveSection(id)}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? `${c.bg} ${c.text} shadow-sm`
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/40 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {isActive && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${c.active}`} />}
                <div className={`p-1.5 rounded-lg transition-all ${
                  isActive ? `${c.bg}` : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                }`}>
                  <Icon size={16} className={`transition-colors ${isActive ? c.icon : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                </div>
                {label}
              </button>
            );
          })}
        </nav>

        {/* ── Right content panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">

          {/* ─── General ─── */}
          {activeSection === 'general' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Shield size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">General</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">App-wide preferences</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-emerald-500" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Delete Protection</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  Enable delete lock per module. When locked, items in that module cannot be deleted.
                </p>
              </div>
              <div className="space-y-2">
                {DELETE_LOCK_MODULES.map(({ id, label, emoji }) => {
                  const locked = deleteLocks[id];
                  return (
                    <div key={id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      locked ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {locked ? 'Delete protected' : 'Delete allowed'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleModuleLock(id)}
                        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                          locked ? 'bg-green-500 shadow-green-200 shadow-sm' : 'bg-gray-300 dark:bg-gray-500'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                          locked ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          )}

          {/* ─── Brokers ─── */}
          {activeSection === 'brokers' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Brokers</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Manage your trading brokers</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
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
                  <Plus size={16} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {brokers.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No brokers added yet.</p>
                ) : (
                  brokers.map((broker) => (
                    <div key={broker} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{broker}</span>
                      <button onClick={() => handleRemoveBroker(broker)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                Removing a broker won't affect existing trades.
              </p>
              </div>
            </div>
          )}

          {/* ─── Default Filters ─── */}
          {activeSection === 'filters' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Filter size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Default Filters</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Set default date filters for each section</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-3">
                {[
                  { key: 'dashboard',    label: 'Dashboard' },
                  { key: 'transactions', label: 'Transactions' },
                  { key: 'cashback',     label: 'Cashback' },
                  { key: 'udhar',        label: 'Udhar' },
                  { key: 'trading',      label: 'Trading' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-gray-400" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                    </div>
                    <select
                      value={filterPrefs[key]}
                      onChange={(e) => setFilterPrefs({ ...filterPrefs, [key]: e.target.value })}
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
                ))}
              </div>
              </div>
            </div>
          )}

          {/* ─── Quick Filters ─── */}
          {activeSection === 'quickfilters' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                  <Tag size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Custom Transaction Filters</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Create preset filters for quick transaction filtering</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-3 mb-4">
                <div className="flex gap-2">
                  <input type="text" value={newFilter.name}
                    onChange={(e) => setNewFilter({ ...newFilter, name: e.target.value })}
                    placeholder="Filter name (e.g., HDFC Bank)"
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                  <select value={newFilter.type} onChange={(e) => setNewFilter({ ...newFilter, type: e.target.value })}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="paymentSource">Payment Source</option>
                    <option value="category">Category</option>
                    <option value="budgetCategory">Budget Category</option>
                    <option value="type">Type</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <select value={newFilter.condition} onChange={(e) => setNewFilter({ ...newFilter, condition: e.target.value })}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="startsWith">Starts With</option>
                  </select>
                  <input type="text" value={newFilter.value}
                    onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                    placeholder="Filter value"
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFilter()} />
                  <input type="color" value={newFilter.color} onChange={(e) => setNewFilter({ ...newFilter, color: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer" />
                  <button onClick={handleAddFilter} disabled={!newFilter.name.trim() || !newFilter.value.trim()}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-sm disabled:opacity-50">
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {customFilters.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No custom filters yet.</p>
                ) : (
                  customFilters.map((filter) => (
                    <div key={filter.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                      style={{ backgroundColor: filter.color + '20', border: `1px solid ${filter.color}` }}>
                      <span className="font-medium" style={{ color: filter.color }}>{filter.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {filter.type === 'paymentSource' ? '💳' : filter.type === 'category' ? '🏷️' : filter.type === 'budgetCategory' ? '📊' : '💰'} {filter.condition} "{filter.value}"
                      </span>
                      <button onClick={() => handleRemoveFilter(filter.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                These filters appear as quick buttons on the Transactions page.
              </p>
              </div>
            </div>
          )}

          {/* ─── Import Types ─── */}
          {activeSection === 'importtypes' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
                  <FileInput size={20} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Import Types</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Add custom bank & broker types for imports</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-6">
                {/* Bank Types */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase block mb-2">🏦 Bank Types</label>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={newBankType} onChange={(e) => setNewBankType(e.target.value)}
                      placeholder="e.g. AXIS, KOTAK, BOB"
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBankType.trim()) {
                          const name = newBankType.trim().toUpperCase();
                          if (!['SBI','ICICI','HDFC','GENERIC'].includes(name) && !customBankTypes.includes(name)) setCustomBankTypes([...customBankTypes, name]);
                          setNewBankType('');
                        }
                      }} />
                    <button onClick={() => {
                      if (newBankType.trim()) {
                        const name = newBankType.trim().toUpperCase();
                        if (!['SBI','ICICI','HDFC','GENERIC'].includes(name) && !customBankTypes.includes(name)) setCustomBankTypes([...customBankTypes, name]);
                        setNewBankType('');
                      }
                    }} disabled={!newBankType.trim()}
                      className="flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-sm disabled:opacity-50">
                      <Plus size={16} /> Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['SBI','ICICI','HDFC','GENERIC'].map(t => (
                      <span key={t} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400">{t} (built-in)</span>
                    ))}
                    {customBankTypes.map(t => (
                      <div key={t} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">{t}</span>
                        <button onClick={() => setCustomBankTypes(customBankTypes.filter(b => b !== t))} className="p-0.5 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Broker Types */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase block mb-2">📈 Broker Types</label>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={newBrokerType} onChange={(e) => setNewBrokerType(e.target.value)}
                      placeholder="e.g. GROWW, FYERS, ANGELONE"
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBrokerType.trim()) {
                          const name = newBrokerType.trim().toUpperCase();
                          if (!['ZERODHA','UPSTOX','GENERIC'].includes(name) && !customBrokerTypes.includes(name)) setCustomBrokerTypes([...customBrokerTypes, name]);
                          setNewBrokerType('');
                        }
                      }} />
                    <button onClick={() => {
                      if (newBrokerType.trim()) {
                        const name = newBrokerType.trim().toUpperCase();
                        if (!['ZERODHA','UPSTOX','GENERIC'].includes(name) && !customBrokerTypes.includes(name)) setCustomBrokerTypes([...customBrokerTypes, name]);
                        setNewBrokerType('');
                      }
                    }} disabled={!newBrokerType.trim()}
                      className="flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-sm disabled:opacity-50">
                      <Plus size={16} /> Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['ZERODHA','UPSTOX','GENERIC'].map(t => (
                      <span key={t} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400">{t} (built-in)</span>
                    ))}
                    {customBrokerTypes.map(t => (
                      <div key={t} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">{t}</span>
                        <button onClick={() => setCustomBrokerTypes(customBrokerTypes.filter(b => b !== t))} className="p-0.5 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                Custom types appear in the Import modal alongside built-in ones. Custom types use GENERIC parsing logic.
              </p>
              </div>
            </div>
          )}

          {/* ─── Import Formats ─── */}
          {activeSection === 'importfmts' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <FileInput size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Import Formats</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">View built-in formats · Add &amp; manage your own</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">

                {/* ── Saved Formats List ── */}
                <div>
                  {formatsLoading ? (
                    <p className="text-sm text-gray-400 italic">Loading...</p>
                  ) : allFormats.filter(f => f.type === formatTab).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No {formatTab === 'BANK' ? 'bank' : 'broker'} formats found.</p>
                  ) : (
                    <div className="space-y-2">
                      {allFormats.filter(f => f.type === formatTab).map(f => (
                        <div key={f.id}>
                          {/* ── Edit mode ── */}
                          {editingFormat?.id === f.id ? (
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-300 dark:border-orange-700 rounded-xl space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <input value={editingFormat.name} onChange={e => setEditingFormat({...editingFormat, name: e.target.value})}
                                  className="col-span-3 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400" />
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Skip rows</label>
                                  <input type="number" min="0" max="20" value={editingFormat.skipRows}
                                    onChange={e => setEditingFormat({...editingFormat, skipRows: parseInt(e.target.value)||0})}
                                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400" />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">File type</label>
                                  <select value={editingFormat.fileType} onChange={e => setEditingFormat({...editingFormat, fileType: e.target.value})}
                                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400">
                                    <option value="csv">CSV (.csv)</option>
                                    <option value="excel">Excel (.xls / .xlsx)</option>
                                    <option value="pdf">PDF (.pdf)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Date format</label>
                                  <select value={editingFormat.dateFormat} onChange={e => setEditingFormat({...editingFormat, dateFormat: e.target.value})}
                                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400">
                                    <option value="dd/MM/yyyy">dd/MM/yyyy (01/01/2024)</option>
                                    <option value="dd-MM-yyyy">dd-MM-yyyy (01-01-2024)</option>
                                    <option value="dd.MM.yyyy">dd.MM.yyyy (01.01.2024) — ICICI</option>
                                    <option value="dd.MM.yy">dd.MM.yy (01.01.24)</option>
                                    <option value="dd MMM yyyy">dd MMM yyyy (01 Jan 2024)</option>
                                    <option value="dd-MMM-yyyy">dd-MMM-yyyy (01-Jan-2024)</option>
                                    <option value="dd-MMM-yy">dd-MMM-yy (01-Jan-24)</option>
                                    <option value="yyyy-MM-dd">yyyy-MM-dd (2024-01-01)</option>
                                    <option value="MM/dd/yyyy">MM/dd/yyyy (01/01/2024 US)</option>
                                    <option value="d/M/yyyy">d/M/yyyy (1/1/2024)</option>
                                  </select>
                                </div>
                              </div>
                              {editingFormat.type === 'BANK' && (
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    {key:'dateColumn', label:'Date column'},
                                    {key:'descriptionColumn', label:'Description column'},
                                    {key:'debitColumn', label:'Debit column'},
                                    {key:'creditColumn', label:'Credit column'},
                                    {key:'balanceColumn', label:'Balance column'},
                                  ].map(({key, label}) => (
                                    <div key={key}>
                                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                                      <input value={editingFormat[key]||''} onChange={e => setEditingFormat({...editingFormat,[key]:e.target.value})}
                                        className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400" />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {editingFormat.type === 'BROKER' && (
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    {key:'symbolColumn', label:'Symbol column'},
                                    {key:'dateColumn', label:'Date column'},
                                    {key:'tradeTypeColumn', label:'Buy/Sell column'},
                                    {key:'quantityColumn', label:'Quantity column'},
                                    {key:'priceColumn', label:'Price column'},
                                  ].map(({key, label}) => (
                                    <div key={key}>
                                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                                      <input value={editingFormat[key]||''} onChange={e => setEditingFormat({...editingFormat,[key]:e.target.value})}
                                        className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400" />
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2 pt-1">
                                <button onClick={handleUpdateImportFormat}
                                  className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition">Save</button>
                                <button onClick={() => setEditingFormat(null)}
                                  className="px-4 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            /* ── View mode ── */
                            <div className={`rounded-xl border overflow-hidden ${
                              f.isSystem
                                ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                            }`}>
                              {/* Header row — always visible, click to expand */}
                              <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer"
                                onClick={() => setExpandedFormatId(expandedFormatId === f.id ? null : f.id)}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-base">{f.type === 'BANK' ? '🏦' : '📈'}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-semibold ${f.isSystem ? 'text-slate-600 dark:text-slate-300' : 'text-orange-700 dark:text-orange-400'}`}>{f.name}</span>
                                      {f.isSystem && <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded font-medium">built-in</span>}
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                      {f.fileType?.toUpperCase()} · skip {f.skipRows} row(s) · {f.dateFormat}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  {!f.isSystem && (
                                    <>
                                      <button onClick={e => { e.stopPropagation(); setEditingFormat({...f}); setExpandedFormatId(null); }}
                                        className="px-2.5 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition font-medium">Edit</button>
                                      <button onClick={e => { e.stopPropagation(); handleDeleteImportFormat(f.id); }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition"><Trash2 size={14} /></button>
                                    </>
                                  )}
                                  <span className="text-gray-400 text-xs ml-1">{expandedFormatId === f.id ? '▲' : '▼'}</span>
                                </div>
                              </div>
                              {/* Expanded detail panel */}
                              {expandedFormatId === f.id && (
                                <div className="px-3 pb-3 pt-1 border-t border-gray-200 dark:border-gray-600 space-y-1">
                                  {f.type === 'BANK' && [
                                    ['Date column', f.dateColumn],
                                    ['Description column', f.descriptionColumn],
                                    ['Debit column', f.debitColumn],
                                    ['Credit column', f.creditColumn],
                                    ['Balance column', f.balanceColumn],
                                  ].filter(([,v]) => v).map(([label, val]) => (
                                    <div key={label} className="flex justify-between text-xs">
                                      <span className="text-gray-400 dark:text-gray-500">{label}</span>
                                      <span className="font-mono text-gray-700 dark:text-gray-300">{val}</span>
                                    </div>
                                  ))}
                                  {f.type === 'BROKER' && [
                                    ['Symbol column', f.symbolColumn],
                                    ['Date column', f.dateColumn],
                                    ['Buy/Sell column', f.tradeTypeColumn],
                                    ['Quantity column', f.quantityColumn],
                                    ['Price column', f.priceColumn],
                                  ].filter(([,v]) => v).map(([label, val]) => (
                                    <div key={label} className="flex justify-between text-xs">
                                      <span className="text-gray-400 dark:text-gray-500">{label}</span>
                                      <span className="font-mono text-gray-700 dark:text-gray-300">{val}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400 dark:text-gray-500">Date format</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{f.dateFormat}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400 dark:text-gray-500">Skip rows</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{f.skipRows}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Add New Format ── */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase block mb-2">Add New Format</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {['BANK', 'BROKER'].map(t => (
                        <button key={t}
                          onClick={() => { setNewFormat(t === 'BANK' ? { ...EMPTY_BANK_FORMAT } : { ...EMPTY_BROKER_FORMAT }); setFormatTab(t); }}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                            formatTab === t ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                          {t === 'BANK' ? '🏦 Bank Statement' : '📈 Broker / Trades'}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3">
                        <label className="text-xs text-gray-400 block mb-1">Format name</label>
                        {newFormat.type === 'BANK' ? (
                          <select value={newFormat.name} onChange={e => setNewFormat({...newFormat, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400">
                            <option value="">— Select bank / credit card —</option>
                            {assetsList.filter(a => a.category === 'BANK' || a.category === 'CREDIT_CARD').map(a => (
                              <option key={a.id} value={a.name}>{a.category === 'CREDIT_CARD' ? '💳' : '🏦'} {a.name}</option>
                            ))}
                            <option value="__custom__">✏️ Enter custom name...</option>
                          </select>
                        ) : (
                          <select value={newFormat.name} onChange={e => setNewFormat({...newFormat, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400">
                            <option value="">— Select broker —</option>
                            {brokers.map(b => (
                              <option key={b} value={b}>📈 {b}</option>
                            ))}
                            <option value="__custom__">✏️ Enter custom name...</option>
                          </select>
                        )}
                        {newFormat.name === '__custom__' && (
                          <input autoFocus value={newFormat._customName || ''} onChange={e => setNewFormat({...newFormat, _customName: e.target.value})}
                            placeholder="Type custom name..."
                            className="w-full mt-1 px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400" />
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Skip rows</label>
                        <input type="number" min="0" max="20" value={newFormat.skipRows}
                          onChange={e => setNewFormat({...newFormat, skipRows: parseInt(e.target.value)||0})}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">File type</label>
                        <select value={newFormat.fileType} onChange={e => setNewFormat({...newFormat, fileType: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400">
                          <option value="csv">CSV (.csv)</option>
                          <option value="excel">Excel (.xls / .xlsx)</option>
                          <option value="pdf">PDF (.pdf)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Date format</label>
                        <select value={newFormat.dateFormat} onChange={e => setNewFormat({...newFormat, dateFormat: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400">
                          <option value="dd/MM/yyyy">dd/MM/yyyy (01/01/2024)</option>
                          <option value="dd-MM-yyyy">dd-MM-yyyy (01-01-2024)</option>
                          <option value="dd.MM.yyyy">dd.MM.yyyy (01.01.2024) — ICICI</option>
                          <option value="dd.MM.yy">dd.MM.yy (01.01.24)</option>
                          <option value="dd MMM yyyy">dd MMM yyyy (01 Jan 2024)</option>
                          <option value="dd-MMM-yyyy">dd-MMM-yyyy (01-Jan-2024)</option>
                          <option value="dd-MMM-yy">dd-MMM-yy (01-Jan-24)</option>
                          <option value="yyyy-MM-dd">yyyy-MM-dd (2024-01-01)</option>
                          <option value="MM/dd/yyyy">MM/dd/yyyy (01/01/2024 US)</option>
                          <option value="d/M/yyyy">d/M/yyyy (1/1/2024)</option>
                        </select>
                      </div>
                    </div>
                    {newFormat.type === 'BANK' && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {key:'dateColumn', label:'Date column', ph:'e.g. Txn Date'},
                          {key:'descriptionColumn', label:'Description column', ph:'e.g. Narration'},
                          {key:'debitColumn', label:'Debit column', ph:'e.g. Withdrawal Amt'},
                          {key:'creditColumn', label:'Credit column', ph:'e.g. Deposit Amt'},
                          {key:'balanceColumn', label:'Balance column', ph:'e.g. Balance'},
                        ].map(({key,label,ph}) => (
                          <div key={key}>
                            <label className="text-xs text-gray-400 block mb-1">{label}</label>
                            <input value={newFormat[key]||''} onChange={e => setNewFormat({...newFormat,[key]:e.target.value})}
                              placeholder={ph}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400" />
                          </div>
                        ))}
                      </div>
                    )}
                    {newFormat.type === 'BROKER' && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {key:'symbolColumn', label:'Symbol column', ph:'e.g. Symbol'},
                          {key:'dateColumn', label:'Trade date column', ph:'e.g. Trade Date'},
                          {key:'tradeTypeColumn', label:'Buy/Sell column', ph:'e.g. Trade Type'},
                          {key:'quantityColumn', label:'Quantity column', ph:'e.g. Qty'},
                          {key:'priceColumn', label:'Price column', ph:'e.g. Price'},
                        ].map(({key,label,ph}) => (
                          <div key={key}>
                            <label className="text-xs text-gray-400 block mb-1">{label}</label>
                            <input value={newFormat[key]||''} onChange={e => setNewFormat({...newFormat,[key]:e.target.value})}
                              placeholder={ph}
                              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-400" />
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={handleAddImportFormat}
                      className="flex items-center gap-1 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition text-sm">
                      <Plus size={16} /> Save Format
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                    Column names are matched case-insensitively against the header row of your CSV/Excel file.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Compounding ─── */}
          {activeSection === 'compounding' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Compounding Settings</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Auto-reinvest your profits</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-5 space-y-5">
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
                <div className={`transition-opacity ${compoundingSettings.autoCompound ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Percent size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reinvest Percentage</span>
                    </div>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">{compoundingSettings.reinvestPercentage}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={compoundingSettings.reinvestPercentage}
                    onChange={(e) => setCompoundingSettings(prev => ({ ...prev, reinvestPercentage: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>
                <div className={`grid grid-cols-2 gap-3 transition-opacity ${compoundingSettings.autoCompound ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${compoundingSettings.applyToTrading ? 'bg-white dark:bg-gray-800 border-green-500' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                    <input type="checkbox" checked={compoundingSettings.applyToTrading}
                      onChange={(e) => setCompoundingSettings(prev => ({ ...prev, applyToTrading: e.target.checked }))}
                      className="w-4 h-4 accent-green-500" />
                    <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trading</p><p className="text-xs text-gray-400">Trade profits</p></div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${compoundingSettings.applyToInvestments ? 'bg-white dark:bg-gray-800 border-green-500' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                    <input type="checkbox" checked={compoundingSettings.applyToInvestments}
                      onChange={(e) => setCompoundingSettings(prev => ({ ...prev, applyToInvestments: e.target.checked }))}
                      className="w-4 h-4 accent-green-500" />
                    <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Investments</p><p className="text-xs text-gray-400">Interest/dividends</p></div>
                  </label>
                </div>
                <div className={`transition-opacity ${compoundingSettings.autoCompound ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Minimum Reinvest Amount</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₹</span>
                    <input type="number" value={compoundingSettings.minReinvestAmount}
                      onChange={(e) => setCompoundingSettings(prev => ({ ...prev, minReinvestAmount: parseFloat(e.target.value) || 0 }))}
                      className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl p-2 bg-white dark:bg-gray-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-green-500" placeholder="100" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Profits below this amount won&apos;t be reinvested</p>
                </div>
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
            </div>
          )}

          {/* ─── Budgets ─── */}
          {activeSection === 'budgets' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                  <Wallet size={20} className="text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Budget Limits</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Set monthly spending limits per category</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
              {loading ? (
                <p className="text-center text-gray-400 dark:text-gray-500 py-8">Loading...</p>
              ) : (
                <div className="space-y-5">
                  {budgets.map((b, i) => (
                    <div key={b.category} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{b.category}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500">Color</span>
                          <input type="color" value={b.color || '#4CAF50'} onChange={(e) => handleChange(i, 'color', e.target.value)}
                            className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase block mb-1">Limit Amount (₹)</label>
                        <input type="number" value={b.limitAmount} onChange={(e) => handleChange(i, 'limitAmount', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase block mb-1">Note</label>
                        <input type="text" value={b.note || ''} onChange={(e) => handleChange(i, 'note', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white" />
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className="h-2 rounded-full w-3/4 transition-all" style={{ background: b.color || '#4CAF50' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleSave} disabled={loading}
                className="mt-6 w-full py-3 bg-slate-900 dark:bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition text-sm disabled:opacity-50">
                {saved ? '✓ Saved!' : 'Save Budget Limits'}
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
