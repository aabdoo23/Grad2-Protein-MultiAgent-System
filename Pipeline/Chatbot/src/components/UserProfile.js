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
        className="flex items-center gap-2 bg-[#233c48] hover:bg-[#2a4653] text-white px-3 py-2 rounded-lg transition-colors"
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
          <div className="absolute right-0 mt-2 w-64 bg-[#1a2d35] border border-gray-600 rounded-lg shadow-xl z-20">
            <div className="p-4 border-b border-gray-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#13a4ec] rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faUser} className="text-white w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium">{user.full_name}</p>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                  {user.institution && (
                    <p className="text-gray-500 text-xs">{user.institution}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-gray-300 text-sm">Credits:</span>
                <div className="flex items-center gap-1 text-yellow-400">
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
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-[#233c48] rounded transition-colors"
              >
                <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                Settings
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-600/10 rounded transition-colors"
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
