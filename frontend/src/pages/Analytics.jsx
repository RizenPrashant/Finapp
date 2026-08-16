import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import { getDashboardSummary, getBudgets, getTransactionsByBudget, getMonthlyAnalytics, getWeeklyAnalytics, getCategoryAnalytics } from '../api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#EF4444','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#10B981','#F97316','#6366F1'];

const fmt = (v) => { const n = parseFloat(v ?? 0); return isNaN(n) ? '₹0.00' : '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const fmtK = (v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`;

function RupeeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-bold text-slate-600 dark:text-slate-400 mb-2">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const total = payload[0].payload.total;
  const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-700 dark:text-slate-300">{payload[0].name}</p>
      <p className="font-bold" style={{ color: payload[0].payload.fill }}>{fmt(payload[0].value)}</p>
      <p className="text-gray-400 dark:text-gray-500">{pct}% of total</p>
    </div>
  );
}

function CustomBarLabel({ x, y, width, value }) {
  if (!value) return null;
  return <text x={x + width / 2} y={y - 5} fill="currentColor" textAnchor="middle" fontSize={11} fontWeight={600} className="text-slate-500 dark:text-slate-400">{fmtK(value)}</text>;
}

export default function Analytics() {
  const now = new Date();
  const [filterType, setFilterType] = useState('monthly'); // monthly, yearly, weekly, custom
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [customStartDate, setCustomStartDate] = useState(now.toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(now.toISOString().split('T')[0]);

  const [summary, setSummary] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [budgetSpent, setBudgetSpent] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  const fetchAll = useCallback(async () => {
    const [sumRes, budgetRes, monthlyRes, weeklyRes] = await Promise.all([
      getDashboardSummary(),
      getBudgets(),
      getMonthlyAnalytics(selectedYear),
      getWeeklyAnalytics(8),
    ]);
    setSummary(sumRes.data);
    setBudgets(budgetRes.data);
    setMonthlyData(monthlyRes.data);
    setWeeklyData(weeklyRes.data);

    const map = {};
    await Promise.all(budgetRes.data.map(async (b) => {
      const t = await getTransactionsByBudget(b.category);
      map[b.category] = t.data.filter((tx) => tx.type === 'DEBIT').reduce((s, tx) => s + parseFloat(tx.amount), 0);
    }));
    setBudgetSpent(map);

    // Category analytics based on filter
    const catParams = filterType === 'monthly' ? { month: selectedMonth + 1, year: selectedYear }
      : filterType === 'yearly' ? { year: selectedYear }
      : filterType === 'custom' ? { startDate: customStartDate, endDate: customEndDate } : {};
    const catRes = await getCategoryAnalytics(catParams);
    setCategoryData(catRes.data);
  }, [selectedYear, selectedMonth, filterType, customStartDate, customEndDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Trend data based on filter
  const trendData = filterType === 'weekly' ? weeklyData.map((d) => ({
    name: d.week,
    Income: parseFloat(d.income),
    Expense: parseFloat(d.expense),
    Net: parseFloat(d.income) - parseFloat(d.expense),
  })) : monthlyData.map((d) => ({
    name: d.month,
    Income: parseFloat(d.income),
    Expense: parseFloat(d.expense),
    Savings: parseFloat(d.savings),
    Net: parseFloat(d.income) - parseFloat(d.expense),
  }));

  const budgetChartData = budgets.map((b) => ({
    name: b.category.replace('Monthly ', '').replace('Total ', ''),
    Spent: parseFloat((budgetSpent[b.category] || 0).toFixed(0)),
    Limit: parseFloat(b.limitAmount),
    pct: parseFloat(b.limitAmount) > 0 ? ((budgetSpent[b.category] || 0) / parseFloat(b.limitAmount) * 100).toFixed(0) : 0,
  }));

  const pieData = categoryData.map((d, i) => ({
    name: d.category,
    value: parseFloat(d.amount),
    fill: PIE_COLORS[i % PIE_COLORS.length],
    total: categoryData.reduce((s, x) => s + parseFloat(x.amount), 0),
  }));

  const netWorthData = [
    { name: 'Assets', value: parseFloat(summary?.totalAssets || 0), fill: '#22C55E' },
    { name: 'Investments', value: parseFloat(summary?.totalInvestments || 0), fill: '#3B82F6' },
    { name: 'Liabilities', value: parseFloat(summary?.totalLiabilities || 0), fill: '#F59E0B' },
    { name: 'Debt', value: parseFloat(summary?.totalDebt || 0), fill: '#EF4444' },
  ].filter((d) => d.value > 0).map((d) => ({
    ...d,
    total: parseFloat(summary?.totalAssets || 0) + parseFloat(summary?.totalInvestments || 0) + parseFloat(summary?.totalLiabilities || 0) + parseFloat(summary?.totalDebt || 0),
  }));

  const prevMonth = () => selectedMonth === 0 ? (setSelectedMonth(11), setSelectedYear(y => y - 1)) : setSelectedMonth(m => m - 1);
  const nextMonth = () => selectedMonth === 11 ? (setSelectedMonth(0), setSelectedYear(y => y + 1)) : setSelectedMonth(m => m + 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Analytics" subtitle="Spending breakdown" />
      <div className="flex-1 overflow-y-auto p-8 space-y-6">

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          {['monthly', 'yearly', 'weekly', 'custom'].map((f) => (
            <button key={f} onClick={() => setFilterType(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${filterType === f ? 'bg-slate-900 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {f === 'custom' ? 'Custom Range' : f}
            </button>
          ))}
          {filterType === 'monthly' && (
            <div className="flex items-center gap-2 ml-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={16} /></button>
              <span className="font-bold text-slate-700 dark:text-slate-300 w-28 text-center">{MONTHS[selectedMonth]} {selectedYear}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={16} /></button>
            </div>
          )}
          {filterType === 'yearly' && (
            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={16} /></button>
              <span className="font-bold text-slate-700 dark:text-slate-300 w-16 text-center">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={16} /></button>
            </div>
          )}
          {filterType === 'weekly' && <span className="text-sm text-gray-400 dark:text-gray-500 ml-2">Last 8 weeks</span>}
          {filterType === 'custom' && (
            <div className="flex items-center gap-3 ml-2 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Income', value: summary?.totalIncome, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Total Expenses', value: summary?.totalExpenses, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Total Savings', value: summary?.totalSavings, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Net Worth', value: summary?.netWorth, color: 'text-slate-800 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-slate-900/20' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-5`}>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* Chart 1 — Income vs Expense Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Income vs Expense Trend</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-lg capitalize">{filterType}</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<RupeeTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <Bar dataKey="Income" fill="#22C55E" radius={[6,6,0,0]} maxBarSize={50} label={<CustomBarLabel />} />
              <Bar dataKey="Expense" fill="#EF4444" radius={[6,6,0,0]} maxBarSize={50} label={<CustomBarLabel />} />
              {filterType !== 'weekly' && <Bar dataKey="Savings" fill="#3B82F6" radius={[6,6,0,0]} maxBarSize={50} />}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 — Net Balance Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-6">Net Balance Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<RupeeTooltip />} />
              <ReferenceLine y={0} stroke="currentColor" className="text-gray-300 dark:text-gray-600" strokeWidth={2} />
              <Line type="monotone" dataKey="Net" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366F1' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3 & 4 — Budget Utilization + Category Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Utilization */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-6">Budget Utilization</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetChartData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<RupeeTooltip />} />
                <Bar dataKey="Limit" fill="#E2E8F0" radius={[0,6,6,0]} maxBarSize={18} />
                <Bar dataKey="Spent" fill="#EF4444" radius={[0,6,6,0]} maxBarSize={18}
                  label={({ x, y, width, height, value, index }) => (
                    <text x={x + width + 6} y={y + height / 2 + 4} fontSize={11} fill="currentColor" className="text-slate-500 dark:text-slate-400" fontWeight={600}>
                      {budgetChartData[index]?.pct}%
                    </text>
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Expense Pie */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-6">Expense by Category</h2>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">No expense data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 5 — Net Worth Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Net Worth Breakdown</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={netWorthData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value">
                  {netWorthData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col justify-between">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Net Worth Summary</h2>
            <div className="space-y-3">
              {[
                { label: 'Total Assets', value: summary?.totalAssets, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'Total Investments', value: summary?.totalInvestments, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Total Liabilities', value: summary?.totalLiabilities, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                { label: 'Total Debt', value: summary?.totalDebt, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`flex items-center justify-between ${bg} rounded-xl px-4 py-3`}>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{fmt(value)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-950 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-white">Net Worth</p>
                <p className={`text-sm font-bold ${parseFloat(summary?.netWorth || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(summary?.netWorth)}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
