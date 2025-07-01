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

export const JobStatusBadge = ({ status, showIcon = true }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-blue-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
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
    <div className={`flex items-center gap-2 ${getStatusColor(status)}`}>
      {showIcon && <FontAwesomeIcon icon={getStatusIcon(status)} className="w-4 h-4" />}
      <span className="text-sm capitalize">{status}</span>
    </div>
  );
};

export const ServerHealthIndicator = ({ health }) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        health?.success ? 'bg-green-400' : 'bg-red-400'
      }`}></div>
      <span className="text-sm text-gray-300">
        Server: {health?.server_status || 'Unknown'}
      </span>
    </div>
  );
};

export const LoadingSpinner = ({ size = 'w-4 h-4', className = '' }) => {
  return (
    <FontAwesomeIcon 
      icon={faSpinner} 
      className={`${size} animate-spin ${className}`} 
    />
  );
};

export const DeleteButton = ({ onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed p-1 transition-colors"
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
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}
    </div>
  );
};

export const Card = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-[#1a2d35] rounded-lg p-6 ${className}`}>
      {title && (
        <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
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
  const baseClasses = "font-medium transition-colors duration-200 flex items-center gap-2";
  
  const variants = {
    primary: "bg-[#13a4ec] hover:bg-[#0f8fd1] text-white",
    secondary: "bg-[#233c48] hover:bg-[#2a4653] text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white"
  };

  const sizes = {
    xs: "px-2 py-1 text-xs rounded",
    sm: "px-3 py-1 text-sm rounded",
    md: "px-6 py-2 text-sm rounded",
    lg: "px-8 py-3 text-lg rounded-xl"
  };

  const disabledClasses = "bg-gray-600 cursor-not-allowed text-gray-300";

  const classes = `
    ${baseClasses} 
    ${disabled ? disabledClasses : variants[variant]} 
    ${sizes[size]} 
    ${className}
  `.trim();

  return (
    <button 
      className={classes} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
};

export const EnhancedServerHealthIndicator = ({ health, className = '' }) => {
  if (!health) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-400">Checking server...</span>
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
          <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-500">Server Online</span>
        </>
      )}
      
      {isDegraded && (
        <>
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-yellow-500">Server Degraded</span>
        </>
      )}
      
      {isUnhealthy && (
        <>
          <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-500">Server Offline</span>
        </>
      )}
      
      {/* Detailed health tooltip */}
      <div className="relative group">
        <FontAwesomeIcon icon={faServer} className="w-4 h-4 text-gray-400 cursor-help" />
        
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faDatabase} className="w-3 h-3" />
              <span>Database: {health.database || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faHdd} className="w-3 h-3" />
              <span>Storage: {health.storage || 'Unknown'}</span>
            </div>
            {health.active_jobs !== undefined && (
              <div className="text-xs text-gray-300">
                Active Jobs: {health.active_jobs}
              </div>
            )}
            {health.timestamp && (
              <div className="text-xs text-gray-300 mt-1">
                Updated: {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            )}
            {health.error && (
              <div className="text-xs text-red-300 mt-1">
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
  if (!connectionError) return null;

  return (
    <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 ${className}`}>
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
            className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export const ErrorDisplay = ({ error, onDismiss, className = '' }) => {
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
        return 'text-red-600';
      case 'permission':
        return 'text-yellow-600';
      case 'not_found':
        return 'text-orange-600';
      default:
        return 'text-red-600';
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'network':
        return 'bg-red-50 border-red-200';
      case 'permission':
        return 'bg-yellow-50 border-yellow-200';
      case 'not_found':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getBgColor(error.type)} ${className}`}>
      <div className="flex items-start gap-3">
        <FontAwesomeIcon 
          icon={getErrorIcon(error.type)} 
          className={`w-5 h-5 mt-0.5 ${getErrorColor(error.type)}`} 
        />
        
        <div className="flex-1">
          <h4 className={`font-medium ${getErrorColor(error.type)}`}>
            Error{error.context && ` in ${error.context}`}
          </h4>
          <p className="text-sm text-gray-700 mt-1">
            {error.message}
          </p>
          
          {error.details && process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">
                Show details
              </summary>
              <pre className="text-xs text-gray-600 mt-1 bg-white p-2 rounded border overflow-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export const StatisticsCard = ({ title, value, subtitle, icon, color = 'blue', className = '' }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
    purple: 'text-purple-600 bg-purple-100'
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <FontAwesomeIcon icon={icon} className="w-5 h-5" />
          </div>
        )}
        
        <div className="flex-1">
          <p className="text-sm text-gray-100">{title}</p>
          <p className="text-2xl font-bold text-gray-300">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-200">{subtitle}</p>
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
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const safeProgress = Math.max(0, Math.min(100, progress || 0));

  return (
    <div className={className}>
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${safeProgress}%` }}
        ></div>
      </div>
      {showPercentage && (
        <div className="text-sm text-gray-600 mt-1">
          {Math.round(safeProgress)}%
        </div>
      )}
    </div>
  );
};
