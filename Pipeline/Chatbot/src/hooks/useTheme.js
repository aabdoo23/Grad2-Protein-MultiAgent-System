import { useTheme } from '../contexts/ThemeContext';

// Hook for getting theme-aware styles
export const useThemeStyles = () => {
  const { colors, isDark } = useTheme();

  return {
    // Background styles
    primaryBg: { backgroundColor: colors.primary },
    secondaryBg: { backgroundColor: colors.secondary },
    tertiaryBg: { backgroundColor: colors.tertiary },
    
    // Text styles
    primaryText: { color: colors.textPrimary },
    secondaryText: { color: colors.textSecondary },
    mutedText: { color: colors.textMuted },
    
    // Border styles
    border: { borderColor: colors.border },
    borderLight: { borderColor: colors.borderLight },
    
    // Button styles
    accentButton: {
      backgroundColor: colors.accent,
      color: 'white',
      '&:hover': { backgroundColor: colors.accentHover }
    },
    secondaryButton: {
      backgroundColor: colors.secondary,
      color: colors.textPrimary,
      '&:hover': { backgroundColor: colors.tertiary }
    },
    
    // Status styles
    success: { color: colors.success },
    warning: { color: colors.warning },
    error: { color: colors.error },
    info: { color: colors.info },
    
    // Utility styles
    isDark,
    colors
  };
};

// Component for theme-aware containers
export const ThemedContainer = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  style = {},
  ...props 
}) => {
  const { colors } = useTheme();
  
  const variants = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    tertiary: { backgroundColor: colors.tertiary }
  };

  return (
    <div 
      className={className}
      style={{
        ...variants[variant],
        color: colors.textPrimary,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Component for theme-aware buttons
export const ThemedButton = ({ 
  children, 
  variant = 'secondary', 
  className = '', 
  style = {},
  ...props 
}) => {
  const { colors } = useTheme();
  
  const variants = {
    primary: {
      backgroundColor: colors.accent,
      color: 'white',
      '&:hover': { backgroundColor: colors.accentHover }
    },
    secondary: {
      backgroundColor: colors.secondary,
      color: colors.textPrimary,
      '&:hover': { backgroundColor: colors.tertiary }
    },
    danger: {
      backgroundColor: colors.error,
      color: 'white'
    }
  };

  const baseStyle = variants[variant];

  return (
    <button 
      className={className}
      style={{
        ...baseStyle,
        transition: 'all 0.2s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        if (variant === 'primary') {
          e.target.style.backgroundColor = colors.accentHover;
        } else if (variant === 'secondary') {
          e.target.style.backgroundColor = colors.tertiary;
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = baseStyle.backgroundColor;
      }}
      {...props}
    >
      {children}
    </button>
  );
};
