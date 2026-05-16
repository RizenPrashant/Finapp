import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Activity, DollarSign, Target, Percent, Briefcase, Building2, ChevronLeft, ChevronRight, Calendar, TrendingUp as TrendingUpIcon, Upload } from 'lucide-react';
import { getTrades, getTradesByStatus, getTradesByBroker, getBrokers, getTradingAnalytics, deleteTrade, createTrade, updateTrade, getCompoundingHistory, createCompoundingHistory, deleteCompoundingHistory } from '../api';
import AddTradeModal from '../components/AddTradeModal';
import ImportModal from '../components/ImportModal';
import TradeCard from '../components/TradeCard';
import { FILTER_PREFS_KEY, isDeleteLocked } from '../pages/Settings';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Trading() {
  const [trades, setTrades] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [compoundingHistory, setCompoundingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBroker, setSelectedBroker] = useState('');
  const [brokers, setBrokers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompoundingModal, setShowCompoundingModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date filters - default from settings
  const now = new Date();
  const getDefaultFilter = () => {
    const saved = localStorage.getItem(FILTER_PREFS_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      return prefs.trading || 'monthly';
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
    try {
      setLoading(true);

      let tradesPromise;
      if (selectedBroker) {
        tradesPromise = getTradesByBroker(selectedBroker);
      } else if (activeTab === 'all') {
        tradesPromise = getTrades();
      } else if (activeTab === 'open') {
        tradesPromise = getTradesByStatus('OPEN');
      } else if (activeTab === 'closed') {
        tradesPromise = getTradesByStatus('CLOSED');
      } else {
        tradesPromise = getTrades();
      }

      const [tradesRes, analyticsRes, compoundingRes, brokersRes] = await Promise.all([
        tradesPromise,
        getTradingAnalytics(),
        getCompoundingHistory(),
        getBrokers()
      ]);
      setTrades(tradesRes.data);
      setAnalytics(analyticsRes.data);
      // Only show trade-linked compounding entries in Trading page
      const tradeLinkedCompounding = (compoundingRes.data || []).filter(h => h.tradeId != null);
      setCompoundingHistory(tradeLinkedCompounding);
      // Merge API brokers with custom brokers from localStorage, filter out empty/null
      const apiBrokers = (brokersRes.data || []).filter(b => b && b.trim() !== '');
      const customBrokers = JSON.parse(localStorage.getItem('finapp_custom_brokers') || '[]').filter(b => b && b.trim() !== '');
      setBrokers([...new Set([...apiBrokers, ...customBrokers])]);
    } catch (error) {
      console.error('Error fetching trading data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedBroker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tradeDeleteLocked = isDeleteLocked('trades');

  const handleDelete = async (id) => {
    if (tradeDeleteLocked) return;
    if (window.confirm('Delete this trade?')) {
      await deleteTrade(id);
      fetchData();
    }
  };

  const handleAddTrade = async (tradeData) => {
    await createTrade(tradeData);
    setShowAddModal(false);
    fetchData();
  };

  const handleEditTrade = async (tradeData) => {
    await updateTrade(editingTrade.id, tradeData);
    setEditingTrade(null);
    setShowAddModal(false);
    fetchData();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  // Date filter logic for trades
  const filteredTrades = useMemo(() => {
    if (dateFilterType === 'all') return trades;

    return trades.filter(t => {
      const tradeDate = new Date(t.entryDate || t.date);
      const tradeYear = tradeDate.getFullYear();
      const tradeMonth = tradeDate.getMonth();

      switch (dateFilterType) {
        case 'daily':
          return (t.entryDate || t.date) === selectedDate;
        case 'weekly': {
          const start = new Date(selectedDate);
          start.setDate(start.getDate() - start.getDay()); // Sunday
          const end = new Date(start);
          end.setDate(end.getDate() + 6); // Saturday
          return tradeDate >= start && tradeDate <= end;
        }
        case 'monthly':
          return tradeYear === selectedYear && tradeMonth === selectedMonth;
        case 'yearly':
          return tradeYear === selectedYear;
        case 'custom': {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59);
          return tradeDate >= start && tradeDate <= end;
        }
        default:
          return true;
      }
    });
  }, [trades, dateFilterType, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Calculate filtered analytics
  const filteredAnalytics = useMemo(() => {
    if (!analytics || dateFilterType === 'all') return analytics;

    const totalTrades = filteredTrades.length;
    const winningTrades = filteredTrades.filter(t => (t.pnl || 0) > 0).length;
    const losingTrades = filteredTrades.filter(t => (t.pnl || 0) < 0).length;
    const netPnL = filteredTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const realizedPnL = filteredTrades.filter(t => t.status === 'CLOSED').reduce((s, t) => s + (t.pnl || 0), 0);
    const openPositions = filteredTrades.filter(t => t.status === 'OPEN').length;

    return {
      ...analytics,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      netPnL,
      realizedPnL,
      openPositions,
      capitalUsed: filteredTrades.filter(t => t.status === 'OPEN').reduce((s, t) => s + ((t.quantity || 0) * (t.entryPrice || 0)), 0)
    };
  }, [filteredTrades, analytics, dateFilterType]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen flex flex-col bg-gray-50/50 dark:bg-gray-900 overflow-hidden">
      {/* Sticky Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 px-6 py-4 flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-900 dark:bg-slate-700 rounded-xl">
              <TrendingUpIcon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Trading</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Track trades & portfolio</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCompoundingModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
            >
              <TrendingUp size={16} />
              <span className="hidden sm:inline">Add Compounding</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Trade</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60 px-6 py-3 flex-shrink-0 z-10">
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

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
      {/* Sticky Analytics Section */}
      {filteredAnalytics && (
        <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {/* Total Trades */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Activity size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Trades</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {filteredAnalytics.totalTrades}
                {dateFilterType !== 'all' && <span className="text-[10px] text-gray-400 ml-1 font-normal">(f)</span>}
              </p>
            </div>

            {/* Win Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <Target size={14} className="text-green-600 dark:text-green-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Win Rate</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatPercentage(filteredAnalytics.winRate)}</p>
              <p className="text-[10px] text-gray-400">{filteredAnalytics.winningTrades}W/{filteredAnalytics.losingTrades}L</p>
            </div>

            {/* Net PnL */}
            <div className={`rounded-xl p-3 shadow-sm border ${(filteredAnalytics.netPnL || 0) >= 0 ? 'bg-green-50/80 dark:bg-green-900/20 border-green-100 dark:border-green-800/30' : 'bg-red-50/80 dark:bg-red-900/20 border-red-100 dark:border-red-800/30'} hover:shadow-md transition-shadow`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded-lg ${(filteredAnalytics.netPnL || 0) >= 0 ? 'bg-green-100 dark:bg-green-800/40' : 'bg-red-100 dark:bg-red-800/40'}`}>
                  <DollarSign size={14} className={(filteredAnalytics.netPnL || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Net PnL</span>
              </div>
              <p className={`text-base font-bold truncate ${(filteredAnalytics.netPnL || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(filteredAnalytics.netPnL)}
              </p>
            </div>

            {/* Realized PnL */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp size={14} className="text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Realized</span>
              </div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">{formatCurrency(filteredAnalytics.realizedPnL)}</p>
            </div>

            {/* Open Positions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                  <Briefcase size={14} className="text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Open</span>
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{filteredAnalytics.openPositions}</p>
            </div>

            {/* Capital Used */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <Percent size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Capital</span>
              </div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">{formatCurrency(filteredAnalytics.capitalUsed)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Compounding History Section */}
      {compoundingHistory.length > 0 && (
        <div className="px-6 py-3 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Compounding History</h3>
            <span className="text-xs text-gray-400">{compoundingHistory.length} entries</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {compoundingHistory.map((history) => (
              <div key={history.id} className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 min-w-[140px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{history.month} {history.year}</span>
                  <button
                    onClick={() => !isDeleteLocked('compounding') && deleteCompoundingHistory(history.id).then(fetchData)}
                    className={`text-xs w-5 h-5 flex items-center justify-center rounded transition ${isDeleteLocked('compounding') ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                    title={isDeleteLocked('compounding') ? 'Delete locked. Unlock in Settings.' : 'Delete'}
                  >
                    ×
                  </button>
                </div>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">{formatCurrency(history.endingCapital)}</p>
                <p className={`text-xs ${history.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  P: {history.profit >= 0 ? '+' : ''}{formatCurrency(history.profit)}
                </p>
                {history.reinvestAmount > 0 && (
                  <p className="text-[10px] text-blue-600 font-medium mt-1">
                    R: {formatCurrency(history.reinvestAmount)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs & Broker Filter - Sticky */}
      <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm px-6 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex flex-wrap items-center gap-3">

          <div className="flex gap-2">
            {['all', 'open', 'closed'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedBroker(''); }}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === tab && !selectedBroker
                    ? 'bg-slate-900 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Trades
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>

          {/* Broker Filter */}
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-gray-500" />
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="">All Brokers</option>
              {brokers.map((broker) => (
                <option key={broker} value={broker}>{broker}</option>
              ))}
            </select>
            {selectedBroker && (
              <button
                onClick={() => setSelectedBroker('')}
                className="text-xs text-gray-500 hover:text-red-500 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trades Grid - Using Filtered Data */}
      <div className="px-6 pb-6">
        {filteredTrades.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
              {trades.length === 0 ? 'No trades yet' : 'No trades for this period'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {trades.length === 0 ? 'Add your first trade to start tracking your portfolio' : 'Try changing the date filter'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTrades.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onEdit={() => {
                  setEditingTrade(trade);
                  setShowAddModal(true);
                }}
                onDelete={() => handleDelete(trade.id)}
                deleteLocked={tradeDeleteLocked}
              />
            ))}
          </div>
        )}
      </div>
      </div> {/* End Scrollable Content */}

      {/* Add/Edit Trade Modal */}
      {showAddModal && (
        <AddTradeModal
          onClose={() => {
            setShowAddModal(false);
            setEditingTrade(null);
          }}
          onSubmit={editingTrade ? handleEditTrade : handleAddTrade}
          initialData={editingTrade}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          type="trades"
        />
      )}

      {/* Simple Compounding Modal */}
      {showCompoundingModal && (
        <AddCompoundingModal
          onClose={() => setShowCompoundingModal(false)}
          onSubmit={async (data) => {
            await createCompoundingHistory(data);
            setShowCompoundingModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// Simple Compounding Modal Component
function AddCompoundingModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    startingCapital: '',
    endingCapital: '',
    profit: '',
    reinvested: false,
    month: new Date().toLocaleString('default', { month: 'short' }).toUpperCase(),
    year: new Date().getFullYear()
  });

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Auto-calculate profit when capital changes
  const handleCapitalChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    const start = parseFloat(newFormData.startingCapital) || 0;
    const end = parseFloat(newFormData.endingCapital) || 0;
    if (start > 0 && end > 0) {
      newFormData.profit = (end - start).toFixed(2);
    }
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      startingCapital: parseFloat(formData.startingCapital),
      endingCapital: parseFloat(formData.endingCapital),
      profit: parseFloat(formData.profit) || 0
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Add Compounding History</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Starting Capital (₹)</label>
            <input
              type="number"
              required
              value={formData.startingCapital}
              onChange={(e) => handleCapitalChange('startingCapital', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="10000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ending Capital (₹)</label>
            <input
              type="number"
              required
              value={formData.endingCapital}
              onChange={(e) => handleCapitalChange('endingCapital', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="12000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Profit Amount (₹) <span className="text-xs text-gray-400">(Auto-calculated, you can edit)</span>
            </label>
            <input
              type="number"
              value={formData.profit}
              onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="2000"
            />
            <p className="text-xs text-gray-400 mt-1">Enter the exact profit you want to reinvest</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reinvested"
              checked={formData.reinvested}
              onChange={(e) => setFormData({ ...formData, reinvested: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="reinvested" className="text-sm text-gray-700 dark:text-gray-300">Profits Reinvested</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
