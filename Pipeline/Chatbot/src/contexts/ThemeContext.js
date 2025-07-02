import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Centralized theme configuration
export const themes = {
  dark: {
    name: 'dark',
    colors: {
      // Background colors
      primary: '#111c22',
      secondary: '#233c48',
      tertiary: '#2a4653',
      
      // Text colors
      textPrimary: '#ffffff',
      textSecondary: '#92b7c9',
      textMuted: '#6b7280',
      
      // Accent colors
      accent: '#13a4ec',
      accentHover: '#0f8fd1',
      
      // Border colors
      border: '#233c48',
      borderLight: 'rgba(255, 255, 255, 0.1)',
      
      // Status colors
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      // Scrollbar colors
      scrollbarTrack: 'rgba(255, 255, 255, 0.05)',
      scrollbarThumb: 'rgba(255, 255, 255, 0.2)',
      scrollbarThumbHover: 'rgba(255, 255, 255, 0.3)',
    }
  },
  light: {
    name: 'light',
    colors: {
      // Background colors
      primary: '#E6EEF2',
      secondary: '#DBE5EB',
      tertiary: '#CFD9DE',
      
      // Text colors
      textPrimary: '#1f2937',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      
      // Accent colors
      accent: '#13a4ec',
      accentHover: '#0f8fd1',
      
      // Border colors
      border: '#e5e7eb',
      borderLight: 'rgba(0, 0, 0, 0.1)',
      
      // Status colors
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      // Scrollbar colors
      scrollbarTrack: 'rgba(0, 0, 0, 0.05)',
      scrollbarThumb: 'rgba(0, 0, 0, 0.2)',
      scrollbarThumbHover: 'rgba(0, 0, 0, 0.3)',
    }
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Get theme from localStorage or default to dark
    const saved = localStorage.getItem('theme');
    return saved ? saved : 'dark';
  });

  const theme = themes[currentTheme];

  const toggleTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Apply CSS custom properties to the document root
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [theme]);

  const value = {
    theme: currentTheme,
    colors: theme.colors,
    toggleTheme,
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
