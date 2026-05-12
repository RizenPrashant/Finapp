import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, Trash2, Target, BarChart2, RefreshCw, ChevronDown } from 'lucide-react';
import Header from '../components/Header';
import {
  getCompoundingHistory,
  createCompoundingHistory,
  deleteCompoundingHistory,
  getInvestmentAnalytics,
  getTradingCapital,
} from '../api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmt = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtPct = (val) => `${parseFloat(val || 0).toFixed(2)}%`;

function AddCompoundingModal({ onClose, onSave, currentCapital }) {
  const now = new Date();
  const [form, setForm] = useState({
    startingCapital: currentCapital?.toString() || '',
    totalProfit: '',       // total profit earned this period
    profitToAdd: '',       // how much of that profit to reinvest (0 to totalProfit)
    reinvested: true,
    month: MONTHS[now.getMonth()],
    year: now.getFullYear(),
  });
  const [loading, setLoading] = useState(false);

  const startingCapital = parseFloat(form.startingCapital || 0);
  const totalProfit = parseFloat(form.totalProfit || 0);
  const profitToAdd = parseFloat(form.profitToAdd || 0);
  const clampedProfit = Math.min(Math.max(profitToAdd, 0), totalProfit);
  const endingCapital = startingCapital + clampedProfit;
  const returnPct = startingCapital > 0 ? (clampedProfit / startingCapital) * 100 : 0;

  const handleProfitToAddChange = (val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > totalProfit) return; // block above max
    setForm({ ...form, profitToAdd: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (clampedProfit > totalProfit) {
      alert('Profit to add cannot exceed total profit earned.');
      return;
    }
    setLoading(true);
    try {
      await onSave({
        startingCapital: startingCapital,
        endingCapital: endingCapital,
        reinvested: form.reinvested,
        month: form.month,
        year: parseInt(form.year),
      });
      onClose();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-black dark:hover:text-white">✕</button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">Add Compounding Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Month</label>
              <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none">
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Year</label>
              <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Starting Capital (₹)</label>
            <input required type="number" step="0.01" value={form.startingCapital}
              onChange={e => setForm({ ...form, startingCapital: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-slate-300" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Total Profit Earned This Period (₹)</label>
            <input required type="number" step="0.01" min="0" value={form.totalProfit}
              onChange={e => setForm({ ...form, totalProfit: e.target.value, profitToAdd: e.target.value })}
              placeholder="e.g. 5000"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-slate-300" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Profit to Add to Capital (₹)</label>
              <span className="text-xs text-gray-400">Max: {fmt(totalProfit)}</span>
            </div>
            <input required type="number" step="0.01" min="0" max={totalProfit || undefined}
              value={form.profitToAdd}
              onChange={e => handleProfitToAddChange(e.target.value)}
              placeholder={`0 – ${fmt(totalProfit)}`}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-slate-300" />
            {totalProfit > 0 && (
              <input type="range" min="0" max={totalProfit} step="100"
                value={clampedProfit}
                onChange={e => setForm({ ...form, profitToAdd: e.target.value })}
                className="w-full mt-2 accent-slate-800" />
            )}
          </div>

          {form.profitToAdd !== '' && form.startingCapital && (
            <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Profit reinvested</span>
                <span className={`font-semibold ${clampedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}>+{fmt(clampedProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Profit kept separately</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(totalProfit - clampedProfit)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1.5 mt-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">New Capital</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(endingCapital)} ({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input type="checkbox" id="reinvested" checked={form.reinvested}
              onChange={e => setForm({ ...form, reinvested: e.target.checked })}
              className="rounded" />
            <label htmlFor="reinvested" className="text-sm text-slate-600 dark:text-slate-400">Mark profit as reinvested</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-semibold border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm dark:text-white">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-700 text-sm disabled:opacity-60">
              {loading ? 'Saving...' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Compounding({ onProfileClick }) {
  const [activeTab, setActiveTab] = useState('trading');
  const [compoundingHistory, setCompoundingHistory] = useState([]);
  const [investmentAnalytics, setInvestmentAnalytics] = useState(null);
  const [currentCapital, setCurrentCapital] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectionYears, setProjectionYears] = useState(5);
  const [projectionRate, setProjectionRate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, capitalRes, invRes] = await Promise.all([
        getCompoundingHistory(),
        getTradingCapital(),
        getInvestmentAnalytics(),
      ]);
      setCompoundingHistory(historyRes.data || []);
      setCurrentCapital(parseFloat(capitalRes.data || 0));
      setInvestmentAnalytics(invRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddCompounding = async (data) => {
    await createCompoundingHistory(data);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await deleteCompoundingHistory(id);
    setCompoundingHistory(prev => prev.filter(h => h.id !== id));
  };

  // ---- Trading Compounding Calculations ----
  const sortedHistory = [...compoundingHistory].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
  });

  const totalProfit = compoundingHistory.reduce((sum, h) => sum + parseFloat(h.profit || 0), 0);
  const firstCapital = sortedHistory.length > 0 ? parseFloat(sortedHistory[0].startingCapital) : 0;
  const latestCapital = sortedHistory.length > 0 ? parseFloat(sortedHistory[sortedHistory.length - 1].endingCapital) : currentCapital;
  const overallGrowth = firstCapital > 0 ? ((latestCapital - firstCapital) / firstCapital) * 100 : 0;
  const monthCount = compoundingHistory.length;
  const avgMonthlyReturn = monthCount > 0 ? (totalProfit / monthCount / (firstCapital || 1)) * 100 : 0;

  // ---- Investment Compounding Calculations ----
  const inv = investmentAnalytics;
  const totalInvested = parseFloat(inv?.totalInvested || 0);
  const totalCurrentValue = parseFloat(inv?.totalCurrentValue || 0);
  const investmentProfit = totalCurrentValue - totalInvested;
  const invReturnPct = totalInvested > 0 ? (investmentProfit / totalInvested) * 100 : 0;

  // CAGR - assume avg hold period of 2 years if no data
  const cagrRate = projectionRate !== '' ? parseFloat(projectionRate) : (invReturnPct > 0 ? invReturnPct / 2 : 0);

  const projections = Array.from({ length: projectionYears }, (_, i) => {
    const years = i + 1;
    const futureValue = totalCurrentValue * Math.pow(1 + cagrRate / 100, years);
    return { years, futureValue };
  });

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
      <Header title="Compounding" subtitle="Track capital growth and investment projections" onProfileClick={onProfileClick} />

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex gap-2 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700 w-fit">
          {['trading', 'investments'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition ${activeTab === tab ? 'bg-slate-900 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {tab === 'trading' ? '📈 Trading' : '💼 Investments'}
            </button>
          ))}
        </div>
      </div>

      {/* ======================== TRADING TAB ======================== */}
      {activeTab === 'trading' && (
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Capital</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{fmt(latestCapital || currentCapital)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Initial Capital</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{fmt(firstCapital || currentCapital)}</p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm ${totalProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Profit</p>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {totalProfit >= 0 ? '+' : ''}{fmt(totalProfit)}
              </p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm ${overallGrowth >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall Growth</p>
              <p className={`text-xl font-bold ${overallGrowth >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                {overallGrowth >= 0 ? '+' : ''}{overallGrowth.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Avg/month: {avgMonthlyReturn.toFixed(2)}%</p>
            </div>
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-300">Monthly Compounding History</h2>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm transition">
              <Plus size={16} /> Add Entry
            </button>
          </div>

          {/* History Table */}
          {sortedHistory.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
              <BarChart2 size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No compounding entries yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add your first monthly capital entry to start tracking</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Month/Year</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Starting</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Ending</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Profit</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Return%</th>
                      <th className="text-center px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Reinvested</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {sortedHistory.map((entry) => {
                      const profit = parseFloat(entry.profit || 0);
                      const returnPct = parseFloat(entry.startingCapital) > 0
                        ? (profit / parseFloat(entry.startingCapital)) * 100 : 0;
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">{entry.month} {entry.year}</td>
                          <td className="px-5 py-3.5 text-right text-gray-600 dark:text-gray-400">{fmt(entry.startingCapital)}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">{fmt(entry.endingCapital)}</td>
                          <td className={`px-5 py-3.5 text-right font-semibold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {profit >= 0 ? '+' : ''}{fmt(profit)}
                          </td>
                          <td className={`px-5 py-3.5 text-right font-semibold ${returnPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entry.reinvested ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                              {entry.reinvested ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => handleDelete(entry.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================== INVESTMENTS TAB ======================== */}
      {activeTab === 'investments' && (
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Invested</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{fmt(totalInvested)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{fmt(totalCurrentValue)}</p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm ${investmentProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net Profit/Loss</p>
              <p className={`text-xl font-bold ${investmentProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {investmentProfit >= 0 ? '+' : ''}{fmt(investmentProfit)}
              </p>
            </div>
            <div className={`rounded-2xl p-4 border shadow-sm ${invReturnPct >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall Return</p>
              <p className={`text-xl font-bold ${invReturnPct >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                {invReturnPct >= 0 ? '+' : ''}{invReturnPct.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Compounding Projections */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-700 dark:text-slate-300">Future Value Projections</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Based on compounding growth rate applied to current value</p>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Annual Rate (%)</label>
                  <input type="number" step="0.1" placeholder={cagrRate.toFixed(1)}
                    value={projectionRate}
                    onChange={e => setProjectionRate(e.target.value)}
                    className="w-24 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Years</label>
                  <select value={projectionYears} onChange={e => setProjectionYears(parseInt(e.target.value))}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white outline-none">
                    {[3,5,7,10,15,20].map(y => <option key={y} value={y}>{y} yrs</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {projections.map(({ years, futureValue }) => {
                const gain = futureValue - totalCurrentValue;
                const gainPct = totalCurrentValue > 0 ? (gain / totalCurrentValue) * 100 : 0;
                return (
                  <div key={years} className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">{years} Year{years > 1 ? 's' : ''}</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{fmt(futureValue)}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">+{fmt(gain)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">+{gainPct.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              * Rate used: {cagrRate.toFixed(2)}% per year. Projections assume annual compounding. Past returns do not guarantee future results.
            </p>
          </div>

          {/* Type-wise breakdown */}
          {inv?.typeWise && Object.keys(inv.typeWise).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-4">By Investment Type</h2>
              <div className="space-y-3">
                {Object.entries(inv.typeWise).map(([type, data]) => {
                  const invested = parseFloat(data.totalInvested || 0);
                  const current = parseFloat(data.totalCurrentValue || 0);
                  const pnl = current - invested;
                  const pct = invested > 0 ? (pnl / invested) * 100 : 0;
                  const barWidth = totalCurrentValue > 0 ? (current / totalCurrentValue) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center gap-4">
                      <div className="w-28 text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{type.replace('_', ' ')}</div>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(barWidth, 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right w-24 text-xs font-semibold text-slate-700 dark:text-slate-300">{fmt(current)}</div>
                      <div className={`text-right w-16 text-xs font-semibold ${pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <AddCompoundingModal
          onClose={() => setShowModal(false)}
          onSave={handleAddCompounding}
          currentCapital={latestCapital || currentCapital}
        />
      )}
    </div>
  );
}
