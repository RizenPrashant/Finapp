import { useState, useEffect } from 'react';
import { X, Building, Coins, TrendingUp, Home, DollarSign, PiggyBank, Bitcoin, Gem, Briefcase, LandPlot, Landmark } from 'lucide-react';

const investmentTypes = [
  { value: 'PROPERTY', label: 'Property', icon: Home, color: 'text-orange-500' },
  { value: 'GOLD', label: 'Gold', icon: Gem, color: 'text-yellow-500' },
  { value: 'SILVER', label: 'Silver', icon: Coins, color: 'text-gray-400' },
  { value: 'STOCKS', label: 'Stocks', icon: TrendingUp, color: 'text-green-500' },
  { value: 'MUTUAL_FUND', label: 'Mutual Fund', icon: Briefcase, color: 'text-blue-500' },
  { value: 'BONDS', label: 'Bonds', icon: Landmark, color: 'text-purple-500' },
  { value: 'FD', label: 'Fixed Deposit', icon: PiggyBank, color: 'text-pink-500' },
  { value: 'RD', label: 'Recurring Deposit', icon: DollarSign, color: 'text-indigo-500' },
  { value: 'PPF', label: 'PPF', icon: Building, color: 'text-teal-500' },
  { value: 'PF', label: 'PF (EPF)', icon: Building, color: 'text-teal-600' },
  { value: 'NPS', label: 'NPS', icon: LandPlot, color: 'text-cyan-500' },
  { value: 'CRYPTOCURRENCY', label: 'Cryptocurrency', icon: Bitcoin, color: 'text-orange-600' },
  { value: 'COMMODITY', label: 'Commodity', icon: Coins, color: 'text-amber-500' },
  { value: 'REIT', label: 'REIT', icon: Building, color: 'text-rose-500' },
  { value: 'OTHER', label: 'Other', icon: Briefcase, color: 'text-gray-500' },
];

export default function AddInvestmentModal({ isOpen, onClose, onSave, editingInvestment }) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    buyPrice: '',
    currentValue: '',
    quantity: 1,
    buyDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'OPEN',
    // Interest configuration
    interestEnabled: false,
    interestRate: '',
    interestFrequency: 'MONTHLY',
    lastInterestDate: ''
  });

  // Auto-enable interest for FD, RD, BONDS, PPF, PF
  const autoInterestTypes = ['FD', 'RD', 'BONDS', 'PPF', 'PF'];

  useEffect(() => {
    if (editingInvestment) {
      setFormData({
        name: editingInvestment.name || '',
        type: editingInvestment.type || '',
        buyPrice: editingInvestment.buyPrice || '',
        currentValue: editingInvestment.currentValue || '',
        quantity: editingInvestment.quantity || 1,
        buyDate: editingInvestment.buyDate || new Date().toISOString().split('T')[0],
        notes: editingInvestment.notes || '',
        status: editingInvestment.status || 'OPEN',
        interestEnabled: editingInvestment.interestEnabled || false,
        interestRate: editingInvestment.interestRate || '',
        interestFrequency: editingInvestment.interestFrequency || 'MONTHLY',
        lastInterestDate: editingInvestment.lastInterestDate || ''
      });
    } else {
      setFormData({
        name: '',
        type: '',
        buyPrice: '',
        currentValue: '',
        quantity: 1,
        buyDate: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'OPEN',
        interestEnabled: false,
        interestRate: '',
        interestFrequency: 'MONTHLY',
        lastInterestDate: ''
      });
    }
  }, [editingInvestment, isOpen]);

  // Auto-enable interest when selecting FD, RD, Bonds, PPF
  const handleTypeChange = (type) => {
    const shouldAutoEnable = autoInterestTypes.includes(type);
    const defaultRates = {
      'FD': '7.50',
      'RD': '7.20',
      'BONDS': '7.15',
      'PPF': '7.10',
      'PF': '8.25'
    };
    
    setFormData(prev => ({
      ...prev,
      type,
      interestEnabled: shouldAutoEnable,
      interestRate: shouldAutoEnable ? (defaultRates[type] || '7.00') : prev.interestRate
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      buyPrice: parseFloat(formData.buyPrice),
      currentValue: parseFloat(formData.currentValue),
      quantity: parseInt(formData.quantity) || 1,
      interestRate: formData.interestEnabled && formData.interestRate 
        ? parseFloat(formData.interestRate) 
        : null
    };
    
    // Remove empty lastInterestDate if not set
    if (!dataToSave.lastInterestDate) {
      delete dataToSave.lastInterestDate;
    }
    
    onSave(dataToSave);
    onClose();
  };

  if (!isOpen) return null;

  const profitLoss = formData.currentValue && formData.buyPrice
    ? (parseFloat(formData.currentValue) - parseFloat(formData.buyPrice)) * (parseInt(formData.quantity) || 1)
    : 0;

  const profitLossPercent = formData.buyPrice && parseFloat(formData.buyPrice) > 0
    ? ((parseFloat(formData.currentValue) - parseFloat(formData.buyPrice)) / parseFloat(formData.buyPrice)) * 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {editingInvestment ? 'Edit Investment' : 'Add Investment'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Investment Type */}
          <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {investmentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${
                    formData.type === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} className={type.color} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{type.label}</span>
                </button>
              );
            })}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Investment Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 24K Gold Biscuit, Reliance Shares"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              required
            />
          </div>

          {/* Buy Price & Current Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buy Price (₹)</label>
              <input
                type="number"
                value={formData.buyPrice}
                onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                placeholder="10000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Value (₹)</label>
              <input
                type="number"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                placeholder="12000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Quantity & Buy Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buy Date</label>
              <input
                type="date"
                value={formData.buyDate}
                onChange={(e) => setFormData({ ...formData, buyDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                required
              />
            </div>
          </div>

          {/* Live P&L Preview */}
          {formData.buyPrice && formData.currentValue && (
            <div className={`p-4 rounded-xl ${profitLoss >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Unrealized P&L</span>
                <span className={`text-lg font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(profitLoss).toLocaleString('en-IN')}
                  <span className="text-sm ml-1">({profitLossPercent.toFixed(2)}%)</span>
                </span>
              </div>
            </div>
          )}

          {/* Status Toggle - Only show when editing */}
          {editingInvestment && (
            <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Investment Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'OPEN' })}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    formData.status === 'OPEN'
                      ? 'bg-green-500 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500'
                  }`}
                >
                  OPEN
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'CLOSED' })}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                    formData.status === 'CLOSED'
                      ? 'bg-red-500 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500'
                  }`}
                >
                  CLOSED
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details..."
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 resize-none"
            />
          </div>

          {/* Interest Configuration */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="interestEnabled"
                checked={formData.interestEnabled}
                onChange={(e) => setFormData({ ...formData, interestEnabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="interestEnabled" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Enable Interest Calculation
                {autoInterestTypes.includes(formData.type) && (
                  <span className="ml-2 text-xs text-blue-600">(Auto-enabled for {formData.type})</span>
                )}
              </label>
            </div>

            {formData.interestEnabled && (
              <div className="space-y-4 pl-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Interest Rate (% per year)
                    </label>
                    <input
                      type="number"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                      placeholder="7.50"
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                    <p className="text-xs text-gray-500 mt-1">Annual interest rate in percentage</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Interest Frequency
                    </label>
                    <select
                      value={formData.interestFrequency}
                      onChange={(e) => setFormData({ ...formData, interestFrequency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="HALF_YEARLY">Half Yearly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Last Interest Calculated (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.lastInterestDate}
                    onChange={(e) => setFormData({ ...formData, lastInterestDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty if never calculated. System will use buy date.
                  </p>
                </div>
                
                {/* Interest Preview */}
                {formData.interestRate && parseFloat(formData.interestRate) > 0 && formData.buyPrice && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      💡 Interest Preview
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      Principal: ₹{(parseFloat(formData.buyPrice) * (formData.quantity || 1)).toLocaleString('en-IN')} × {formData.interestRate}% = 
                      <span className="font-bold">
                        {' '}₹{((parseFloat(formData.buyPrice) * (formData.quantity || 1) * parseFloat(formData.interestRate) / 100) / 
                        (formData.interestFrequency === 'MONTHLY' ? 12 : 
                         formData.interestFrequency === 'QUARTERLY' ? 4 : 
                         formData.interestFrequency === 'HALF_YEARLY' ? 2 : 1)
                        ).toFixed(2)} per {formData.interestFrequency?.toLowerCase().replace('_', '-').replace('ly', '')}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition"
            >
              {editingInvestment ? 'Update' : 'Save'} Investment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
