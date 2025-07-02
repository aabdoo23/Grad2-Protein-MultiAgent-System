import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEnvelope, faBuilding, faSpinner, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { BASE_URL } from '../config/appConfig';

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    institution: ''
  });
  const [errors, setErrors] = useState({});

  const API_BASE = BASE_URL;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!isLogin) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }

      if (!formData.full_name.trim()) {
        newErrors.full_name = 'Full name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        onAuthSuccess(result.user);
      } else {
        setErrors({ general: result.error || 'Authentication failed' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      institution: ''
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-primary)' }}>
      <div className="max-w-md w-full">
        <div className="rounded-lg shadow-xl p-8" style={{ backgroundColor: 'var(--color-secondary)' }}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-textPrimary)' }}>
              Protein Pipeline
            </h1>
            <p style={{ color: 'var(--color-textSecondary)' }}>
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </p>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 border rounded text-sm" style={{
              backgroundColor: 'var(--color-tertiary)',
              borderColor: 'var(--color-error)',
              color: 'var(--color-error)'
            }}>
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                Username
              </label>
              <div className="relative">
                <FontAwesomeIcon 
                  icon={faUser} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-textMuted)' }}
                />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--color-tertiary)',
                    color: 'var(--color-textPrimary)',
                    borderColor: errors.username ? 'var(--color-error)' : 'var(--color-border)',
                    '--tw-ring-color': errors.username ? 'var(--color-error)' : 'var(--color-accent)'
                  }}
                  placeholder="Enter your username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{errors.username}</p>
              )}
            </div>

            {/* Email (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                  Email
                </label>
                <div className="relative">
                  <FontAwesomeIcon 
                    icon={faEnvelope} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-textMuted)' }}
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-tertiary)',
                      color: 'var(--color-textPrimary)',
                      borderColor: errors.email ? 'var(--color-error)' : 'var(--color-border)',
                      '--tw-ring-color': errors.email ? 'var(--color-error)' : 'var(--color-accent)'
                    }}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{errors.email}</p>
                )}
              </div>
            )}

            {/* Full Name (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                  Full Name
                </label>
                <div className="relative">
                  <FontAwesomeIcon 
                    icon={faUser} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-textMuted)' }}
                  />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-tertiary)',
                      color: 'var(--color-textPrimary)',
                      borderColor: errors.full_name ? 'var(--color-error)' : 'var(--color-border)',
                      '--tw-ring-color': errors.full_name ? 'var(--color-error)' : 'var(--color-accent)'
                    }}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.full_name && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{errors.full_name}</p>
                )}
              </div>
            )}

            {/* Institution (register only, optional) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                  Institution <span style={{ color: 'var(--color-textMuted)' }}>(Optional)</span>
                </label>
                <div className="relative">
                  <FontAwesomeIcon 
                    icon={faBuilding} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-textMuted)' }}
                  />
                  <input
                    type="text"
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--color-tertiary)',
                      color: 'var(--color-textPrimary)',
                      borderColor: 'var(--color-border)'
                    }}
                    placeholder="Enter your institution"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                Password
              </label>
              <div className="relative">
                <FontAwesomeIcon 
                  icon={faLock} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-textMuted)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--color-tertiary)',
                    color: 'var(--color-textPrimary)',
                    borderColor: errors.password ? 'var(--color-error)' : 'var(--color-border)',
                    '--tw-ring-color': errors.password ? 'var(--color-error)' : 'var(--color-accent)'
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--color-textMuted)' }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--color-textSecondary)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--color-textMuted)'}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-4 h-4" />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>{errors.password}</p>
              )}
              {!isLogin && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-textMuted)' }}>
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
              style={{
                backgroundColor: loading ? 'var(--color-textMuted)' : 'var(--color-accent)',
                color: 'white'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = 'var(--color-accentHover)')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = 'var(--color-accent)')}
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2 w-4 h-4" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p style={{ color: 'var(--color-textSecondary)' }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={switchMode}
                className="ml-2 font-medium transition-colors"
                style={{ color: 'var(--color-accent)' }}
                onMouseEnter={(e) => e.target.style.color = 'var(--color-accentHover)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--color-accent)'}
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
