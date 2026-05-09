import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Target, ArrowUp, ArrowDown, Home, Gem, Briefcase } from 'lucide-react';
import Header from '../components/Header';
import InvestmentCard from '../components/InvestmentCard';
import AddInvestmentModal from '../components/AddInvestmentModal';
import { getInvestments, getInvestmentsByType, createInvestment, updateInvestment, deleteInvestment, getInvestmentAnalytics } from '../api';

const investmentTypes = [
  { value: 'ALL', label: 'All', icon: PieChart },
  { value: 'PROPERTY', label: 'Property', icon: Home },
  { value: 'GOLD', label: 'Gold', icon: Gem },
  { value: 'STOCKS', label: 'Stocks', icon: TrendingUp },
  { value: 'MUTUAL_FUND', label: 'Mutual Fund', icon: Briefcase },
  { value: 'FD', label: 'Fixed Deposit', icon: DollarSign },
  { value: 'CRYPTOCURRENCY', label: 'Crypto', icon: Target },
];

export default function Investments() {
  const [investments, setInvestments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      let investmentsPromise;
      if (activeTab === 'ALL') {
        investmentsPromise = getInvestments();
      } else {
        investmentsPromise = getInvestmentsByType(activeTab);
      }

      const [investmentsRes, analyticsRes] = await Promise.all([
        investmentsPromise,
        getInvestmentAnalytics()
      ]);

      setInvestments(investmentsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (data) => {
    await createInvestment(data);
    setShowModal(false);
    fetchData();
  };

  const handleEdit = async (data) => {
    await updateInvestment(editingInvestment.id, data);
    setEditingInvestment(null);
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this investment?')) {
      await deleteInvestment(id);
      fetchData();
    }
  };

  const openEdit = (investment) => {
    setEditingInvestment(investment);
    setShowModal(true);
  };

  const formatCurrency = (value) => {
    return `₹${parseFloat(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const isProfit = analytics?.netProfitLoss >= 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Investments" 
        subtitle="Track all your investments in one place"
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Total Invested */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <DollarSign size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Invested</span>
              </div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(analytics.totalInvested)}</p>
            </div>

            {/* Current Value */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <PieChart size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Current Value</span>
              </div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(analytics.totalCurrentValue)}</p>
            </div>

            {/* Net P&L */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${isProfit ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  {isProfit ? <ArrowUp size={18} className="text-green-600" /> : <ArrowDown size={18} className="text-red-600" />}
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Net P&L</span>
              </div>
              <p className={`text-xl font-bold ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isProfit ? '+' : ''}{formatCurrency(analytics.netProfitLoss)}
              </p>
              <p className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}{analytics.profitLossPercentage?.toFixed(2)}%
              </p>
            </div>

            {/* Win/Loss */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Target size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Profitable/Loss</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">{analytics.profitableCount}</span>
                <span className="text-gray-400">/</span>
                <span className="text-lg font-bold text-red-600">{analytics.lossCount}</span>
              </div>
              <p className="text-xs text-gray-400">Investments</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {investmentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setActiveTab(type.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition ${
                    activeTab === type.value
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {type.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { setEditingInvestment(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 dark:hover:bg-blue-700 transition text-sm"
          >
            <Plus size={18} /> Add Investment
          </button>
        </div>

        {/* Investments Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : investments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <PieChart size={32} className="text-gray-400" />
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-medium text-lg">No investments yet</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Add your first investment to track its performance</p>
            <button
              onClick={() => { setEditingInvestment(null); setShowModal(true); }}
              className="mt-4 text-blue-600 font-medium hover:underline"
            >
              Add Investment →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investments.map((investment) => (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddInvestmentModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingInvestment(null); }}
        onSave={editingInvestment ? handleEdit : handleAdd}
        editingInvestment={editingInvestment}
      />
    </div>
  );
}
