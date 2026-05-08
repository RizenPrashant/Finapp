import { useState, useEffect, useRef } from 'react';
import { Search, Bell, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function getAlerts(budgets, budgetSpent) {
  return budgets
    .map((b) => {
      const limit = parseFloat(b.limitAmount) || 0;
      const spent = parseFloat(budgetSpent[b.category]) || 0;
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      return { ...b, spent, percent };
    })
    .filter((b) => b.percent >= 80)
    .sort((a, b) => b.percent - a.percent);
}

export default function Header({ title, subtitle, budgets = [], budgetSpent = {} }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const ref = useRef(null);

  const alerts = getAlerts(budgets, budgetSpent);
  const criticalCount = alerts.filter((a) => a.percent >= 100).length;
  const badgeCount = alerts.length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowNotifications(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100 sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search transactions..."
            className="pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-slate-300 w-60"
          />
        </div>

        {/* Bell Button */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="p-2 bg-gray-100 rounded-xl relative hover:bg-gray-200 transition"
          >
            <Bell size={18} />
            {badgeCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center ${criticalCount > 0 ? 'bg-red-500' : 'bg-yellow-500'}`}>
                {badgeCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <p className="font-bold text-slate-800">Budget Alerts</p>
                <span className="text-xs text-gray-400">{alerts.length} alerts</span>
              </div>

              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <CheckCircle size={32} className="text-green-500" />
                  <p className="text-sm font-medium text-gray-500">All budgets are on track!</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {alerts.map((a) => {
                    const isExceeded = a.percent >= 100;
                    const isWarning = a.percent >= 80 && a.percent < 100;
                    return (
                      <div key={a.id} className={`px-5 py-4 ${isExceeded ? 'bg-red-50' : 'bg-yellow-50'}`}>
                        <div className="flex items-start gap-3">
                          {isExceeded
                            ? <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                            : <AlertTriangle size={18} className="text-yellow-500 mt-0.5 shrink-0" />
                          }
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">{a.category}</p>
                            <p className={`text-xs mt-0.5 ${isExceeded ? 'text-red-500' : 'text-yellow-600'}`}>
                              {isExceeded
                                ? `Exceeded by ₹${(a.spent - parseFloat(a.limitAmount)).toLocaleString('en-IN')}`
                                : `${a.percent.toFixed(0)}% used — ₹${(parseFloat(a.limitAmount) - a.spent).toLocaleString('en-IN')} remaining`
                              }
                            </p>
                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                              <div
                                className={`h-1.5 rounded-full ${isExceeded ? 'bg-red-500' : 'bg-yellow-500'}`}
                                style={{ width: `${Math.min(a.percent, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-xs font-bold ${isExceeded ? 'text-red-500' : 'text-yellow-600'}`}>
                            {a.percent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
                <p className="text-xs text-gray-400 text-center">Based on current month DEBIT transactions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
