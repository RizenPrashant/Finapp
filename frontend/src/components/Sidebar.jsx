import { LayoutGrid, TrendingUp, Wallet, BarChart3, CandlestickChart, Settings, Moon, Sun } from 'lucide-react';

const navItems = [
  { icon: LayoutGrid, label: 'Dashboard' },
  { icon: TrendingUp, label: 'Insights' },
  { icon: Wallet, label: 'Transactions' },
  { icon: CandlestickChart, label: 'Trading' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: Settings, label: 'Settings' },
];

export default function Sidebar({ activeView, onNavigate, darkMode, setDarkMode }) {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
      <div className="h-[70px] flex items-center px-6 text-xl font-bold border-b border-gray-100 dark:border-gray-700 text-slate-800 dark:text-slate-200">Finance Tracker</div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => onNavigate(label)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
              activeView === label
                ? 'bg-slate-900 text-white shadow-lg'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-600" />}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>
    </aside>
  );
}
