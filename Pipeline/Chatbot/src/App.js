import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './components/UserProfile';
import LandingPage from './pages/LandingPage';
import ChatbotPage from './pages/ChatbotPage';
import SandboxPage from './pages/SandboxPage';
import DocumentationPage from './pages/DocumentationPage';
import FinetuningPage from './pages/FinetuningPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col h-screen bg-[#111c22]" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
          {/* Header Navigation */}
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#233c48] px-10 py-3 shrink-0">
            <Link to="/" className="flex items-center gap-4 text-white">
              <div className="size-4">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                    fill="currentColor"
                  ></path>
                </svg>
              </div>
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Protomatic</h2>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/sandbox" className="bg-[#13a4ec] hover:bg-[#0f8fd1] text-white px-4 py-2 rounded text-sm">
                Pipeline Sandbox
              </Link>
              <Link to="/finetuning" className="bg-[#233c48] hover:bg-[#2a4653] text-white px-4 py-2 rounded text-sm">
                Fine-tuning
              </Link>
              <Link to="/chatbot" className="bg-[#233c48] hover:bg-[#2a4653] text-white px-4 py-2 rounded text-sm">
                AI Chat
              </Link>
              <Link to="/documentation" className="bg-[#233c48] hover:bg-[#2a4653] text-white px-4 py-2 rounded text-sm">
                Documentation
              </Link>
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
  );
}

export default App;
