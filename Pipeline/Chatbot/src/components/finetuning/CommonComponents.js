import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheck, 
  faTimes, 
  faClock, 
  faPlay,
  faSpinner,
  faTrash,
  faExclamationTriangle,
  faServer,
  faDatabase,
  faHdd
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../contexts/ThemeContext';

export const JobStatusBadge = ({ status, showIcon = true }) => {
  const { colors } = useTheme();
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'failed': return colors.error;
      case 'running': return colors.info;
      case 'pending': return colors.warning;
      default: return colors.textMuted;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return faPlay;
      case 'completed': return faCheck;
      case 'failed': return faTimes;
      default: return faClock;
    }
  };

  return (
    <div className="flex items-center gap-2" style={{ color: getStatusColor(status) }}>
      {showIcon && <FontAwesomeIcon icon={getStatusIcon(status)} className="w-4 h-4" />}
      <span className="text-sm capitalize">{status}</span>
    </div>
  );
};

export const ServerHealthIndicator = ({ health }) => {
  const { colors } = useTheme();
  
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: health?.success ? colors.success : colors.error }}
      ></div>
      <span className="text-sm" style={{ color: colors.textSecondary }}>
        Server: {health?.server_status || 'Unknown'}
      </span>
    </div>
  );
};

export const LoadingSpinner = ({ size = 'w-4 h-4', className = '' }) => {
  const { colors } = useTheme();
  
  return (
    <FontAwesomeIcon 
      icon={faSpinner} 
      className={`${size} animate-spin ${className}`}
      style={{ color: colors.accent }}
    />
  );
};

export const DeleteButton = ({ onClick, disabled = false }) => {
  const { colors } = useTheme();
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1 transition-colors disabled:cursor-not-allowed"
      style={{
        color: disabled ? colors.textMuted : colors.error
      }}
      onMouseEnter={(e) => !disabled && (e.target.style.color = colors.errorHover || colors.error)}
      onMouseLeave={(e) => !disabled && (e.target.style.color = colors.error)}
    >
      <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
    </button>
  );
};

export const FormField = ({ 
  label, 
  required = false, 
  children, 
  description = null 
}) => {
  const { colors } = useTheme();
  
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
        {label} {required && <span style={{ color: colors.error }}>*</span>}
      </label>
      {children}
      {description && (
        <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{description}</p>
      )}
    </div>
  );
};

export const Card = ({ title, children, className = '' }) => {
  const { colors } = useTheme();
  
  return (
    <div 
      className={`rounded-lg p-6 ${className}`}
      style={{ backgroundColor: colors.secondary }}
    >
      {title && (
        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  children, 
  className = '',
  ...props 
}) => {
  const { colors } = useTheme();
  const baseClasses = "font-medium transition-colors duration-200 flex items-center gap-2";
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.accent,
          color: 'white',
          hoverColor: colors.accentHover || colors.accent
        };
      case 'secondary':
        return {
          backgroundColor: colors.tertiary,
          color: colors.textPrimary,
          hoverColor: colors.quaternary || colors.tertiary
        };
      case 'danger':
        return {
          backgroundColor: colors.error,
          color: 'white',
          hoverColor: colors.errorHover || colors.error
        };
      default:
        return {
          backgroundColor: colors.accent,
          color: 'white',
          hoverColor: colors.accentHover || colors.accent
        };
    }
  };

  const sizes = {
    xs: "px-2 py-1 text-xs rounded",
    sm: "px-3 py-1 text-sm rounded",
    md: "px-6 py-2 text-sm rounded",
    lg: "px-8 py-3 text-lg rounded-xl"
  };

  const variantStyles = getVariantStyles();
  const isDisabled = disabled || loading;

  const buttonStyle = {
    backgroundColor: isDisabled ? colors.textMuted : variantStyles.backgroundColor,
    color: isDisabled ? colors.textSecondary : variantStyles.color,
    cursor: isDisabled ? 'not-allowed' : 'pointer'
  };

  return (
    <button 
      className={`${baseClasses} ${sizes[size]} ${className}`}
      style={buttonStyle}
      disabled={isDisabled}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.target.style.backgroundColor = variantStyles.hoverColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.target.style.backgroundColor = variantStyles.backgroundColor;
        }
      }}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
};

export const EnhancedServerHealthIndicator = ({ health, className = '' }) => {
  const { colors } = useTheme();
  
  if (!health) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <FontAwesomeIcon 
          icon={faSpinner} 
          className="w-4 h-4 animate-spin" 
          style={{ color: colors.textMuted }} 
        />
        <span className="text-sm" style={{ color: colors.textMuted }}>Checking server...</span>
      </div>
    );
  }

  const isHealthy = health.status === 'healthy';
  const isDegraded = health.status === 'degraded';
  const isUnhealthy = health.status === 'unhealthy';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isHealthy && (
        <>
          <FontAwesomeIcon 
            icon={faCheck} 
            className="w-4 h-4" 
            style={{ color: colors.success }} 
          />
          <span className="text-sm" style={{ color: colors.success }}>Server Online</span>
        </>
      )}
      
      {isDegraded && (
        <>
          <FontAwesomeIcon 
            icon={faExclamationTriangle} 
            className="w-4 h-4" 
            style={{ color: colors.warning }} 
          />
          <span className="text-sm" style={{ color: colors.warning }}>Performance Issues</span>
        </>
      )}
      
      {isUnhealthy && (
        <>
          <FontAwesomeIcon 
            icon={faTimes} 
            className="w-4 h-4" 
            style={{ color: colors.error }} 
          />
          <span className="text-sm" style={{ color: colors.error }}>Server Offline</span>
        </>
      )}
      
      {/* Detailed health tooltip */}
      <div className="relative group">
        <FontAwesomeIcon 
          icon={faServer} 
          className="w-4 h-4 cursor-help" 
          style={{ color: colors.textMuted }} 
        />
        
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
          <div 
            className="text-xs rounded py-2 px-3 whitespace-nowrap"
            style={{ 
              backgroundColor: colors.secondary, 
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faDatabase} className="w-3 h-3" />
              <span>Database: {health.database || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faHdd} className="w-3 h-3" />
              <span>Storage: {health.storage || 'Unknown'}</span>
            </div>
            {health.active_jobs !== undefined && (
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                Active Jobs: {health.active_jobs}
              </div>
            )}
            {health.timestamp && (
              <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                Updated: {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            )}
            {health.error && (
              <div className="text-xs mt-1" style={{ color: colors.error }}>
                Error: {health.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConnectionStatusBanner = ({ connectionError, onRetry, className = '' }) => {
  const { colors } = useTheme();
  
  if (!connectionError) return null;

  return (
    <div 
      className={`border px-4 py-3 rounded mb-4 ${className}`}
      style={{
        backgroundColor: `${colors.error}20`,
        borderColor: colors.error,
        color: colors.error
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
          <span className="text-sm">
            Cannot connect to fine-tuning server. Please check your connection.
          </span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm px-3 py-1 rounded transition-colors"
            style={{
              backgroundColor: colors.error,
              color: 'white'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors.errorHover || colors.error}
            onMouseLeave={(e) => e.target.style.backgroundColor = colors.error}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export const ErrorDisplay = ({ error, onDismiss, className = '' }) => {
  const { colors } = useTheme();
  
  if (!error) return null;

  const getErrorIcon = (type) => {
    switch (type) {
      case 'network':
        return faServer;
      case 'permission':
        return faExclamationTriangle;
      case 'not_found':
        return faExclamationTriangle;
      default:
        return faTimes;
    }
  };

  const getErrorColor = (type) => {
    switch (type) {
      case 'network':
        return colors.error;
      case 'permission':
        return colors.warning;
      case 'not_found':
        return colors.warning;
      default:
        return colors.error;
    }
  };

  const getBgStyle = (type) => {
    const color = getErrorColor(type);
    return {
      backgroundColor: `${color}20`,
      borderColor: color
    };
  };

  return (
    <div 
      className={`border rounded-lg p-4 ${className}`}
      style={getBgStyle(error.type)}
    >
      <div className="flex items-start gap-3">
        <FontAwesomeIcon 
          icon={getErrorIcon(error.type)} 
          className="w-5 h-5 mt-0.5"
          style={{ color: getErrorColor(error.type) }}
        />
        
        <div className="flex-1">
          <h4 
            className="font-medium"
            style={{ color: getErrorColor(error.type) }}
          >
            Error{error.context && ` in ${error.context}`}
          </h4>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {error.message}
          </p>
          
          {error.details && process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer" style={{ color: colors.textMuted }}>
                Show details
              </summary>
              <pre className="text-xs mt-1 whitespace-pre-wrap" style={{ color: colors.textMuted }}>
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-sm p-1 rounded hover:bg-black/10 transition-colors"
            style={{ color: getErrorColor(error.type) }}
          >
            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export const StatisticsCard = ({ title, value, subtitle, icon, color = 'blue', className = '', style = {} }) => {
  const { colors } = useTheme();
  
  const getColorStyles = (color) => {
    switch (color) {
      case 'blue':
        return { color: colors.info, backgroundColor: `${colors.info}20` };
      case 'green':
        return { color: colors.success, backgroundColor: `${colors.success}20` };
      case 'yellow':
        return { color: colors.warning, backgroundColor: `${colors.warning}20` };
      case 'red':
        return { color: colors.error, backgroundColor: `${colors.error}20` };
      case 'purple':
        return { color: colors.accent, backgroundColor: `${colors.accent}20` };
      default:
        return { color: colors.info, backgroundColor: `${colors.info}20` };
    }
  };

  const colorStyles = getColorStyles(color);

  return (
    <div 
      className={`rounded-lg border p-4 ${className}`}
      style={{ 
        backgroundColor: colors.secondary, 
        borderColor: colors.border,
        ...style 
      }}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div 
            className="p-2 rounded-lg"
            style={colorStyles}
          >
            <FontAwesomeIcon icon={icon} className="w-5 h-5" />
          </div>
        )}
        
        <div className="flex-1">
          <p className="text-sm" style={{ color: colors.textSecondary }}>{title}</p>
          <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>{value}</p>
          {subtitle && (
            <p className="text-xs" style={{ color: colors.textMuted }}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProgressBar = ({ 
  progress, 
  showPercentage = true, 
  color = 'blue', 
  size = 'md',
  className = '' 
}) => {
  const { theme } = useTheme();
  
  const colorVariants = {
    blue: theme.colors.accent,
    green: '#10b981', // Success green
    yellow: '#f59e0b', // Warning yellow
    red: '#ef4444' // Error red
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const safeProgress = Math.max(0, Math.min(100, progress || 0));

  return (
    <div className={className}>
      <div 
        className={`w-full rounded-full ${sizeClasses[size]}`}
        style={{ backgroundColor: theme.colors.secondary }}
      >
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ 
            width: `${safeProgress}%`,
            backgroundColor: colorVariants[color]
          }}
        ></div>
      </div>
      {showPercentage && (
        <div className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
          {Math.round(safeProgress)}%
        </div>
      )}
    </div>
  );
};
