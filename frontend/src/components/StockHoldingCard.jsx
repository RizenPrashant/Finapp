import { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Briefcase, Calendar, DollarSign, Package, ArrowRight } from 'lucide-react';

export default function StockHoldingCard({ holding, onTradeClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getSegmentColor = (segment) => {
    const colors = {
      'EQUITY': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'INTRADAY': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'SWING': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'FNO': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'CRYPTO': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'MUTUAL_FUND': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      'LONG_TERM': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
    };
    return colors[segment] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
      {/* Main Card Header */}
      <div 
        className="p-5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {holding.stockName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{holding.stockName}</h3>
              <div className="flex gap-2 items-center mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSegmentColor(holding.segment)}`}>
                  {holding.segment}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {holding.totalTrades} trades
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {holding.totalQuantity} <span className="text-sm font-normal text-gray-500">shares</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Qty</p>
            </div>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition ml-2">
              {isExpanded ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Buy Price</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(holding.averageBuyPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Invested</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(holding.totalInvested)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(holding.currentValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Unrealized P&L</p>
            <p className={`font-semibold ${holding.unrealizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {holding.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPnl)}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Trade Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trade History</h4>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                  {holding.openTrades} Open
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                  {holding.closedTrades} Closed
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              {holding.trades.map((trade, index) => (
                <div 
                  key={trade.tradeId}
                  onClick={() => onTradeClick && onTradeClick(trade)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        trade.status === 'OPEN' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' 
                          : trade.profitLoss >= 0 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                      }`}>
                        {trade.status === 'OPEN' ? (
                          <Briefcase size={14} />
                        ) : trade.profitLoss >= 0 ? (
                          <TrendingUp size={14} />
                        ) : (
                          <TrendingDown size={14} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                            {trade.quantity} shares @ {formatCurrency(trade.buyPrice)}
                          </span>
                          {trade.status === 'CLOSED' && trade.sellPrice && (
                            <>
                              <ArrowRight size={14} className="text-gray-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {formatCurrency(trade.sellPrice)}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <Calendar size={12} />
                          <span>{new Date(trade.entryDate).toLocaleDateString('en-IN')}</span>
                          {trade.broker && (
                            <>
                              <span>•</span>
                              <span>{trade.broker}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {trade.status === 'CLOSED' && trade.profitLoss !== null ? (
                        <>
                          <p className={`font-semibold text-sm ${trade.profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {trade.profitLoss >= 0 ? '+' : ''}{formatCurrency(trade.profitLoss)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {trade.profitLoss >= 0 ? '+' : ''}{formatPercentage(trade.profitLossPercentage)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                            {formatCurrency(trade.investedAmount)}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">Open</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
