import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = 'http://localhost:2002/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          // Try to fetch dashboard to verify token
          const response = await axios.get(`${API_URL}/dashboard/summary`);
          // Token is valid
        } catch (error) {
          // Token is invalid
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    return response.data;
  }, []);

  const register = useCallback(async (userData) => {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    
    const { token: newToken, user: newUser } = response.data;
    
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    return response.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
