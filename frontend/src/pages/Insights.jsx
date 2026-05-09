import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeft, Trash2, Edit3, TrendingUp, TrendingDown, DollarSign, PieChart, Target, ArrowUp, ArrowDown, Home, Gem, Briefcase, Building2, Landmark, Wallet, Receipt, CreditCard, Edit2 } from 'lucide-react';
import Header from '../components/Header';
import AddAssetModal from '../components/AddAssetModal';
import EditAssetModal from '../components/EditAssetModal';
import AddInvestmentModal from '../components/AddInvestmentModal';
import InvestmentCard from '../components/InvestmentCard';
import AssetCard from '../components/AssetCard';
import { 
  getAssetsByType, createAsset, deleteAsset, updateAsset, getDashboardSummary,
  getInvestments, getInvestmentsByType, createInvestment, updateInvestment, deleteInvestment, getInvestmentAnalytics
} from '../api';
import { DELETE_LOCK_KEY } from './Settings';

// Summary cards configuration
const summaryCards = [
  { type: 'ASSET', label: 'Assets', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/20', border: 'border-blue-200', desc: 'Property, Gold, Vehicles, Cash' },
  { type: 'LIABILITY', label: 'Liabilities', icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50', darkBg: 'dark:bg-red-900/20', border: 'border-red-200', desc: 'Credit Cards, Personal Loans' },
  { type: 'DEBT', label: 'Debt', icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50', darkBg: 'dark:bg-orange-900/20', border: 'border-orange-200', desc: 'Home Loan, Car Loan, Education' },
  { type: 'INVESTMENT', label: 'Investments', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-900/20', border: 'border-purple-200', desc: 'Stocks, Mutual Funds, Crypto' },
];

const investmentTypes = [
  { value: 'ALL', label: 'All', icon: PieChart },
  { value: 'PROPERTY', label: 'Property', icon: Home },
  { value: 'GOLD', label: 'Gold', icon: Gem },
  { value: 'STOCKS', label: 'Stocks', icon: TrendingUp },
  { value: 'MUTUAL_FUND', label: 'Mutual Fund', icon: Briefcase },
  { value: 'FD', label: 'Fixed Deposit', icon: DollarSign },
  { value: 'CRYPTOCURRENCY', label: 'Crypto', icon: Target },
];

export default function Insights({ onProfileClick }) {
  const [summary, setSummary] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // null = summary view
  
  // Assets data
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  
  // Investments data
  const [investments, setInvestments] = useState([]);
  const [investmentAnalytics, setInvestmentAnalytics] = useState(null);
  const [investmentTab, setInvestmentTab] = useState('ALL');
  const [investmentsLoading, setInvestmentsLoading] = useState(false);
  
  // Modals
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showEditAssetModal, setShowEditAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  
  const deleteLocked = localStorage.getItem(DELETE_LOCK_KEY) === 'true';

  const fetchSummary = useCallback(async () => {
    const res = await getDashboardSummary();
    setSummary(res.data);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Load data when type is selected
  useEffect(() => {
    if (!selectedType) return;
    
    const loadData = async () => {
      if (selectedType === 'INVESTMENT') {
        setInvestmentsLoading(true);
        try {
          let promise = investmentTab === 'ALL' ? getInvestments() : getInvestmentsByType(investmentTab);
          const [invRes, analRes] = await Promise.all([promise, getInvestmentAnalytics()]);
          setInvestments(invRes.data);
          setInvestmentAnalytics(analRes.data);
        } catch (e) {
          console.error('Error loading investments:', e);
        }
        setInvestmentsLoading(false);
      } else {
        setAssetsLoading(true);
        try {
          const res = await getAssetsByType(selectedType);
          setAssets(res.data);
        } catch (e) {
          console.error('Error loading assets:', e);
        }
        setAssetsLoading(false);
      }
    };
    
    loadData();
  }, [selectedType, investmentTab]);

  const handleCardClick = (type) => {
    setSelectedType(type);
  };

  // Asset handlers
  const handleAddAsset = async (data) => {
    await createAsset(data);
    const res = await getAssetsByType(selectedType);
    setAssets(res.data);
    fetchSummary();
    setShowAssetModal(false);
  };

  const handleEditAsset = async (data) => {
    await updateAsset(editingAsset.id, data);
    const res = await getAssetsByType(selectedType);
    setAssets(res.data);
    fetchSummary();
    setShowEditAssetModal(false);
    setEditingAsset(null);
  };

  const handleDeleteAsset = async (id) => {
    await deleteAsset(id);
    setAssets((prev) => prev.filter((i) => i.id !== id));
    fetchSummary();
  };

  const openEditAsset = (asset) => {
    setEditingAsset(asset);
    setShowEditAssetModal(true);
  };

  // Investment handlers
  const handleAddInvestment = async (data) => {
    await createInvestment(data);
    const res = investmentTab === 'ALL' ? await getInvestments() : await getInvestmentsByType(investmentTab);
    setInvestments(res.data);
    fetchSummary();
    setShowInvestmentModal(false);
  };

  const handleEditInvestment = async (data) => {
    await updateInvestment(editingInvestment.id, data);
    const res = investmentTab === 'ALL' ? await getInvestments() : await getInvestmentsByType(investmentTab);
    setInvestments(res.data);
    fetchSummary();
    setShowInvestmentModal(false);
    setEditingInvestment(null);
  };

  const handleDeleteInvestment = async (id) => {
    await deleteInvestment(id);
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    fetchSummary();
  };

  const openEditInvestment = (inv) => {
    setEditingInvestment(inv);
    setShowInvestmentModal(true);
  };

  const fmt = (val) => val != null ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '₹0';

  const summaryMap = {
    ASSET: summary?.totalAssets,
    LIABILITY: summary?.totalLiabilities,
    DEBT: summary?.totalDebt,
    INVESTMENT: summary?.totalInvestments,
  };

  const isProfit = investmentAnalytics?.netProfitLoss >= 0;

  // ========== DETAIL VIEW ==========
  if (selectedType) {
    const card = summaryCards.find(c => c.type === selectedType);
    const isInvestment = selectedType === 'INVESTMENT';
    
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={card.label} 
          subtitle={isInvestment ? "Track your investment performance" : `Manage your ${card.label.toLowerCase()}`}
          onProfileClick={onProfileClick}
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header with Back & Add */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedType(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{card.label}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Total: {fmt(summaryMap[selectedType])} · {isInvestment ? investments.length : assets.length} items
                </p>
              </div>
            </div>
            <button
              onClick={() => isInvestment ? setShowInvestmentModal(true) : setShowAssetModal(true)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 dark:hover:bg-blue-700 transition text-sm"
            >
              <Plus size={18} /> Add {card.label}
            </button>
          </div>

          {/* Analytics Cards - Only for Investments */}
          {isInvestment && investmentAnalytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <DollarSign size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Invested</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{fmt(investmentAnalytics.totalInvested)}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <PieChart size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Current Value</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{fmt(investmentAnalytics.totalCurrentValue)}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${isProfit ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    {isProfit ? <ArrowUp size={18} className="text-green-600" /> : <ArrowDown size={18} className="text-red-600" />}
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Net P&L</span>
                </div>
                <p className={`text-xl font-bold ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isProfit ? '+' : ''}{fmt(investmentAnalytics.netProfitLoss)}
                </p>
                <p className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                  {isProfit ? '+' : ''}{investmentAnalytics.profitLossPercentage?.toFixed(2)}%
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Target size={18} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Profitable/Loss</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-600">{investmentAnalytics.profitableCount}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-lg font-bold text-red-600">{investmentAnalytics.lossCount}</span>
                </div>
                <p className="text-xs text-gray-400">Investments</p>
              </div>
            </div>
          )}

          {/* Filter Tabs - Only for Investments */}
          {isInvestment && (
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4">
              {investmentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setInvestmentTab(type.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition ${
                      investmentTab === type.value
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
          )}

          {/* Content Grid */}
          {isInvestment ? (
            // Investments Grid
            investmentsLoading ? (
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {investments.map((inv) => (
                  <InvestmentCard
                    key={inv.id}
                    investment={inv}
                    onEdit={openEditInvestment}
                    onDelete={handleDeleteInvestment}
                  />
                ))}
              </div>
            )
          ) : (
            // Assets Card Grid (for ASSET, LIABILITY, DEBT)
            assetsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-2xl h-48 animate-pulse" />
                ))}
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 size={40} className="text-gray-400" />
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium text-xl">No {card.label.toLowerCase()} yet</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Add items to track your financial overview</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((item) => (
                  <AssetCard
                    key={item.id}
                    asset={item}
                    onEdit={openEditAsset}
                    onDelete={handleDeleteAsset}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* Modals */}
        {showAssetModal && (
          <AddAssetModal
            assetType={selectedType}
            onClose={() => setShowAssetModal(false)}
            onSave={handleAddAsset}
          />
        )}
        {showEditAssetModal && editingAsset && (
          <EditAssetModal
            asset={editingAsset}
            onClose={() => { setShowEditAssetModal(false); setEditingAsset(null); }}
            onSave={handleEditAsset}
          />
        )}
        {showInvestmentModal && (
          <AddInvestmentModal
            isOpen={showInvestmentModal}
            onClose={() => { setShowInvestmentModal(false); setEditingInvestment(null); }}
            onSave={editingInvestment ? handleEditInvestment : handleAddInvestment}
            editingInvestment={editingInvestment}
          />
        )}
      </div>
    );
  }

  // ========== SUMMARY VIEW ==========
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Insights" 
        subtitle="Financial Overview"
        onProfileClick={onProfileClick}
      />
      
      <div className="flex-1 overflow-y-auto p-6">
        {/* Net Worth - Gradient Border */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="relative p-[2px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm mb-2">Net Worth</p>
              <p className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {fmt(summary?.netWorth)}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Summary Cards - 2 per row */}
        <div className="grid grid-cols-2 gap-5 max-w-4xl mx-auto">
          {summaryCards.map((card) => (
            <div
              key={card.type}
              onClick={() => handleCardClick(card.type)}
              className={`bg-white dark:bg-gray-800 rounded-2xl border-2 ${card.border} dark:border-gray-700 shadow-sm p-6 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all group`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 ${card.bg} ${card.darkBg} rounded-2xl flex items-center justify-center`}>
                  <card.icon size={28} className={card.color} />
                </div>
                <span className={`text-sm font-medium ${card.color} bg-opacity-10 px-3 py-1 rounded-full`}>
                  View →
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">{card.label}</h3>
              <p className={`text-2xl font-bold ${card.color}`}>{fmt(summaryMap[card.type])}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
