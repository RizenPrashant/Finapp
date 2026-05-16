import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Trash2, Target, BarChart2, RefreshCw, ChevronDown, Plus } from 'lucide-react';
import Header from '../components/Header';
import {
  getCompoundingHistory,
  deleteCompoundingHistory,
  getInvestmentAnalytics,
  getTradingCapital,
  processInvestmentCompounding,
} from '../api';
import { isDeleteLocked } from '../pages/Settings';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmt = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtPct = (val) => `${parseFloat(val || 0).toFixed(2)}%`;

function AddInvestmentCompoundingModal({ onClose, onSave, currentCapital }) {
  const [form, setForm] = useState({
    profit: '',
    reinvestAmount: '',
    investmentName: '',
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
  });
  const [saving, setSaving] = useState(false);

  const profit = parseFloat(form.profit || 0);
  const reinvestAmount = Math.min(parseFloat(form.reinvestAmount || 0), profit);
  const newCapital = currentCapital + reinvestAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reinvestAmount > profit) {
      alert('Reinvest amount cannot exceed profit');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        profit,
        reinvestAmount,
        investmentName: form.investmentName,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white">✕</button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Add Investment Return</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Investment Name</label>
            <input type="text" value={form.investmentName} onChange={e => setForm({ ...form, investmentName: e.target.value })}
              placeholder="e.g. Mutual Fund, FD Interest"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none" required />
          </div>

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
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Total Return/Profit (₹)</label>
            <input type="number" value={form.profit} onChange={e => setForm({ ...form, profit: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none" placeholder="e.g. 5000" required />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">
              Amount to Reinvest (₹) <span className="text-gray-400 font-normal">(Max: {fmt(profit)})</span>
            </label>
            <input type="number" value={form.reinvestAmount} onChange={e => setForm({ ...form, reinvestAmount: e.target.value })}
              max={profit || undefined}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-sm dark:text-white outline-none" placeholder="Amount to add to capital" />
            {profit > 0 && (
              <input type="range" min="0" max={profit} step={profit/100} value={reinvestAmount}
                onChange={e => setForm({ ...form, reinvestAmount: e.target.value })}
                className="w-full mt-2 accent-slate-800" />
            )}
          </div>

          {form.reinvestAmount !== '' && (
            <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Current Capital</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(currentCapital)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">To be reinvested</span>
                <span className="font-semibold text-green-600 dark:text-green-400">+{fmt(reinvestAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1.5 mt-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">New Capital</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(newCapital)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-semibold border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm dark:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-700 text-sm disabled:opacity-60">
              {saving ? 'Saving...' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Compounding({ onProfileClick }) {
  const [activeTab, setActiveTab] = useState('trading');
  const [tradingCompounding, setTradingCompounding] = useState([]);
  const [investmentCompounding, setInvestmentCompounding] = useState([]);
  const [investmentAnalytics, setInvestmentAnalytics] = useState(null);
  const [currentCapital, setCurrentCapital] = useState(0);
  const [loading, setLoading] = useState(true);
  const [projectionYears, setProjectionYears] = useState(5);
  const [projectionRate, setProjectionRate] = useState('');
  const [showInvModal, setShowInvModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, capitalRes, invRes] = await Promise.all([
        getCompoundingHistory(),
        getTradingCapital(),
        getInvestmentAnalytics(),
      ]);
      // Filter by source: TRADING or INVESTMENTS
      const allHistory = historyRes.data || [];
      setTradingCompounding(allHistory.filter(h => h.source === 'TRADING'));
      setInvestmentCompounding(allHistory.filter(h => h.source === 'INVESTMENTS'));
      setCurrentCapital(parseFloat(capitalRes.data || 0));
      setInvestmentAnalytics(invRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddInvestmentCompounding = async (data) => {
    const { profit, reinvestAmount, investmentName } = data;
    // Use the new API - profit and reinvestAmount are separate
    const desc = `Returns from: ${investmentName}`;
    await processInvestmentCompounding(profit, reinvestAmount, desc);
    fetchData();
  };

  const compoundingLocked = isDeleteLocked('compounding');

  const handleDelete = async (id, type) => {
    if (compoundingLocked) return;
    if (!window.confirm('Delete this entry?')) return;
    await deleteCompoundingHistory(id);
    if (type === 'trading') {
      setTradingCompounding(prev => prev.filter(h => h.id !== id));
    } else {
      setInvestmentCompounding(prev => prev.filter(h => h.id !== id));
    }
  };

  // ---- Trading Compounding Calculations ----
  const sortedTradingHistory = [...tradingCompounding].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
  });

  const totalProfit = tradingCompounding.reduce((sum, h) => sum + parseFloat(h.profit || 0), 0);
  const firstCapital = sortedTradingHistory.length > 0 ? parseFloat(sortedTradingHistory[0].startingCapital) : 0;
  const latestCapital = sortedTradingHistory.length > 0 ? parseFloat(sortedTradingHistory[sortedTradingHistory.length - 1].endingCapital) : currentCapital;
  const overallGrowth = firstCapital > 0 ? ((latestCapital - firstCapital) / firstCapital) * 100 : 0;
  const monthCount = tradingCompounding.length;
  const avgMonthlyReturn = monthCount > 0 ? (totalProfit / monthCount / (firstCapital || 1)) * 100 : 0;

  // ---- Investment Compounding Calculations ----
  const sortedInvestmentHistory = [...investmentCompounding].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
  });
  const investmentTotalProfit = investmentCompounding.reduce((sum, h) => sum + parseFloat(h.profit || 0), 0);
  const investmentTotalReinvested = investmentCompounding.reduce((sum, h) => sum + parseFloat(h.reinvestAmount || 0), 0);

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
            <div>
              <h2 className="text-base font-bold text-slate-700 dark:text-slate-300">Trade Compounding History</h2>
              <p className="text-xs text-gray-500 mt-0.5">Compounding from closed trades</p>
            </div>
          </div>

          {/* History Table */}
          {sortedTradingHistory.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
              <BarChart2 size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No trade compounding yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Close a trade with profit to see compounding entries here</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Trade Details</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Profit</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Reinvested</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">New Capital</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {sortedTradingHistory.map((entry) => {
                      const profit = parseFloat(entry.profit || 0);
                      const reinvestAmount = parseFloat(entry.reinvestAmount || 0);
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-700 dark:text-slate-300">{entry.description || 'Trade Profit'}</div>
                            <div className="text-xs text-gray-500">Trade #{entry.tradeId}</div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{entry.month} {entry.year}</td>
                          <td className={`px-5 py-3.5 text-right font-semibold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {profit >= 0 ? '+' : ''}{fmt(profit)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                            {fmt(reinvestAmount)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">{fmt(entry.endingCapital)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => handleDelete(entry.id, 'trading')}
                              className={`p-1.5 rounded-lg transition ${compoundingLocked ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                              title={compoundingLocked ? 'Delete locked. Unlock in Settings.' : 'Delete compounding entry'}>
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

          {/* Investment Compounding History Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-700 dark:text-slate-300">Investment Compounding History</h2>
                <p className="text-xs text-gray-500 mt-0.5">Compounding from investment returns</p>
              </div>
              <button onClick={() => setShowInvModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm transition">
                <Plus size={16} /> Add Entry
              </button>
            </div>
            {sortedInvestmentHistory.length === 0 ? (
              <div className="p-8 text-center">
                <BarChart2 size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No investment compounding yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Investment</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Return</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Reinvested</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">New Capital</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {sortedInvestmentHistory.map((entry) => {
                      const profit = parseFloat(entry.profit || 0);
                      const reinvestAmount = parseFloat(entry.reinvestAmount || 0);
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-700 dark:text-slate-300">{entry.description || 'Investment Return'}</div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{entry.month} {entry.year}</td>
                          <td className={`px-5 py-3.5 text-right font-semibold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {profit >= 0 ? '+' : ''}{fmt(profit)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                            {fmt(reinvestAmount)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">{fmt(entry.endingCapital)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => handleDelete(entry.id, 'investment')}
                              className={`p-1.5 rounded-lg transition ${compoundingLocked ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                              title={compoundingLocked ? 'Delete locked. Unlock in Settings.' : 'Delete compounding entry'}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Investment Compounding Modal */}
      {showInvModal && (
        <AddInvestmentCompoundingModal
          onClose={() => setShowInvModal(false)}
          onSave={handleAddInvestmentCompounding}
          currentCapital={currentCapital}
        />
      )}
    </div>
  );
}
