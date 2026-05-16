import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Target, ArrowUp, ArrowDown, Home, Gem, Briefcase, Building2, ArrowLeft, Wallet, Landmark, TrendingUp as TrendingUpIcon, BarChart3 } from 'lucide-react';
import Header from '../components/Header';
import AddInvestmentModal from '../components/AddInvestmentModal';
import InvestmentCard from '../components/InvestmentCard';
import AssetCard from '../components/AssetCard';
import AddAssetModal from '../components/AddAssetModal';
import { 
  getInvestments, 
  getInvestmentsByType, 
  createInvestment, 
  updateInvestment, 
  deleteInvestment, 
  getInvestmentAnalytics,
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset 
} from '../api';
import { isDeleteLocked } from '../pages/Settings';

const investmentTypes = [
  { value: 'ALL', label: 'All', icon: PieChart },
  { value: 'PROPERTY', label: 'Property', icon: Home },
  { value: 'GOLD', label: 'Gold', icon: Gem },
  { value: 'STOCKS', label: 'Stocks', icon: TrendingUp },
  { value: 'MUTUAL_FUND', label: 'Mutual Fund', icon: Briefcase },
  { value: 'FD', label: 'Fixed Deposit', icon: DollarSign },
  { value: 'CRYPTOCURRENCY', label: 'Crypto', icon: Target },
];

export default function Assets({ onProfileClick }) {
  // View state - null = show summary cards, 'ASSETS' or 'INVESTMENTS' = show detail
  const [selectedModule, setSelectedModule] = useState(null);
  
  // Assets state
  const [assets, setAssets] = useState([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  
  // Investments state
  const [investments, setInvestments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  
  const [loading, setLoading] = useState(true);

  // Calculate totals
  const assetsTotal = assets.reduce((sum, a) => sum + parseFloat(a.value || 0), 0);
  const investmentsTotal = investments.reduce((sum, i) => sum + parseFloat(i.currentValue || i.buyPrice || 0), 0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      let investmentsPromise;
      if (activeTab === 'ALL') {
        investmentsPromise = getInvestments();
      } else {
        investmentsPromise = getInvestmentsByType(activeTab);
      }

      const [investmentsRes, analyticsRes, assetsRes] = await Promise.all([
        investmentsPromise,
        getInvestmentAnalytics(),
        getAssets()
      ]);

      setInvestments(investmentsRes.data);
      setAnalytics(analyticsRes.data);
      setAssets(assetsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Asset handlers
  const handleAddAsset = async (data) => {
    try {
      await createAsset(data);
      fetchData();
      setShowAssetModal(false);
    } catch (error) {
      console.error('Error adding asset:', error);
    }
  };

  const handleEditAsset = async (data) => {
    try {
      await updateAsset(editingAsset.id, data);
      fetchData();
      setEditingAsset(null);
      setShowAssetModal(false);
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  const assetDeleteLocked = isDeleteLocked('assets');
  const investmentDeleteLocked = isDeleteLocked('investments');

  const handleDeleteAsset = async (id) => {
    if (assetDeleteLocked) return;
    try {
      await deleteAsset(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const openEditAsset = (asset) => {
    setEditingAsset(asset);
    setShowAssetModal(true);
  };

  // Investment handlers
  const handleAddInvestment = async (data) => {
    try {
      await createInvestment(data);
      fetchData();
      setShowInvestmentModal(false);
    } catch (error) {
      console.error('Error adding investment:', error);
    }
  };

  const handleEditInvestment = async (data) => {
    try {
      await updateInvestment(editingInvestment.id, data);
      fetchData();
      setEditingInvestment(null);
      setShowInvestmentModal(false);
    } catch (error) {
      console.error('Error updating investment:', error);
    }
  };

  const handleDeleteInvestment = async (id) => {
    if (investmentDeleteLocked) return;
    try {
      await deleteInvestment(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting investment:', error);
    }
  };

  const openEditInvestment = (investment) => {
    setEditingInvestment(investment);
    setShowInvestmentModal(true);
  };

  const formatCurrency = (value) => {
    return `₹${parseFloat(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const isProfit = analytics?.netProfitLoss >= 0;

  // Summary view with 2 cards
  if (!selectedModule) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Assets" 
          subtitle="Manage your assets and investments"
          onProfileClick={onProfileClick}
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
            {/* Assets Card */}
            <div 
              onClick={() => setSelectedModule('ASSETS')}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 cursor-pointer hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                  <Landmark size={28} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                  {assets.length} items
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Assets</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Physical & financial assets like Property, Gold, Vehicles</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(assetsTotal)}</p>
              <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                View Details →
              </div>
            </div>

            {/* Investments Card */}
            <div 
              onClick={() => setSelectedModule('INVESTMENTS')}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 cursor-pointer hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-700 transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                  <TrendingUpIcon size={28} className="text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">
                  {investments.length} items
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Investments</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Stocks, Mutual Funds, Crypto, FD and more</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(investmentsTotal)}</p>
              {analytics && (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                    {isProfit ? '+' : ''}{analytics.profitLossPercentage?.toFixed(1)}%
                  </span>
                  <span className="text-gray-400 text-sm">P&L</span>
                </div>
              )}
              <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                View Details →
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showAssetModal && (
          <AddAssetModal
            assetType="ASSET"
            onClose={() => { setShowAssetModal(false); setEditingAsset(null); }}
            onSave={editingAsset ? handleEditAsset : handleAddAsset}
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

  // Assets Detail View
  if (selectedModule === 'ASSETS') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Assets" 
          subtitle="Manage your physical and financial assets"
          onProfileClick={onProfileClick}
        />

        <div className="flex-1 overflow-y-auto p-6">
          {/* Back button & Add */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedModule(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Assets</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total: {formatCurrency(assetsTotal)} · {assets.length} items</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingAsset(null); setShowAssetModal(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition text-sm"
            >
              <Plus size={18} /> Add Asset
            </button>
          </div>

          {/* Assets Grid */}
          {loading ? (
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
              <p className="text-slate-800 dark:text-slate-200 font-medium text-xl">No assets yet</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 mb-6">Add your assets to track your net worth</p>
              <button
                onClick={() => { setEditingAsset(null); setShowAssetModal(true); }}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition mx-auto"
              >
                <Plus size={20} /> Add Your First Asset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onEdit={openEditAsset}
                  onDelete={handleDeleteAsset}
                  deleteLocked={assetDeleteLocked}
                />
              ))}
            </div>
          )}
        </div>

        {/* Asset Modal */}
        {showAssetModal && (
          <AddAssetModal
            assetType="ASSET"
            onClose={() => { setShowAssetModal(false); setEditingAsset(null); }}
            onSave={editingAsset ? handleEditAsset : handleAddAsset}
          />
        )}
      </div>
    );
  }

  // Investments Detail View
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Investments" 
        subtitle="Track your investment performance"
        onProfileClick={onProfileClick}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Back button & Add */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedModule(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Investments</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Value: {formatCurrency(investmentsTotal)} · {investments.length} items</p>
            </div>
          </div>
          <button
            onClick={() => { setEditingInvestment(null); setShowInvestmentModal(true); }}
            className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 dark:hover:bg-blue-700 transition text-sm"
          >
            <Plus size={18} /> Add Investment
          </button>
        </div>

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
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4">
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
              onClick={() => { setEditingInvestment(null); setShowInvestmentModal(true); }}
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
                onEdit={openEditInvestment}
                onDelete={handleDeleteInvestment}
                deleteLocked={investmentDeleteLocked}
              />
            ))}
          </div>
        )}
      </div>

      {/* Asset Modal */}
      {showAssetModal && (
        <AddAssetModal
          assetType="ASSET"
          onClose={() => { setShowAssetModal(false); setEditingAsset(null); }}
          onSave={editingAsset ? handleEditAsset : handleAddAsset}
        />
      )}

      {/* Investment Modal */}
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
