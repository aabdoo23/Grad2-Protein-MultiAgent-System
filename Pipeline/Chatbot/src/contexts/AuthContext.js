import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Check if user is authenticated on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUser(result.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('Logout successful');
      } else {
        console.warn('Logout request failed, but clearing local state anyway');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Always clear user state regardless of API response
      setUser(null);
      // Force a re-check of authentication status
      setTimeout(() => {
        checkAuth();
      }, 100);
    }
  };

  const updateUserCredits = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/credits`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUser(prev => ({
            ...prev,
            credits: result.credits
          }));
        }
      }
    } catch (error) {
      console.error('Failed to update credits:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUserCredits,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
