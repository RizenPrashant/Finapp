import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import UserProfileModal from './components/UserProfileModal';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import Transactions from './pages/Transactions';
import Trading from './pages/Trading';
import Assets from './pages/Assets';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import { updateProfile } from './api';

function MainLayout() {
  const [activeView, setActiveView] = useState('Dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user, updateUser } = useAuth();

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleProfileSave = async (profileData) => {
    try {
      const response = await updateProfile(profileData);
      updateUser(response.data);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const views = {
    Dashboard: (onNavigate, onProfileClick) => <Dashboard onNavigate={onNavigate} onProfileClick={onProfileClick} />,
    Insights: (onNavigate, onProfileClick) => <Insights onNavigate={onNavigate} onProfileClick={onProfileClick} />,
    Transactions: (onNavigate, onProfileClick) => <Transactions onProfileClick={onProfileClick} />,
    Trading: (onNavigate, onProfileClick) => <Trading onProfileClick={onProfileClick} />,
    Assets: (onNavigate, onProfileClick) => <Assets onProfileClick={onProfileClick} />,
    Analytics: (onNavigate, onProfileClick) => <Analytics onProfileClick={onProfileClick} />,
    Settings: (onNavigate, onProfileClick) => <Settings onProfileClick={onProfileClick} />,
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      <Sidebar activeView={activeView} onNavigate={setActiveView} darkMode={darkMode} setDarkMode={setDarkMode} />
      {views[activeView](setActiveView, () => setShowProfileModal(true))}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onSave={handleProfileSave}
      />
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
