/**
 * Copyright (c) 2026 Rizen.Prashant | Prashant Kumar
 * Pacific Finapp - Personal Finance Management Application
 * All rights reserved.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit2, ArrowDownCircle, ArrowUpCircle, Wallet, Gift, X, ChevronRight, ArrowLeft, TrendingUp, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import Header from '../components/Header';
import {
  getCashbackWallets, createCashbackWallet, updateCashbackWallet, deleteCashbackWallet,
  getCashbackEntriesByWallet, createCashbackEntry, deleteCashbackEntry
} from '../api';
import { FILTER_PREFS_KEY, isDeleteLocked } from '../pages/Settings';
import { eventEmitter, EVENTS } from '../utils/events';

const PLATFORM_PRESETS = [
  { name: 'Swiggy Money', color: '#FC8019', emoji: '🍔' },
  { name: 'Amazon Pay', color: '#FF9900', emoji: '📦' },
  { name: 'PhonePe', color: '#5F259F', emoji: '📱' },
  { name: 'Google Pay', color: '#4285F4', emoji: '💳' },
  { name: 'Paytm', color: '#00BAF2', emoji: '💰' },
  { name: 'HDFC Card', color: '#004C97', emoji: '🏦' },
  { name: 'SBI Card', color: '#22409A', emoji: '🏦' },
  { name: 'Axis Card', color: '#97144D', emoji: '🏦' },
  { name: 'Zomato', color: '#E23744', emoji: '🍕' },
  { name: 'Flipkart', color: '#2874F0', emoji: '🛒' },
  { name: 'CRED', color: '#1C1C1C', emoji: '⭐' },
  { name: 'Mobikwik', color: '#1ED760', emoji: '📲' },
];

const fmt = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EMOJI_OPTIONS = [
  '💰','💳','🏦','🎁','🛒','📦','🍔','🍕','📱','💎','⭐','🔥',
  '🎯','🛍️','✈️','🚗','🏠','💊','🎬','🎵','📚','🏋️','☕','🍜',
  '🌟','💸','🤑','🪙','📊','🎪','🧾','🏧',
];

function AddWalletModal({ onClose, onSave }) {
  const [step, setStep] = useState('presets'); // presets | custom
  const [platform, setPlatform] = useState('');
  const [emoji, setEmoji] = useState('💰');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePreset = async (preset) => {
    setLoading(true);
    try { await onSave({ platform: preset.name, icon: preset.emoji, color: preset.color }); }
    finally { setLoading(false); }
  };

  const handleCustom = async (e) => {
    e.preventDefault();
    if (!platform.trim()) return;
    setLoading(true);
    try { await onSave({ platform: platform.trim(), icon: emoji, color: '#6B7280' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Add Cashback Wallet</h2>

        {step === 'presets' ? (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium uppercase tracking-wide">Select Platform</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PLATFORM_PRESETS.map(p => (
                <button key={p.name} onClick={() => handlePreset(p)} disabled={loading}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-center disabled:opacity-50">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{p.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('custom')}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-slate-400 transition">
              + Custom Platform
            </button>
          </>
        ) : (
          <form onSubmit={handleCustom} className="space-y-4">
            {/* Emoji Picker */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2">Choose Icon</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowEmojiPicker(v => !v)}
                  className="w-14 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-3xl flex items-center justify-center hover:border-blue-400 transition">
                  {emoji}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500">Click to pick emoji</p>
              </div>
              {showEmojiPicker && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-8 gap-1.5">
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} type="button"
                        onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                        className={`text-xl p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 transition ${emoji === e ? 'bg-white dark:bg-gray-600 ring-2 ring-blue-400' : ''}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Platform Name */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Platform Name</label>
              <input required value={platform} onChange={e => setPlatform(e.target.value)}
                placeholder="e.g. Meesho, Nykaa, Blinkit..."
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white" />
            </div>

            {/* Preview */}
            {platform && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-600 flex items-center justify-center text-xl shadow-sm">{emoji}</div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{platform}</p>
                  <p className="text-xs text-gray-400">Cashback Wallet</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStep('presets')}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                Back
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-60">
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditWalletModal({ wallet, onClose, onSave }) {
  const [platform, setPlatform] = useState(wallet?.platform || '');
  const [emoji, setEmoji] = useState(wallet?.icon || '💰');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!platform.trim()) return;
    setLoading(true);
    try {
      await onSave({ platform: platform.trim(), icon: emoji });
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Edit Wallet</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Emoji Picker */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2">Choose Icon</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowEmojiPicker(v => !v)}
                className="w-14 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-3xl flex items-center justify-center hover:border-blue-400 transition">
                {emoji}
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500">Click to pick emoji</p>
            </div>
            {showEmojiPicker && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-8 gap-1.5">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} type="button"
                      onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                      className={`text-xl p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 transition ${emoji === e ? 'bg-white dark:bg-gray-600 ring-2 ring-blue-400' : ''}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Platform Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Platform Name</label>
            <input required value={platform} onChange={e => setPlatform(e.target.value)}
              placeholder="e.g. Swiggy, Amazon Pay..."
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white" />
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-600 flex items-center justify-center text-xl shadow-sm">{emoji}</div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{platform || wallet?.platform}</p>
              <p className="text-xs text-gray-400">Cashback Wallet</p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddEntryModal({ wallets, selectedWalletId, onClose, onSave }) {
  const [form, setForm] = useState({
    walletId: selectedWalletId || (wallets[0]?.id ?? ''),
    amount: '',
    type: 'EARNED',
    description: '',
    source: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const selectedWallet = wallets.find(w => w.id === parseInt(form.walletId));
  const maxRedeem = parseFloat(selectedWallet?.balance || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.type === 'REDEEMED' && parseFloat(form.amount) > maxRedeem) {
      alert(`Insufficient balance. Max redeemable: ${fmt(maxRedeem)}`);
      return;
    }
    setLoading(true);
    try {
      await onSave({ ...form, walletId: parseInt(form.walletId), amount: parseFloat(form.amount) });
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Add Cashback Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
            {['EARNED', 'REDEEMED'].map(t => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 py-2.5 text-sm font-semibold transition ${form.type === t
                  ? t === 'EARNED' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                {t === 'EARNED' ? '🎉 Earned' : '🛍️ Redeemed'}
              </button>
            ))}
          </div>

          {/* Wallet select */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Wallet</label>
            <select value={form.walletId} onChange={e => setForm({ ...form, walletId: e.target.value })} className={inputCls}>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.icon} {w.platform} (Balance: {fmt(w.balance)})</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">
              Amount (₹) {form.type === 'REDEEMED' && selectedWallet && (
                <span className="text-red-500 font-normal normal-case"> — Max: {fmt(maxRedeem)}</span>
              )}
            </label>
            <input required type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Description</label>
            <input required placeholder="e.g. Cashback on Swiggy order" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </div>

          {/* Source (optional) */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Source / Order Ref <span className="font-normal normal-case text-gray-400">(optional)</span></label>
            <input placeholder="e.g. Order #12345 or HDFC Card" value={form.source}
              onChange={e => setForm({ ...form, source: e.target.value })} className={inputCls} />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Date</label>
            <input type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 py-3 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 ${form.type === 'EARNED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
              {loading ? 'Saving...' : form.type === 'EARNED' ? 'Add Earned' : 'Mark Redeemed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Cashback({ onProfileClick }) {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showEditWallet, setShowEditWallet] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);

  // Date filters - read default from settings
  const now = new Date();
  const getDefaultFilter = () => {
    const saved = localStorage.getItem(FILTER_PREFS_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      return prefs.cashback || 'monthly';
    }
    return 'monthly';
  };
  const [filterType, setFilterType] = useState(getDefaultFilter()); // daily, weekly, monthly, yearly, all, custom
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState(now.toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(now.toISOString().split('T')[0]);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCashbackWallets();
      setWallets(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  // Listen for transaction events to refresh wallets (auto-update balances)
  useEffect(() => {
    const handleTransactionChange = () => {
      // Refresh wallets when transactions change (balance auto-update from backend)
      fetchWallets();
    };

    const unsubscribeCreate = eventEmitter.on(EVENTS.TRANSACTION_CREATED, handleTransactionChange);
    const unsubscribeUpdate = eventEmitter.on(EVENTS.TRANSACTION_UPDATED, handleTransactionChange);
    const unsubscribeDelete = eventEmitter.on(EVENTS.TRANSACTION_DELETED, handleTransactionChange);
    const unsubscribeImport = eventEmitter.on(EVENTS.TRANSACTIONS_IMPORTED, handleTransactionChange);

    return () => {
      unsubscribeCreate();
      unsubscribeUpdate();
      unsubscribeDelete();
      unsubscribeImport();
    };
  }, [fetchWallets]);

  const fetchEntries = useCallback(async (walletId) => {
    setEntriesLoading(true);
    try {
      const res = await getCashbackEntriesByWallet(walletId);
      setEntries(res.data);
    } catch (e) {
      console.error(e);
    }
    setEntriesLoading(false);
  }, []);

  useEffect(() => {
    if (selectedWallet) fetchEntries(selectedWallet.id);
  }, [selectedWallet, fetchEntries]);

  const handleCreateWallet = async (data) => {
    await createCashbackWallet(data);
    await fetchWallets();
    setShowAddWallet(false);
  };

  const cashbackLocked = isDeleteLocked('cashback');

  const handleDeleteWallet = async (id) => {
    if (cashbackLocked) return;
    if (!window.confirm('Delete this wallet and all its entries?')) return;
    await deleteCashbackWallet(id);
    await fetchWallets();
    if (selectedWallet?.id === id) setSelectedWallet(null);
  };

  const handleUpdateWallet = async (data) => {
    if (!editingWallet) return;
    await updateCashbackWallet(editingWallet.id, data);
    await fetchWallets();
    setShowEditWallet(false);
    setEditingWallet(null);
  };

  const handleAddEntry = async (data) => {
    await createCashbackEntry(data);
    await fetchWallets();
    if (selectedWallet) await fetchEntries(selectedWallet.id);
  };

  const handleDeleteEntry = async (id) => {
    if (cashbackLocked) return;
    if (!window.confirm('Delete this entry?')) return;
    await deleteCashbackEntry(id);
    await fetchWallets();
    if (selectedWallet) await fetchEntries(selectedWallet.id);
  };

  // Filter entries based on date
  const filteredEntries = useMemo(() => {
    if (filterType === 'all') return entries;

    return entries.filter(e => {
      const entryDate = new Date(e.date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth();
      const entryDay = entryDate.getDate();

      switch (filterType) {
        case 'daily':
          return e.date === selectedDate;
        case 'weekly': {
          const start = new Date(selectedDate);
          start.setDate(start.getDate() - start.getDay()); // Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // Saturday
          return entryDate >= start && entryDate <= end;
        }
        case 'monthly':
          return entryYear === selectedYear && entryMonth === selectedMonth;
        case 'yearly':
          return entryYear === selectedYear;
        case 'custom': {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59);
          return entryDate >= start && entryDate <= end;
        }
        default:
          return true;
      }
    });
  }, [entries, filterType, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Calculate totals from filtered entries
  const { filteredEarned, filteredRedeemed } = useMemo(() => {
    const earned = filteredEntries
      .filter(e => e.type === 'EARNED')
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const redeemed = filteredEntries
      .filter(e => e.type === 'REDEEMED')
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    return { filteredEarned: earned, filteredRedeemed: redeemed };
  }, [filteredEntries]);

  const totalBalance = wallets.reduce((s, w) => s + parseFloat(w.balance || 0), 0);
  const totalEarned = wallets.reduce((s, w) => s + parseFloat(w.totalEarned || 0), 0);
  const totalRedeemed = wallets.reduce((s, w) => s + parseFloat(w.totalRedeemed || 0), 0);

  // Navigation handlers
  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };
  const prevYear = () => setSelectedYear(y => y - 1);
  const nextYear = () => setSelectedYear(y => y + 1);
  const prevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const nextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // ===== WALLET DETAIL VIEW =====
  if (selectedWallet) {
    const wallet = wallets.find(w => w.id === selectedWallet.id) || selectedWallet;
    const filteredEarnedCount = filteredEntries.filter(e => e.type === 'EARNED').length;
    const filteredRedeemedCount = filteredEntries.filter(e => e.type === 'REDEEMED').length;

    const walletTitle = (
      <div className="flex items-center gap-2">
        {wallet.logoUrl ? (
          <img src={wallet.logoUrl} alt={wallet.platform} className="w-6 h-6 object-contain" />
        ) : (
          <span>{wallet.icon || '💰'}</span>
        )}
        <span>{wallet.platform}</span>
      </div>
    );

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={walletTitle} subtitle="Cashback Wallet" onProfileClick={onProfileClick} />
        <div className="flex-1 overflow-y-auto p-6">

          {/* Back + Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedWallet(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{wallet.icon} {wallet.platform}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{entries.length} total entries</p>
              </div>
            </div>
            <button onClick={() => setShowAddEntry(true)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition text-sm">
              <Plus size={18} /> Add Entry
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {['daily', 'weekly', 'monthly', 'yearly', 'all', 'custom'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    filterType === type
                      ? 'bg-slate-900 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}

              {/* Date Navigation based on filter type */}
              {filterType === 'daily' && (
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                  />
                  <button onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRightIcon size={16} /></button>
                </div>
              )}

              {filterType === 'weekly' && (
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={prevWeek} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Week of {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <button onClick={nextWeek} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRightIcon size={16} /></button>
                </div>
              )}

              {filterType === 'monthly' && (
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[100px] text-center">
                    {MONTHS[selectedMonth]} {selectedYear}
                  </span>
                  <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRightIcon size={16} /></button>
                </div>
              )}

              {filterType === 'yearly' && (
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={prevYear} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[60px] text-center">{selectedYear}</span>
                  <button onClick={nextYear} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRightIcon size={16} /></button>
                </div>
              )}

              {filterType === 'custom' && (
                <div className="flex items-center gap-2 ml-4">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Wallet Stats - Filtered */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={16} className="text-blue-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Available Balance</p>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{fmt(wallet.balance)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownCircle size={16} className="text-green-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Earned {filterType !== 'all' && '(Filtered)'}</p>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">+{fmt(filteredEarned)}</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">{filteredEarnedCount} transactions</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpCircle size={16} className="text-red-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Redeemed {filterType !== 'all' && '(Filtered)'}</p>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">-{fmt(filteredRedeemed)}</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">{filteredRedeemedCount} transactions</p>
            </div>
          </div>

          {/* Entries */}
          {entriesLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-100 dark:bg-gray-700 h-14 rounded-xl animate-pulse" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
              <Gift size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-slate-800 dark:text-slate-200 font-medium">No entries yet</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Add your first cashback entry</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
              <Gift size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-slate-800 dark:text-slate-200 font-medium">No entries for this period</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Try changing the filter</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Source</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${entry.type === 'EARNED' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                            {entry.type === 'EARNED'
                              ? <ArrowDownCircle size={14} className="text-green-600" />
                              : <ArrowUpCircle size={14} className="text-red-600" />}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{entry.description}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs">{entry.source || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                        {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-bold ${entry.type === 'EARNED' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {entry.type === 'EARNED' ? '+' : '-'}{fmt(entry.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => handleDeleteEntry(entry.id)}
                          className={`p-1.5 rounded-lg transition ${cashbackLocked ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                          title={cashbackLocked ? 'Delete locked. Unlock in Settings.' : 'Delete'}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAddEntry && (
          <AddEntryModal
            wallets={wallets}
            selectedWalletId={selectedWallet.id}
            onClose={() => setShowAddEntry(false)}
            onSave={handleAddEntry}
          />
        )}
      </div>
    );
  }

  // ===== MAIN VIEW =====
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Cashback" subtitle="Track your cashback & rewards" onProfileClick={onProfileClick} />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Top Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="relative p-[2px] rounded-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 h-full">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} className="text-blue-500" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Balance</p>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{fmt(totalBalance)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{wallets.length} wallets</p>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-green-600" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Earned</p>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">+{fmt(totalEarned)}</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">Lifetime cashback</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={18} className="text-purple-600" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Redeemed</p>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{fmt(totalRedeemed)}</p>
            <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">Benefits utilized</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Your Wallets</h3>
          <div className="flex gap-2">
            {wallets.length > 0 && (
              <button onClick={() => setShowAddEntry(true)}
                className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm">
                <Plus size={16} /> Add Entry
              </button>
            )}
            <button onClick={() => setShowAddWallet(true)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-700 transition text-sm">
              <Plus size={16} /> Add Wallet
            </button>
          </div>
        </div>

        {/* Wallets Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-2xl h-40 animate-pulse" />)}
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
            <Gift size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-slate-800 dark:text-slate-200 font-semibold text-lg">No cashback wallets yet</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 mb-6">Add wallets for Swiggy, Amazon Pay, HDFC Card etc.</p>
            <button onClick={() => setShowAddWallet(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-700 transition text-sm">
              Add Your First Wallet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map(wallet => {
              const utilizationPct = parseFloat(wallet.totalEarned) > 0
                ? Math.min(100, (parseFloat(wallet.totalRedeemed) / parseFloat(wallet.totalEarned)) * 100)
                : 0;
              return (
                <div key={wallet.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all p-5 cursor-pointer group"
                  onClick={() => setSelectedWallet(wallet)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-2xl overflow-hidden">
                        {wallet.logoUrl ? (
                          <img src={wallet.logoUrl} alt={wallet.platform} className="w-8 h-8 object-contain" />
                        ) : (
                          <span>{wallet.icon || '💰'}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">{wallet.platform}</h3>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Cashback Wallet</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={e => { e.stopPropagation(); setEditingWallet(wallet); setShowEditWallet(true); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 transition">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteWallet(wallet.id); }}
                        className={`p-1.5 rounded-lg transition ${cashbackLocked ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                        title={cashbackLocked ? 'Delete locked. Unlock in Settings.' : 'Delete'}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Available Balance</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{fmt(wallet.balance)}</p>
                  </div>

                  <div className="flex justify-between text-xs mb-3">
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Earned</p>
                      <p className="font-bold text-green-600 dark:text-green-400">+{fmt(wallet.totalEarned)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 dark:text-gray-500">Redeemed</p>
                      <p className="font-bold text-red-500 dark:text-red-400">-{fmt(wallet.totalRedeemed)}</p>
                    </div>
                  </div>

                  {/* Progress bar - utilization */}
                  {parseFloat(wallet.totalEarned) > 0 && (
                    <div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${utilizationPct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{utilizationPct.toFixed(0)}% redeemed</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end mt-3 text-xs text-blue-500 dark:text-blue-400 font-medium">
                    View History <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddWallet && (
        <AddWalletModal onClose={() => setShowAddWallet(false)} onSave={handleCreateWallet} />
      )}
      {showEditWallet && editingWallet && (
        <EditWalletModal
          wallet={editingWallet}
          onClose={() => { setShowEditWallet(false); setEditingWallet(null); }}
          onSave={handleUpdateWallet}
        />
      )}
      {showAddEntry && wallets.length > 0 && (
        <AddEntryModal
          wallets={wallets}
          selectedWalletId={wallets[0]?.id}
          onClose={() => setShowAddEntry(false)}
          onSave={handleAddEntry}
        />
      )}
    </div>
  );
}
