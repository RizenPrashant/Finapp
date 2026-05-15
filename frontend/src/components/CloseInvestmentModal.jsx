import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function CloseInvestmentModal({ isOpen, onClose, onConfirm, investment }) {
  const [reinvestAmount, setReinvestAmount] = useState('');
  const [sellValue, setSellValue] = useState('');

  useEffect(() => {
    if (isOpen && investment) {
      // Default: Full profit reinvest
      const profit = investment.profitLoss || 0;
      const currentValue = investment.totalCurrentValue || investment.currentValue || 0;
      setSellValue(currentValue.toString());
      setReinvestAmount(profit > 0 ? profit.toString() : '0');
    }
  }, [isOpen, investment]);

  if (!isOpen || !investment) return null;

  // Calculate totals
  const totalInvested = parseFloat(investment.totalInvested) || (parseFloat(investment.buyPrice) * (parseInt(investment.quantity) || 1));
  const sellPrice = parseFloat(sellValue) || 0;
  const calculatedProfit = sellPrice - totalInvested;
  const calculatedProfitPct = totalInvested > 0 ? ((calculatedProfit / totalInvested) * 100) : 0;
  
  // Reinvest amount (capped at calculated profit)
  const reinvest = Math.min(parseFloat(reinvestAmount) || 0, calculatedProfit > 0 ? calculatedProfit : 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      sellValue: sellPrice,
      profit: calculatedProfit,
      reinvestAmount: reinvest,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Close Investment
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Investment Name */}
          <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Investment</p>
            <p className="font-bold text-slate-800 dark:text-slate-200">{investment.name}</p>
            <p className="text-xs text-gray-400">{investment.type}</p>
          </div>

          {/* Sell Value Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Sell Value (₹)
            </label>
            <input
              type="number"
              value={sellValue}
              onChange={(e) => setSellValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="Enter sell value"
              min="0"
              step="0.01"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Invested: ₹{totalInvested.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Profit/Loss Display */}
          <div className={`p-4 rounded-xl ${calculatedProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Profit/Loss</span>
              <span className={`text-lg font-bold ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculatedProfit >= 0 ? '+' : ''}₹{calculatedProfit.toLocaleString('en-IN')}
              </span>
            </div>
            {totalInvested > 0 && (
              <p className={`text-sm mt-1 ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({calculatedProfitPct.toFixed(2)}%)
              </p>
            )}
          </div>

          {/* Reinvest Amount - Only show if profit > 0 */}
          {calculatedProfit > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount to Reinvest (₹) <span className="text-gray-400 font-normal">(Max: ₹{calculatedProfit.toLocaleString('en-IN')})</span>
              </label>
              <input
                type="number"
                value={reinvestAmount}
                onChange={(e) => setReinvestAmount(e.target.value)}
                max={calculatedProfit}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                placeholder="0"
              />
              {calculatedProfit > 0 && (
                <input
                  type="range"
                  min="0"
                  max={calculatedProfit}
                  step={calculatedProfit / 100}
                  value={reinvest}
                  onChange={(e) => setReinvestAmount(e.target.value)}
                  className="w-full mt-2 accent-slate-800"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                ₹{(calculatedProfit - reinvest).toLocaleString('en-IN')} will be kept as realized profit
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Sell Value</span>
              <span className="font-semibold">₹{sellPrice.toLocaleString('en-IN')}</span>
            </div>
            {calculatedProfit > 0 && reinvest > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Reinvesting</span>
                <span className="font-semibold text-blue-600">₹{reinvest.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">Status</span>
              <span className="font-bold text-red-600">CLOSED</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-700 transition"
            >
              Close Investment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
