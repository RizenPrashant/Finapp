import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, ArrowRightLeft, X, User, Phone, ArrowLeft, CheckCircle, Clock, AlertCircle, UserCheck, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import Header from '../components/Header';
import {
  getUdharRecords, createUdharRecord, deleteUdharRecord,
  settleUdhar, getUdharSummary
} from '../api';
import { FILTER_PREFS_KEY } from '../pages/Settings';

const fmt = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Add Udhar Record Modal
function AddUdharModal({ onClose, onSave, defaultType }) {
  const [form, setForm] = useState({
    personName: '',
    mobileNumber: '',
    totalAmount: '',
    type: defaultType || 'GIVEN',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.personName.trim() || !form.totalAmount) return;
    setLoading(true);
    try {
      await onSave({ ...form, totalAmount: parseFloat(form.totalAmount) });
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
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
          <ArrowRightLeft size={20} />
          {form.type === 'GIVEN' ? 'Udhar Diya (Lent)' : 'Udhar Liya (Borrowed)'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Type Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
            {['GIVEN', 'TAKEN'].map(t => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 py-2.5 text-sm font-semibold transition ${form.type === t
                  ? t === 'GIVEN' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                {t === 'GIVEN' ? '📤 Maine Diya' : '📥 Maine Liya'}
              </button>
            ))}
          </div>

          {/* Person Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Person Name *</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input required value={form.personName} onChange={e => setForm({ ...form, personName: e.target.value })}
                placeholder="e.g. Rahul Sharma" className={`${inputCls} pl-10`} />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Mobile Number <span className="font-normal normal-case text-gray-400">(optional)</span></label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="tel" value={form.mobileNumber} onChange={e => setForm({ ...form, mobileNumber: e.target.value })}
                placeholder="9876543210" className={`${inputCls} pl-10`} />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Amount *</label>
            <input required type="number" min="0.01" step="0.01" placeholder="0.00"
              value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} className={inputCls} />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Reason for udhar..." rows={2} className={inputCls} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 py-3 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 ${
                form.type === 'GIVEN' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}>
              {loading ? 'Saving...' : 'Save Udhar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Settlement Modal
function SettlementModal({ record, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const remaining = parseFloat(record.totalAmount) - parseFloat(record.settledAmount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > remaining) {
      alert(`Please enter valid amount (max: ${fmt(remaining)})`);
      return;
    }
    setLoading(true);
    try {
      await onSave({
        udharRecordId: record.id,
        amount: amt,
        description,
        date
      });
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Mark Settlement</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{record.personName}</p>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500 dark:text-gray-400">Total</span>
            <span className="font-semibold">{fmt(record.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500 dark:text-gray-400">Settled</span>
            <span className="font-semibold text-green-600">{fmt(record.settledAmount)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
            <span className="text-gray-500 dark:text-gray-400">Remaining</span>
            <span className="font-bold text-orange-600">{fmt(remaining)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Settlement Amount</label>
            <input type="number" min="0.01" max={remaining} step="0.01" required
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-600 text-sm dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Cash received" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none text-sm dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none text-sm dark:text-white" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60">
            {loading ? 'Processing...' : `Record Settlement`}
          </button>
        </form>
      </div>
    </div>
  );
}

// Udhar Card Component
function UdharCard({ record, onSettle, onDelete }) {
  const progress = Math.min(100, (parseFloat(record.settledAmount || 0) / parseFloat(record.totalAmount)) * 100);
  const isSettled = record.status === 'SETTLED';
  const isPartial = record.status === 'PARTIAL';
  const remaining = parseFloat(record.totalAmount) - parseFloat(record.settledAmount || 0);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-5 transition ${
      isSettled ? 'border-green-200 dark:border-green-800 opacity-75' : 'border-gray-100 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
            record.type === 'GIVEN' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
          }`}>
            {record.type === 'GIVEN' ? '📤' : '📥'}
          </div>
          <div>
            <h3 className={`font-bold text-slate-800 dark:text-slate-200 ${isSettled ? 'line-through' : ''}`}>
              {record.personName}
            </h3>
            {record.mobileNumber && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Phone size={10} /> {record.mobileNumber}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${record.type === 'GIVEN' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {fmt(record.totalAmount)}
          </p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            isSettled ? 'bg-green-100 text-green-700' :
            isPartial ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {isSettled ? '✓ SETTLED' : isPartial ? '⏳ PARTIAL' : '⏰ PENDING'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${
            isSettled ? 'bg-green-500' : 'bg-orange-500'
          }`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-400">{progress.toFixed(0)}% settled</span>
          <span className="text-gray-500 dark:text-gray-400">
            {fmt(record.settledAmount)} / {fmt(record.totalAmount)}
          </span>
        </div>
      </div>

      {/* Remaining amount */}
      {!isSettled && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Outstanding: <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(remaining)}</span>
          </p>
          <div className="flex gap-2">
            <button onClick={() => onSettle(record)}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition">
              Settle
            </button>
            <button onClick={() => onDelete(record.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {isSettled && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle size={14} /> Fully settled
          </p>
          <button onClick={() => onDelete(record.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Udhar({ onProfileClick }) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, GIVEN, TAKEN
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('GIVEN');
  const [settlingRecord, setSettlingRecord] = useState(null);

  // Date filters - default from settings
  const now = new Date();
  const getDefaultFilter = () => {
    const saved = localStorage.getItem(FILTER_PREFS_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      return prefs.udhar || 'monthly';
    }
    return 'monthly';
  };
  const [dateFilterType, setDateFilterType] = useState(getDefaultFilter());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState(now.toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(now.toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        getUdharRecords(),
        getUdharSummary()
      ]);
      setRecords(recordsRes.data);
      setSummary(summaryRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (data) => {
    await createUdharRecord(data);
    await fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this udhar record and all linked transactions?')) return;
    await deleteUdharRecord(id);
    await fetchData();
  };

  const handleSettle = async (data) => {
    await settleUdhar(data);
    await fetchData();
    setSettlingRecord(null);
  };

  // Date filter logic
  const dateFilteredRecords = useMemo(() => {
    if (dateFilterType === 'all') return records;

    return records.filter(r => {
      const recordDate = new Date(r.date);
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();

      switch (dateFilterType) {
        case 'daily':
          return r.date === selectedDate;
        case 'weekly': {
          const start = new Date(selectedDate);
          start.setDate(start.getDate() - start.getDay()); // Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // Saturday
          return recordDate >= start && recordDate <= end;
        }
        case 'monthly':
          return recordYear === selectedYear && recordMonth === selectedMonth;
        case 'yearly':
          return recordYear === selectedYear;
        case 'custom': {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59);
          return recordDate >= start && recordDate <= end;
        }
        default:
          return true;
      }
    });
  }, [records, dateFilterType, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const filteredRecords = dateFilteredRecords.filter(r => filter === 'ALL' || r.type === filter);

  // Calculate summary from filtered records
  const filteredSummary = useMemo(() => {
    const given = dateFilteredRecords.filter(r => r.type === 'GIVEN');
    const taken = dateFilteredRecords.filter(r => r.type === 'TAKEN');

    const givenTotal = given.reduce((s, r) => s + parseFloat(r.totalAmount || 0), 0);
    const givenSettled = given.reduce((s, r) => s + parseFloat(r.settledAmount || 0), 0);
    const takenTotal = taken.reduce((s, r) => s + parseFloat(r.totalAmount || 0), 0);
    const takenSettled = taken.reduce((s, r) => s + parseFloat(r.settledAmount || 0), 0);

    return {
      givenTotal,
      givenSettled,
      givenOutstanding: givenTotal - givenSettled,
      takenTotal,
      takenSettled,
      takenOutstanding: takenTotal - takenSettled,
      netOutstanding: (givenTotal - givenSettled) - (takenTotal - takenSettled)
    };
  }, [dateFilteredRecords]);

  const givenRecords = records.filter(r => r.type === 'GIVEN');
  const takenRecords = records.filter(r => r.type === 'TAKEN');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Udhar" subtitle="Track money lent & borrowed" onProfileClick={onProfileClick} />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Date Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-gray-400 mr-2">
              <Calendar size={16} />
              <span className="text-xs font-medium uppercase">Period</span>
            </div>
            {['daily', 'weekly', 'monthly', 'yearly', 'all', 'custom'].map((type) => (
              <button
                key={type}
                onClick={() => setDateFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  dateFilterType === type
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}

            {/* Date Navigation */}
            {dateFilterType === 'weekly' && (
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 7);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Week of {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 7);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRight size={16} /></button>
              </div>
            )}

            {dateFilterType === 'daily' && (
              <div className="flex items-center gap-2 ml-auto">
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
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRight size={16} /></button>
              </div>
            )}

            {dateFilterType === 'monthly' && (
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => {
                  if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
                  else setSelectedMonth(m => m - 1);
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[100px] text-center">
                  {MONTHS[selectedMonth]} {selectedYear}
                </span>
                <button onClick={() => {
                  if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
                  else setSelectedMonth(m => m + 1);
                }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRight size={16} /></button>
              </div>
            )}

            {dateFilterType === 'yearly' && (
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[60px] text-center">{selectedYear}</span>
                <button onClick={() => setSelectedYear(y => y + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"><ChevronRight size={16} /></button>
              </div>
            )}

            {dateFilterType === 'custom' && (
              <div className="flex items-center gap-2 ml-auto">
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

        {/* Summary Cards - Using Filtered Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📤</span>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Diye Hue (Lent) {dateFilterType !== 'all' && <span className="text-orange-500">(Filtered)</span>}
              </p>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{fmt(filteredSummary.givenOutstanding)}</p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
              of {fmt(filteredSummary.givenTotal)} total · {fmt(filteredSummary.givenSettled)} returned
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📥</span>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Liye Hue (Borrowed) {dateFilterType !== 'all' && <span className="text-blue-500">(Filtered)</span>}
              </p>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{fmt(filteredSummary.takenOutstanding)}</p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              of {fmt(filteredSummary.takenTotal)} total · {fmt(filteredSummary.takenSettled)} repaid
            </p>
          </div>

          <div className={`rounded-2xl border p-5 ${
            parseFloat(filteredSummary.netOutstanding) >= 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <UserCheck size={18} className={parseFloat(filteredSummary.netOutstanding) >= 0 ? 'text-green-600' : 'text-red-600'} />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Net Position</p>
            </div>
            <p className={`text-2xl font-bold ${
              parseFloat(filteredSummary.netOutstanding) >= 0
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400'
            }`}>
              {parseFloat(filteredSummary.netOutstanding) >= 0 ? '+' : ''}{fmt(filteredSummary.netOutstanding)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {parseFloat(filteredSummary.netOutstanding) >= 0
                ? 'People owe you this much'
                : 'You owe people this much'}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {['ALL', 'GIVEN', 'TAKEN'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  filter === f
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                }`}>
                {f === 'ALL' ? 'All Records' : f === 'GIVEN' ? 'Given (Lent)' : 'Taken (Borrowed)'}
                {f !== 'ALL' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({f === 'GIVEN' ? givenRecords.length : takenRecords.length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setAddType('TAKEN'); setShowAddModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl font-semibold hover:bg-blue-200 transition text-sm">
              <Plus size={16} /> I Borrowed
            </button>
            <button onClick={() => { setAddType('GIVEN'); setShowAddModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition text-sm">
              <Plus size={16} /> I Lent
            </button>
          </div>
        </div>

        {/* Records List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-gray-100 dark:bg-gray-700 h-32 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
            <ArrowRightLeft size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-slate-800 dark:text-slate-200 font-semibold text-lg">
              {filter === 'ALL' ? 'No udhar records yet' : `No ${filter.toLowerCase()} records`}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 mb-6">
              Track money you lend to or borrow from friends & family
            </p>
            <button onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-700 transition text-sm">
              Add First Record
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRecords.map(record => (
              <UdharCard
                key={record.id}
                record={record}
                onSettle={setSettlingRecord}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddUdharModal
          onClose={() => setShowAddModal(false)}
          onSave={handleCreate}
          defaultType={addType}
        />
      )}

      {settlingRecord && (
        <SettlementModal
          record={settlingRecord}
          onClose={() => setSettlingRecord(null)}
          onSave={handleSettle}
        />
      )}
    </div>
  );
}
