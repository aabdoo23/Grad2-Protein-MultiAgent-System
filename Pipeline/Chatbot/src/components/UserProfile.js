import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faSignOutAlt, 
  faCoins, 
  faChevronDown,
  faCog
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: 'var(--color-secondary)',
          color: 'var(--color-textPrimary)'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-tertiary)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-secondary)'}
      >
        <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
        <span className="hidden sm:block">{user.user_name}</span>
        <div className="flex items-center gap-1 text-yellow-400">
          <FontAwesomeIcon icon={faCoins} className="w-3 h-3" />
          <span className="text-sm">{user.credits || 0}</span>
        </div>
        <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />
      </button>

      {showDropdown && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 border rounded-lg shadow-xl z-20" style={{
            backgroundColor: 'var(--color-secondary)',
            borderColor: 'var(--color-border)'
          }}>
            <div className="p-4 border-b" style={{ borderBottomColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                  backgroundColor: 'var(--color-accent)'
                }}>
                  <FontAwesomeIcon icon={faUser} className="text-white w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-textPrimary)' }}>{user.full_name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{user.email}</p>
                  {user.institution && (
                    <p className="text-xs" style={{ color: 'var(--color-textMuted)' }}>{user.institution}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Credits:</span>
                <div className="flex items-center gap-1" style={{ color: 'var(--color-warning)' }}>
                  <FontAwesomeIcon icon={faCoins} className="w-4 h-4" />
                  <span className="font-medium">{user.credits || 0}</span>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // TODO: Add settings modal
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded transition-colors"
                style={{ color: 'var(--color-textSecondary)' }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--color-textPrimary)';
                  e.target.style.backgroundColor = 'var(--color-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--color-textSecondary)';
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                Settings
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded transition-colors"
                style={{ color: 'var(--color-error)' }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#ff6b6b';
                  e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--color-error)';
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfile;
