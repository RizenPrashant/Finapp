import { Edit2, Trash2, Building2, Wallet, Gem, Home, Car, DollarSign, Receipt, TrendingUp } from 'lucide-react';

const assetIcons = {
  CASH: Wallet,
  BANK: Building2,
  GOLD: Gem,
  PROPERTY: Home,
  VEHICLES: Car,
  INVESTMENTS: TrendingUp,
  OTHER: DollarSign
};

const assetTypeColors = {
  ASSET: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  LIABILITY: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  DEBT: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  INVESTMENT: 'text-green-600 bg-green-50 dark:bg-green-900/20'
};

export default function AssetCard({ asset, onEdit, onDelete, onViewTransactions, deleteLocked }) {
  const Icon = assetIcons[asset.category] || DollarSign;
  const typeColor = assetTypeColors[asset.type] || assetTypeColors.ASSET;
  
  const formatCurrency = (value) => {
    return `₹${parseFloat(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${typeColor}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-lg">
              {asset.name}
            </h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColor}`}>
              {asset.type}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {asset.hasTransactions && onViewTransactions && (
            <button
              onClick={() => onViewTransactions(asset)}
              title="View Transactions"
              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Receipt size={14} />
            </button>
          )}
          <button
            onClick={() => onEdit(asset)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => !deleteLocked && onDelete(asset.id)}
            className={`p-1.5 rounded-lg transition-colors ${deleteLocked ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:hover:text-red-400'}`}
            title={deleteLocked ? 'Delete locked. Unlock in Settings.' : 'Delete'}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Current Value
          </p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {formatCurrency(asset.value)}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Category: <span className="font-medium text-gray-700 dark:text-gray-300">{asset.category}</span>
          </span>
          {asset.date && (
            <span className="text-gray-500 dark:text-gray-400">
              {new Date(asset.date).toLocaleDateString('en-IN', { 
                month: 'short', 
                year: 'numeric' 
              })}
            </span>
          )}
        </div>

        {asset.description && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {asset.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
