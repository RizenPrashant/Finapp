import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AddTradeModal({ onClose, onSubmit, initialData }) {
  const [formData, setFormData] = useState({
    stockName: '',
    segment: 'EQUITY',
    tradeType: 'SWING',
    positionType: 'LONG',
    quantity: '',
    buyPrice: '',
    sellPrice: '',
    brokerage: '20',
    status: 'OPEN',
    entryDate: new Date().toISOString().split('T')[0],
    exitDate: '',
    notes: '',
    broker: 'ZERODHA'
  });

  const [brokers, setBrokers] = useState(['ZERODHA', 'UPSTOX', 'ANGELONE', 'COINBASE']);
  const [newBroker, setNewBroker] = useState('');
  const [showAddBroker, setShowAddBroker] = useState(false);

  const segments = ['EQUITY', 'INTRADAY', 'SWING', 'FNO', 'CRYPTO', 'MUTUAL_FUND', 'LONG_TERM'];
  const tradeTypes = ['SWING', 'INTRADAY', 'LONG_TERM', 'SCALPING'];
  const positionTypes = ['LONG', 'SHORT'];
  const statuses = ['OPEN', 'CLOSED'];

  // Load custom brokers from localStorage on mount
  useEffect(() => {
    const customBrokers = JSON.parse(localStorage.getItem('finapp_custom_brokers') || '[]').filter(b => b && b.trim() !== '');
    if (customBrokers.length > 0) {
      setBrokers(prev => [...new Set([...prev, ...customBrokers])]);
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        stockName: initialData.stockName || '',
        segment: initialData.segment || 'EQUITY',
        tradeType: initialData.tradeType || 'SWING',
        positionType: initialData.positionType || 'LONG',
        quantity: initialData.quantity || '',
        buyPrice: initialData.buyPrice || '',
        sellPrice: initialData.sellPrice || '',
        brokerage: initialData.brokerage || '20',
        status: initialData.status || 'OPEN',
        entryDate: initialData.entryDate || new Date().toISOString().split('T')[0],
        exitDate: initialData.exitDate || '',
        notes: initialData.notes || '',
        broker: initialData.broker || 'ZERODHA'
      });
    }
  }, [initialData]);

  const handleAddBroker = () => {
    if (newBroker.trim() && !brokers.includes(newBroker.trim().toUpperCase())) {
      const upperBroker = newBroker.trim().toUpperCase();
      const updatedBrokers = [...brokers, upperBroker];
      setBrokers(updatedBrokers);
      setFormData({ ...formData, broker: upperBroker });
      setNewBroker('');
      setShowAddBroker(false);

      // Save to localStorage, filter out empty strings
      const defaultBrokers = ['ZERODHA', 'UPSTOX', 'ANGELONE', 'COINBASE'];
      const customBrokers = updatedBrokers.filter(b => b && b.trim() !== '' && !defaultBrokers.includes(b));
      localStorage.setItem('finapp_custom_brokers', JSON.stringify(customBrokers));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const quantity = parseInt(formData.quantity);
    const buyPrice = parseFloat(formData.buyPrice);
    const sellPrice = formData.sellPrice ? parseFloat(formData.sellPrice) : null;
    const brokerage = parseFloat(formData.brokerage);
    
    const investedAmount = buyPrice * quantity;
    let returnAmount = null;
    let profitLoss = null;
    let profitLossPercentage = null;
    
    if (formData.status === 'CLOSED' && sellPrice) {
      returnAmount = sellPrice * quantity;
      profitLoss = returnAmount - investedAmount - brokerage;
      profitLossPercentage = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;
    }

    onSubmit({
      ...formData,
      quantity,
      buyPrice,
      sellPrice,
      brokerage,
      investedAmount,
      returnAmount,
      profitLoss,
      profitLossPercentage
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {initialData ? 'Edit Trade' : 'Add Trade'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stock Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock Name *
            </label>
            <input
              type="text"
              required
              value={formData.stockName}
              onChange={(e) => setFormData({ ...formData, stockName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., HFCL, RELIANCE, TCS"
            />
          </div>

          {/* Segment & Trade Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Segment *
              </label>
              <select
                required
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {segments.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trade Type *
              </label>
              <select
                required
                value={formData.tradeType}
                onChange={(e) => setFormData({ ...formData, tradeType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {tradeTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Position Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Position *
              </label>
              <select
                required
                value={formData.positionType}
                onChange={(e) => setFormData({ ...formData, positionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {positionTypes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Broker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Broker *
            </label>
            <div className="flex gap-2">
              <select
                required
                value={formData.broker}
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {brokers.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowAddBroker(!showAddBroker)}
                className="px-3 py-2 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                + New
              </button>
            </div>
            {showAddBroker && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newBroker}
                  onChange={(e) => setNewBroker(e.target.value)}
                  placeholder="Enter broker name"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddBroker}
                  className="px-3 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors text-sm"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Quantity & Buy Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Buy Price (₹) *
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.buyPrice}
                onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="85.50"
              />
            </div>
          </div>

          {/* Sell Price (only for closed trades) */}
          {formData.status === 'CLOSED' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sell Price (₹) *
                </label>
                <input
                  type="number"
                  required={formData.status === 'CLOSED'}
                  min="0.01"
                  step="0.01"
                  value={formData.sellPrice}
                  onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="96.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brokerage (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.brokerage}
                  onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="20"
                />
              </div>
            </div>
          )}

          {/* Brokerage for open trades */}
          {formData.status === 'OPEN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Brokerage (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.brokerage}
                onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="20"
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entry Date *
              </label>
              <input
                type="date"
                required
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            {formData.status === 'CLOSED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exit Date *
                </label>
                <input
                  type="date"
                  required={formData.status === 'CLOSED'}
                  value={formData.exitDate}
                  onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Breakout trade, support bounce..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800"
            >
              {initialData ? 'Update Trade' : 'Add Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
