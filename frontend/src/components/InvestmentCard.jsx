import { TrendingUp, TrendingDown, Edit2, Trash2, Home, Coins, Gem, Briefcase, Building, DollarSign, PiggyBank, Bitcoin, LandPlot, Landmark, CheckCircle2 } from 'lucide-react';

const typeIcons = {
  PROPERTY: { icon: Home, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  GOLD: { icon: Gem, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  SILVER: { icon: Coins, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20' },
  STOCKS: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  MUTUAL_FUND: { icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  BONDS: { icon: Landmark, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  FD: { icon: PiggyBank, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  RD: { icon: DollarSign, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  PPF: { icon: Building, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
  NPS: { icon: LandPlot, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  CRYPTOCURRENCY: { icon: Bitcoin, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  COMMODITY: { icon: Coins, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  REIT: { icon: Building, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  OTHER: { icon: Briefcase, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' },
};

const typeLabels = {
  PROPERTY: 'Property',
  GOLD: 'Gold',
  SILVER: 'Silver',
  STOCKS: 'Stocks',
  MUTUAL_FUND: 'Mutual Fund',
  BONDS: 'Bonds',
  FD: 'Fixed Deposit',
  RD: 'Recurring Deposit',
  PPF: 'PPF',
  NPS: 'NPS',
  CRYPTOCURRENCY: 'Cryptocurrency',
  COMMODITY: 'Commodity',
  REIT: 'REIT',
  OTHER: 'Other',
};

export default function InvestmentCard({ investment, onEdit, onDelete, onClose }) {
  const typeConfig = typeIcons[investment.type] || typeIcons.OTHER;
  const Icon = typeConfig.icon;
  const isProfit = investment.profitLoss >= 0;
  const ProfitIcon = isProfit ? TrendingUp : TrendingDown;

  const formatCurrency = (value) => {
    return `₹${parseFloat(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${typeConfig.bg}`}>
            <Icon size={22} className={typeConfig.color} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-1">{investment.name}</h4>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                {typeLabels[investment.type]}
              </span>
              {investment.status === 'CLOSED' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  CLOSED
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={() => onClose(investment)}
              className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
              title="Close/Sell Investment"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          <button
            onClick={() => onEdit(investment)}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(investment.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Invested</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(investment.totalInvested)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Value</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(investment.totalCurrentValue)}</p>
        </div>
      </div>

      {/* P&L Bar */}
      <div className={`flex items-center justify-between p-3 rounded-xl ${isProfit ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <div className="flex items-center gap-2">
          <ProfitIcon size={16} className={isProfit ? 'text-green-600' : 'text-red-600'} />
          <span className={`text-sm font-medium ${isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {isProfit ? '+' : ''}{investment.profitLossPercentage?.toFixed(2)}%
          </span>
        </div>
        <span className={`font-bold ${isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
          {isProfit ? '+' : ''}{formatCurrency(investment.profitLoss)}
        </span>
      </div>

      {/* Footer */}
      {investment.quantity > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Qty: {investment.quantity} × {formatCurrency(investment.buyPrice)}
          </p>
        </div>
      )}
    </div>
  );
}
