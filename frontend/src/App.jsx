import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import Transactions from './pages/Transactions';
import Trading from './pages/Trading';
import Investments from './pages/Investments';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

function MainLayout() {
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

  const views = {
    Dashboard: (onNavigate) => <Dashboard onNavigate={onNavigate} />,
    Insights: () => <Insights />,
    Transactions: () => <Transactions />,
    Trading: () => <Trading />,
    Investments: () => <Investments />,
    Analytics: () => <Analytics />,
    Settings: () => <Settings />,
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      <Sidebar activeView={activeView} onNavigate={setActiveView} darkMode={darkMode} setDarkMode={setDarkMode} />
      {views[activeView](setActiveView)}
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
      
      {/* Protected Routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
