import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeft, Trash2, Edit3, TrendingUp, TrendingDown, DollarSign, PieChart, Target, ArrowUp, ArrowDown, Home, Gem, Briefcase, Building2, Landmark, Wallet, Receipt, CreditCard, Edit2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Header from '../components/Header';
import AddAssetModal from '../components/AddAssetModal';
import AddInvestmentModal from '../components/AddInvestmentModal';
import AddTransactionModal from '../components/AddTransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import CloseInvestmentModal from '../components/CloseInvestmentModal';
import InvestmentCard from '../components/InvestmentCard';
import AssetCard from '../components/AssetCard';
import { 
  getAssetsByType, createAsset, deleteAsset, updateAsset, getDashboardSummary,
  getInvestments, getInvestmentsByType, createInvestment, updateInvestment, deleteInvestment, getInvestmentAnalytics,
  getTransactionsBySource, createTransaction, updateTransaction, deleteTransaction,
  processInvestmentCompounding
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
  const [editingAsset, setEditingAsset] = useState(null);
  
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  
  // Close investment modal
  const [showCloseInvModal, setShowCloseInvModal] = useState(false);
  const [closingInvestment, setClosingInvestment] = useState(null);

  // Bank transactions drill-down
  const [selectedBankAsset, setSelectedBankAsset] = useState(null); // asset object
  const [bankTransactions, setBankTransactions] = useState([]);
  const [bankTxLoading, setBankTxLoading] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  
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
    try {
      console.log('Adding asset:', data);
      await createAsset(data);
      const res = await getAssetsByType(selectedType);
      setAssets(res.data);
      fetchSummary();
      setShowAssetModal(false);
    } catch (error) {
      console.error('Error adding asset:', error);
      alert('Failed to add asset: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditAsset = async (data) => {
    try {
      const { id, ...updateData } = data;
      console.log('Editing asset:', id, updateData);
      await updateAsset(id, updateData);
      const res = await getAssetsByType(selectedType);
      setAssets(res.data);
      fetchSummary();
      setShowAssetModal(false);
      setEditingAsset(null);
    } catch (error) {
      console.error('Error updating asset:', error);
      alert('Failed to update asset: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteAsset = async (id) => {
    try {
      await deleteAsset(id);
      setAssets((prev) => prev.filter((i) => i.id !== id));
      fetchSummary();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset: ' + (error.response?.data?.message || error.message));
    }
  };

  const openEditAsset = (asset) => {
    setEditingAsset(asset);
    setShowAssetModal(true);
  };

  // Bank / Credit Card transactions handlers
  const [txDateFilter, setTxDateFilter] = useState({ start: '', end: '' });
  const [txCategoryFilter, setTxCategoryFilter] = useState([]);

  const openSourceTransactions = async (asset) => {
    setSelectedBankAsset(asset);
    setBankTxLoading(true);
    setTxDateFilter({ start: '', end: '' });
    setTxCategoryFilter([]);
    try {
      const res = await getTransactionsBySource(asset.name);
      setBankTransactions(res.data);
    } catch (e) {
      console.error('Error loading transactions:', e);
    }
    setBankTxLoading(false);
  };

  const handleAddBankTx = async (data) => {
    try {
      await createTransaction({ ...data, paymentSource: selectedBankAsset.name });
      const res = await getTransactionsBySource(selectedBankAsset.name);
      setBankTransactions(res.data);
      setShowAddTxModal(false);
    } catch (e) {
      alert('Failed to add transaction: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleEditBankTx = async (id, data) => {
    try {
      await updateTransaction(id, data);
      const res = await getTransactionsBySource(selectedBankAsset.name);
      setBankTransactions(res.data);
      setEditingTx(null);
    } catch (e) {
      alert('Failed to update transaction: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDeleteBankTx = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteTransaction(id);
      setBankTransactions(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert('Failed to delete: ' + (e.response?.data?.message || e.message));
    }
  };

  // Investment handlers
  const handleAddInvestment = async (data) => {
    try {
      console.log('Adding investment:', data);
      await createInvestment(data);
      const res = investmentTab === 'ALL' ? await getInvestments() : await getInvestmentsByType(investmentTab);
      setInvestments(res.data);
      fetchSummary();
      setShowInvestmentModal(false);
    } catch (error) {
      console.error('Error adding investment:', error);
      alert('Failed to add investment: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditInvestment = async (data) => {
    try {
      console.log('Editing investment:', editingInvestment.id, data);
      await updateInvestment(editingInvestment.id, data);
      const res = investmentTab === 'ALL' ? await getInvestments() : await getInvestmentsByType(investmentTab);
      setInvestments(res.data);
      fetchSummary();
      setShowInvestmentModal(false);
      setEditingInvestment(null);
    } catch (error) {
      console.error('Error updating investment:', error);
      alert('Failed to update investment: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteInvestment = async (id) => {
    try {
      await deleteInvestment(id);
      setInvestments((prev) => prev.filter((i) => i.id !== id));
      fetchSummary();
    } catch (error) {
      console.error('Error deleting investment:', error);
      alert('Failed to delete investment: ' + (error.response?.data?.message || error.message));
    }
  };

  // Open close investment modal
  const handleCloseInvestment = (investment) => {
    setClosingInvestment(investment);
    setShowCloseInvModal(true);
  };

  // Confirm close investment with reinvest amount
  const confirmCloseInvestment = async (closeData) => {
    if (!closingInvestment) return;
    
    const { sellValue, profit, reinvestAmount } = closeData;
    const name = closingInvestment.name || 'Investment';
    const type = closingInvestment.type || 'OTHER';

    try {
      // 1. Update investment status to CLOSED and set sell value as current value
      await updateInvestment(closingInvestment.id, {
        ...closingInvestment,
        currentValue: sellValue,
        status: 'CLOSED',
      });
      
      // 2. If profit is positive and reinvest amount > 0, add to compounding
      if (profit > 0 && reinvestAmount > 0) {
        await processInvestmentCompounding(profit, reinvestAmount, `Close: ${name} (${type})`);
      }
      
      // 3. Refresh investments list
      const res = investmentTab === 'ALL' ? await getInvestments() : await getInvestmentsByType(investmentTab);
      setInvestments(res.data);
      fetchSummary();
      setShowCloseInvModal(false);
      setClosingInvestment(null);
      alert(`Investment "${name}" closed successfully!`);
    } catch (error) {
      console.error('Error closing investment:', error);
      alert('Failed to close investment: ' + (error.response?.data?.message || error.message));
    }
  };

  const openEditInvestment = (inv) => {
    setEditingInvestment(inv);
    setShowInvestmentModal(true);
  };

  const fmt = (val) => val != null ? `₹${parseFloat(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';

  const summaryMap = {
    ASSET: summary?.totalAssets,
    LIABILITY: summary?.totalLiabilities,
    DEBT: summary?.totalDebt,
    INVESTMENT: summary?.totalInvestments,
  };

  const isProfit = investmentAnalytics?.netProfitLoss >= 0;

  // ========== BANK TRANSACTIONS VIEW ==========
  if (selectedBankAsset) {
    // Filter transactions based on date and category
    let filteredTransactions = bankTransactions.filter(t => {
      // Date filter
      if (txDateFilter.start && new Date(t.date) < new Date(txDateFilter.start)) return false;
      if (txDateFilter.end && new Date(t.date) > new Date(txDateFilter.end)) return false;
      // Category filter
      if (txCategoryFilter.length > 0 && !txCategoryFilter.includes(t.category)) return false;
      return true;
    });

    const totalCredit = filteredTransactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalDebit = filteredTransactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + parseFloat(t.amount), 0);
    const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get unique categories for filter dropdown
    const uniqueCategories = [...new Set(bankTransactions.map(t => t.category))].sort();

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={selectedBankAsset.name} subtitle={`${selectedBankAsset.category} Transactions`} onProfileClick={onProfileClick} />
        <div className="flex-1 overflow-y-auto p-6">
          {/* Back + Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedBankAsset(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{selectedBankAsset.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{bankTransactions.length} transactions · Balance: {fmt(selectedBankAsset.value)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddTxModal(true)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition text-sm"
            >
              <Plus size={18} /> Add Transaction
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Balance</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{fmt(selectedBankAsset.value)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownCircle size={16} className="text-green-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Credit</p>
              </div>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">+{fmt(totalCredit)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpCircle size={16} className="text-red-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Debit</p>
              </div>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">-{fmt(totalDebit)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">From</label>
                  <input
                    type="date"
                    value={txDateFilter.start}
                    onChange={(e) => setTxDateFilter(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <span className="text-gray-400 pb-1">→</span>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">To</label>
                  <input
                    type="date"
                    value={txDateFilter.end}
                    onChange={(e) => setTxDateFilter(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Category Filter */}
              {uniqueCategories.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Categories</label>
                  <select
                    multiple
                    value={txCategoryFilter}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions).map(o => o.value);
                      setTxCategoryFilter(options);
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                    size={Math.min(3, uniqueCategories.length)}
                  >
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear Filters */}
              {(txDateFilter.start || txDateFilter.end || txCategoryFilter.length > 0) && (
                <button
                  onClick={() => { setTxDateFilter({ start: '', end: '' }); setTxCategoryFilter([]); }}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                >
                  Clear Filters
                </button>
              )}

              <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                Showing {sorted.length} of {bankTransactions.length} transactions
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {bankTxLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-2xl h-16 animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
              <Receipt size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-slate-800 dark:text-slate-200 font-medium">No transactions yet</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Add transactions linked to {selectedBankAsset.name}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {sorted.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${tx.type === 'CREDIT' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                            {tx.type === 'CREDIT'
                              ? <ArrowDownCircle size={14} className="text-green-600" />
                              : <ArrowUpCircle size={14} className="text-red-600" />}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{tx.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">{tx.category}</td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-bold ${tx.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}{fmt(tx.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingTx(tx)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDeleteBankTx(tx.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAddTxModal && (
          <AddTransactionModal
            budgetCategory="Miscellaneous"
            prefilledSource={selectedBankAsset.name}
            onClose={() => setShowAddTxModal(false)}
            onSave={handleAddBankTx}
          />
        )}
        {editingTx && (
          <EditTransactionModal
            transaction={editingTx}
            onClose={() => setEditingTx(null)}
            onSave={handleEditBankTx}
          />
        )}
      </div>
    );
  }

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
                    onClose={handleCloseInvestment}
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
                    onViewTransactions={openSourceTransactions}
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
            onClose={() => { setShowAssetModal(false); setEditingAsset(null); }}
            onSave={editingAsset ? handleEditAsset : handleAddAsset}
            editingAsset={editingAsset}
          />
        )}
        {showInvestmentModal && (
          <AddInvestmentModal
            isOpen={true}
            onClose={() => { setShowInvestmentModal(false); setEditingInvestment(null); }}
            onSave={editingInvestment ? handleEditInvestment : handleAddInvestment}
            editingInvestment={editingInvestment}
          />
        )}

        {/* Close Investment Modal */}
        {showCloseInvModal && closingInvestment && (
          <CloseInvestmentModal
            isOpen={true}
            onClose={() => { setShowCloseInvModal(false); setClosingInvestment(null); }}
            onConfirm={confirmCloseInvestment}
            investment={closingInvestment}
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
              className={`bg-white dark:bg-gray-800 rounded-2xl border ${card.border} dark:border-gray-700 shadow-sm p-6 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all group`}
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
