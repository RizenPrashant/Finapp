import { useState, useEffect } from 'react';
import { X, Wallet, Building2, Gem, Home, Car, TrendingUp, PiggyBank, Briefcase, Landmark, Coins, Target, Receipt, CreditCard } from 'lucide-react';

/**
 * Hierarchical Asset Categories
 * Assets
 * ├── Cash
 * ├── Bank (Savings, FD, etc.)
 * ├── Gold
 * ├── Property
 * ├── Vehicles
 * └── Investments
 *       ├── Stocks
 *       ├── Mutual Funds
 *       ├── Crypto
 *       ├── Trading
 *       └── Rental Property
 */

// Main asset categories with icons
const assetCategories = {
  ASSET: [
    { value: 'CASH', label: 'Cash', icon: Wallet, description: 'Physical cash and liquid funds' },
    { value: 'BANK', label: 'Bank', icon: Landmark, description: 'Savings, current, and FD accounts' },
    { value: 'GOLD', label: 'Gold', icon: Gem, description: 'Physical gold, jewelry, ETFs' },
    { value: 'PROPERTY', label: 'Property', icon: Home, description: 'Real estate, land, buildings' },
    { value: 'VEHICLES', label: 'Vehicles', icon: Car, description: 'Cars, bikes, other vehicles' },
    { value: 'INVESTMENTS', label: 'Investments', icon: TrendingUp, description: 'Stocks, mutual funds, crypto' },
  ],
  LIABILITY: [
    { value: 'CREDIT_CARD', label: 'Credit Card', icon: Wallet },
    { value: 'PERSONAL_LOAN', label: 'Personal Loan', icon: Briefcase },
    { value: 'OTHER', label: 'Other', icon: Target },
  ],
  DEBT: [
    { value: 'HOME_LOAN', label: 'Home Loan', icon: Home },
    { value: 'CAR_LOAN', label: 'Car Loan', icon: Car },
    { value: 'EDUCATION_LOAN', label: 'Education Loan', icon: Landmark },
    { value: 'OTHER', label: 'Other', icon: Target },
  ],
};

// Investment sub-categories (when category = INVESTMENTS)
const investmentSubCategories = [
  { value: 'STOCKS', label: 'Stocks', icon: TrendingUp },
  { value: 'MUTUAL_FUNDS', label: 'Mutual Funds', icon: PiggyBank },
  { value: 'CRYPTO', label: 'Crypto', icon: Coins },
  { value: 'TRADING', label: 'Trading', icon: TrendingUp },
  { value: 'RENTAL_PROPERTY', label: 'Rental Property', icon: Home },
  { value: 'OTHER', label: 'Other', icon: Target },
];

export default function AddAssetModal({ assetType, onClose, onSave, editingAsset }) {
  const defaultCategory = assetCategories[assetType]?.[0]?.value || 'OTHER';
  const TRANSACTION_CATEGORIES = ['BANK', 'CREDIT_CARD'];
  const [form, setForm] = useState({
    name: '',
    value: '',
    type: assetType,
    category: defaultCategory,
    subCategory: assetType === 'ASSET' && defaultCategory === 'INVESTMENTS' ? 'STOCKS' : null,
    date: new Date().toISOString().split('T')[0],
    description: '',
    hasTransactions: TRANSACTION_CATEGORIES.includes(defaultCategory),
    creditLimit: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  // Populate form when editing
  useEffect(() => {
    if (editingAsset) {
      setForm({
        name: editingAsset.name || '',
        value: editingAsset.value?.toString() || '',
        type: editingAsset.type, // Keep original type, don't change
        category: editingAsset.category || defaultCategory,
        subCategory: editingAsset.subCategory || null,
        date: editingAsset.date || new Date().toISOString().split('T')[0],
        description: editingAsset.description || '',
        hasTransactions: editingAsset.hasTransactions || false,
        creditLimit: editingAsset.creditLimit?.toString() || '',
      });
      setSelectedCategory(editingAsset.category || defaultCategory);
    }
  }, [editingAsset, defaultCategory]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setForm(prev => ({
      ...prev,
      category,
      subCategory: category === 'INVESTMENTS' ? 'STOCKS' : null,
      hasTransactions: TRANSACTION_CATEGORIES.includes(category) ? true : prev.hasTransactions,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      value: parseFloat(form.value),
      // Only include subCategory if it's an Investment
      subCategory: form.category === 'INVESTMENTS' ? form.subCategory : null,
      // Only include creditLimit if it's a CREDIT_CARD
      creditLimit: form.category === 'CREDIT_CARD' && form.creditLimit ? parseFloat(form.creditLimit) : null,
      // Include id when editing so backend knows to update
      ...(editingAsset && { id: editingAsset.id })
    };
    await onSave(payload);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition">
          <X size={22} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 text-center">
          {editingAsset ? 'Update' : 'Add'} {assetType.charAt(0) + assetType.slice(1).toLowerCase()}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Name</label>
            <input
              required
              type="text"
              placeholder="e.g. SBI Savings Account"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Value (₹)</label>
            <input
              required
              type="number"
              min="1"
              placeholder="0"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {(assetCategories[assetType] || []).map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-blue-500' : 'text-gray-500'} />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Investment Sub-Category (Only shown when category is INVESTMENTS) */}
          {selectedCategory === 'INVESTMENTS' && (
            <div className="animate-fadeIn">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">
                Investment Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {investmentSubCategories.map((sub) => {
                  const Icon = sub.icon;
                  const isSelected = form.subCategory === sub.value;
                  return (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => setForm({ ...form, subCategory: sub.value })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={16} className={isSelected ? 'text-purple-500' : 'text-gray-500'} />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Credit Limit - Only for CREDIT_CARD */}
          {selectedCategory === 'CREDIT_CARD' && (
            <div className="animate-fadeIn">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">
                Credit Limit (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="50000"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 pl-10 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-600 text-sm dark:text-white"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Maximum spending limit for this credit card
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm dark:text-white"
            />
          </div>

          {/* Has Transactions Toggle */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
              form.hasTransactions
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
            }`}
            onClick={() => setForm({ ...form, hasTransactions: !form.hasTransactions })}
          >
            <div className={`w-10 h-6 rounded-full relative transition-colors ${
              form.hasTransactions ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.hasTransactions ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </div>
            <div className="flex items-center gap-2">
              <Receipt size={16} className={form.hasTransactions ? 'text-blue-600' : 'text-gray-400'} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Track Transactions
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {form.hasTransactions ? 'Transactions button enabled' : 'Enable to view linked transactions'}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-semibold border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition dark:text-white">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-700 text-sm transition disabled:opacity-60">
              {loading ? 'Saving...' : (editingAsset ? 'Update' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
