import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

const views = {
  Dashboard: (onNavigate) => <Dashboard onNavigate={onNavigate} />,
  Insights: () => <Insights />,
  Transactions: () => <Transactions />,
  Analytics: () => <Analytics />,
  Settings: () => <Settings />,
};

export default function App() {
  const [activeView, setActiveView] = useState('Dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      <Sidebar activeView={activeView} onNavigate={setActiveView} darkMode={darkMode} setDarkMode={setDarkMode} />
      {views[activeView](setActiveView)}
    </div>
  );
}
