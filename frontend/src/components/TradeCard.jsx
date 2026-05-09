import { TrendingUp, TrendingDown, Edit2, Trash2, Calendar, DollarSign, Briefcase } from 'lucide-react';

export default function TradeCard({ trade, onEdit, onDelete }) {
  const isProfit = (trade.profitLoss || 0) >= 0;
  const isOpen = trade.status === 'OPEN';

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getSegmentColor = (segment) => {
    const colors = {
      'EQUITY': 'bg-blue-100 text-blue-700',
      'INTRADAY': 'bg-purple-100 text-purple-700',
      'SWING': 'bg-green-100 text-green-700',
      'FNO': 'bg-orange-100 text-orange-700',
      'CRYPTO': 'bg-yellow-100 text-yellow-700',
      'MUTUAL_FUND': 'bg-pink-100 text-pink-700',
      'LONG_TERM': 'bg-indigo-100 text-indigo-700'
    };
    return colors[segment] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProfit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {isProfit ? (
              <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown size={20} className="text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">{trade.stockName}</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSegmentColor(trade.segment)}`}>
              {trade.segment}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Trade Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{trade.quantity} shares</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Buy Price</p>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(trade.buyPrice)}</p>
        </div>
        {!isOpen && trade.sellPrice && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sell Price</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(trade.sellPrice)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Invested</p>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(trade.investedAmount)}</p>
        </div>
      </div>

      {/* PnL Section */}
      {!isOpen && (
        <div className={`rounded-xl p-3 mb-3 ${isProfit ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit/Loss</p>
              <p className={`text-lg font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}{formatCurrency(trade.profitLoss)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Return %</p>
              <p className={`text-lg font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}{formatPercentage(trade.profitLossPercentage)}
              </p>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Position Open</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>Entry: {new Date(trade.entryDate).toLocaleDateString()}</span>
        </div>
        {!isOpen && trade.exitDate && (
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>Exit: {new Date(trade.exitDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {trade.notes && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
          {trade.notes}
        </p>
      )}
    </div>
  );
}
