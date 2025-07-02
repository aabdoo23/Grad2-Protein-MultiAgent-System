import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './components/UserProfile';
import ThemeToggle from './components/ThemeToggle';
import LandingPage from './pages/LandingPage';
import ChatbotPage from './pages/ChatbotPage';
import SandboxPage from './pages/SandboxPage';
import DocumentationPage from './pages/DocumentationPage';
import FinetuningPage from './pages/FinetuningPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="flex flex-col h-screen" style={{ 
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-textPrimary)',
            fontFamily: 'Inter, "Noto Sans", sans-serif' 
          }}>
            {/* Header Navigation */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid px-10 py-3 shrink-0" style={{
              borderBottomColor: 'var(--color-border)'
            }}>
              <Link to="/" className="flex items-center gap-4" style={{ color: 'var(--color-textPrimary)' }}>
                <div className="size-4">
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </div>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]" style={{ color: 'var(--color-textPrimary)' }}>Protomatic</h2>
              </Link>
              <div className="flex items-center gap-4">
                <Link to="/sandbox" className="px-4 py-2 rounded text-sm transition-colors duration-200" style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'white'
                }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-accentHover)'}
                   onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}>
                  Pipeline Sandbox
                </Link>
                <Link to="/finetuning" className="px-4 py-2 rounded text-sm transition-colors duration-200" style={{
                  backgroundColor: 'var(--color-secondary)',
                  color: 'var(--color-textPrimary)'
                }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-tertiary)'}
                   onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-secondary)'}>
                  Fine-tuning
                </Link>
                <Link to="/chatbot" className="px-4 py-2 rounded text-sm transition-colors duration-200" style={{
                  backgroundColor: 'var(--color-secondary)',
                  color: 'var(--color-textPrimary)'
                }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-tertiary)'}
                   onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-secondary)'}>
                  AI Chat
                </Link>
                <Link to="/documentation" className="px-4 py-2 rounded text-sm transition-colors duration-200" style={{
                  backgroundColor: 'var(--color-secondary)',
                  color: 'var(--color-textPrimary)'
                }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-tertiary)'}
                   onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-secondary)'}>
                  Documentation
                </Link>
                <ThemeToggle />
                <UserProfile />
              </div>
            </header>

            {/* Routes - taking remaining space */}
            <div className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/chatbot" element={<ChatbotPage />} />
                <Route path="/sandbox" element={<SandboxPage />} />
                <Route path="/finetuning" element={
                  <ProtectedRoute>
                    <FinetuningPage />
                  </ProtectedRoute>
                } />
                <Route path="/documentation" element={<DocumentationPage />} />
              </Routes>
            </div>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
