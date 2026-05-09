import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, Activity, DollarSign, Target, Percent, Briefcase } from 'lucide-react';
import { getTrades, getTradesByStatus, getTradingAnalytics, deleteTrade, createTrade, updateTrade, getCompoundingHistory, createCompoundingHistory, deleteCompoundingHistory } from '../api';
import AddTradeModal from '../components/AddTradeModal';
import TradeCard from '../components/TradeCard';

export default function Trading() {
  const [trades, setTrades] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [compoundingHistory, setCompoundingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompoundingModal, setShowCompoundingModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tradesRes, analyticsRes, compoundingRes] = await Promise.all([
        activeTab === 'all' ? getTrades() : 
        activeTab === 'open' ? getTradesByStatus('OPEN') :
        activeTab === 'closed' ? getTradesByStatus('CLOSED') : getTrades(),
        getTradingAnalytics(),
        getCompoundingHistory()
      ]);
      setTrades(tradesRes.data);
      setAnalytics(analyticsRes.data);
      setCompoundingHistory(compoundingRes.data);
    } catch (error) {
      console.error('Error fetching trading data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
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
    fetchData();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Trading</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track your stock market trades and portfolio performance</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCompoundingModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <TrendingUp size={18} />
              Add Compounding
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <Plus size={18} />
              Add Trade
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {/* Total Trades */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Activity size={20} className="text-blue-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Trades</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{analytics.totalTrades}</p>
            </div>

            {/* Win Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Target size={20} className="text-green-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Win Rate</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{formatPercentage(analytics.winRate)}</p>
              <p className="text-xs text-gray-400">{analytics.winningTrades}W / {analytics.losingTrades}L</p>
            </div>

            {/* Net PnL */}
            <div className={`rounded-2xl p-4 shadow-sm ${(analytics.netPnL || 0) >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-center gap-3 mb-2">
                <DollarSign size={20} className={(analytics.netPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
                <span className="text-sm text-gray-500 dark:text-gray-400">Net PnL</span>
              </div>
              <p className={`text-2xl font-bold ${(analytics.netPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(analytics.netPnL)}
              </p>
            </div>

            {/* Realized PnL */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={20} className="text-purple-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Realized PnL</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(analytics.realizedPnL)}</p>
            </div>

            {/* Open Positions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase size={20} className="text-orange-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Open Positions</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{analytics.openPositions}</p>
            </div>

            {/* Capital Used */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Percent size={20} className="text-blue-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Capital Used</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(analytics.totalCapitalUsed)}</p>
            </div>
          </div>

          {/* Compounding History */}
          {compoundingHistory.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Compounding History</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {compoundingHistory.map((history) => (
                  <div key={history.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{history.month} {history.year}</span>
                      <button
                        onClick={() => deleteCompoundingHistory(history.id).then(fetchData)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{formatCurrency(history.endingCapital)}</p>
                    <p className={`text-sm ${history.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {history.profit >= 0 ? '+' : ''}{formatCurrency(history.profit)}
                    </p>
                    {history.reinvested && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mt-2 inline-block">Reinvested</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pb-4">
        <div className="flex gap-2">
          {['all', 'open', 'closed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-slate-900 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Trades
            </button>
          ))}
        </div>
      </div>

      {/* Trades Grid */}
      <div className="px-6 pb-6">
        {trades.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">No trades yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Add your first trade to start tracking your portfolio</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trades.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onEdit={() => {
                  setEditingTrade(trade);
                  setShowAddModal(true);
                }}
                onDelete={() => handleDelete(trade.id)}
              />
            ))}
          </div>
        )}
      </div>

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
    reinvested: false,
    month: new Date().toLocaleString('default', { month: 'short' }).toUpperCase(),
    year: new Date().getFullYear()
  });

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      startingCapital: parseFloat(formData.startingCapital),
      endingCapital: parseFloat(formData.endingCapital)
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
              onChange={(e) => setFormData({ ...formData, startingCapital: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, endingCapital: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="12000"
            />
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
