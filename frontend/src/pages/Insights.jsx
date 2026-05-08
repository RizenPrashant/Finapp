import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeft, Trash2, Edit3 } from 'lucide-react';
import Header from '../components/Header';
import AddAssetModal from '../components/AddAssetModal';
import EditAssetModal from '../components/EditAssetModal';
import { getAssetsByType, createAsset, deleteAsset, updateAsset, getDashboardSummary } from '../api';
import { DELETE_LOCK_KEY } from './Settings';

const insightCards = [
  { type: 'ASSET', label: 'Total Assets', icon: '🏦', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { type: 'LIABILITY', label: 'Total Liabilities', icon: '💳', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  { type: 'DEBT', label: 'Total Debt', icon: '📋', color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { type: 'INVESTMENT', label: 'Total Investments', icon: '📈', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
];

export default function Insights() {
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const deleteLocked = localStorage.getItem(DELETE_LOCK_KEY) === 'true';

  const fetchSummary = useCallback(async () => {
    const res = await getDashboardSummary();
    setSummary(res.data);
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleCardClick = async (card) => {
    setSelected(card);
    const res = await getAssetsByType(card.type);
    setItems(res.data);
  };

  const handleSave = async (data) => {
    await createAsset(data);
    const res = await getAssetsByType(selected.type);
    setItems(res.data);
    fetchSummary();
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setEditModal(true);
  };

  const handleUpdateAsset = async (id, data) => {
    await updateAsset(id, data);
    const res = await getAssetsByType(selected.type);
    setItems(res.data);
    fetchSummary();
  };

  const handleDelete = async (id) => {
    await deleteAsset(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    fetchSummary();
  };

  const fmt = (val) => val != null ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '₹0';

  const summaryMap = {
    ASSET: summary?.totalAssets,
    LIABILITY: summary?.totalLiabilities,
    DEBT: summary?.totalDebt,
    INVESTMENT: summary?.totalInvestments,
  };

  if (selected) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Insights" subtitle="Financial Overview" />
        <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-50 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-slate-200">{selected.label}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{items.length} items · Total: {fmt(summaryMap[selected.type])}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition text-sm"
              >
                <Plus size={16} /> Add {selected.label.replace('Total ', '')}
              </button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {items.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 py-12">No items yet. Add one!</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 group transition">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-full ${selected.bg} ${selected.color}`}>
                        <span className="text-base">{selected.icon}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{item.category} · {item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`font-bold ${selected.color}`}>{fmt(item.value)}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditAsset(item)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteLocked}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                            deleteLocked 
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                          title={deleteLocked ? 'Deletion is locked' : 'Delete item'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {showModal && (
          <AddAssetModal assetType={selected.type} onClose={() => setShowModal(false)} onSave={handleSave} />
        )}
        {editModal && (
          <EditAssetModal 
            asset={editingAsset} 
            onClose={() => setEditModal(false)} 
            onSave={handleUpdateAsset} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Insights" subtitle="Financial Overview" />
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {insightCards.map((card) => (
            <div
              key={card.type}
              onClick={() => handleCardClick(card)}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-slate-200 dark:hover:border-gray-600 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center text-lg`}>{card.icon}</div>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{fmt(summaryMap[card.type])}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click to view details</p>
            </div>
          ))}
        </div>

        {/* Net Worth Card */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-8">
          <h2 className="text-lg font-bold mb-6">Net Worth Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-sm">Assets</p>
              <p className="text-xl font-bold text-green-400">{fmt(summary?.totalAssets)}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-sm">Investments</p>
              <p className="text-xl font-bold text-blue-400">{fmt(summary?.totalInvestments)}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-sm">Liabilities + Debt</p>
              <p className="text-xl font-bold text-red-400">
                {fmt((parseFloat(summary?.totalLiabilities || 0) + parseFloat(summary?.totalDebt || 0)))}
              </p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-sm">Net Worth</p>
              <p className="text-2xl font-bold text-white">{fmt(summary?.netWorth)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
