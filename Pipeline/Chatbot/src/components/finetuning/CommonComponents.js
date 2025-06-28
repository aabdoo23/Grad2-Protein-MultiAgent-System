import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheck, 
  faTimes, 
  faClock, 
  faPlay,
  faSpinner,
  faTrash
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
