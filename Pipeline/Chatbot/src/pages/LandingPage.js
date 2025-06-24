import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="flex flex-col h-full bg-[#111c22] overflow-y-auto" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo and Title */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="size-16">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                  fill="#13a4ec"
                ></path>
              </svg>
            </div>
            <h1 className="text-white text-5xl font-bold leading-tight tracking-[-0.02em]">
              Protomatic
            </h1>
          </div>

          {/* Subtitle */}
          <h2 className="text-[#92b7c9] text-xl font-normal leading-normal mb-8 max-w-2xl mx-auto">
            Advanced protein analysis pipeline with AI-powered chatbot assistance, 
            structure prediction, and comprehensive molecular tools
          </h2>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-[#233c48] rounded-xl p-6">
              <div className="text-[#13a4ec] text-2xl mb-4">🧬</div>
              <h3 className="text-white text-lg font-semibold mb-2">Protein Generation</h3>
              <p className="text-[#92b7c9] text-sm">
                Generate novel protein sequences with specific properties using advanced AI models
              </p>
            </div>
            <div className="bg-[#233c48] rounded-xl p-6">
              <div className="text-[#13a4ec] text-2xl mb-4">🔬</div>
              <h3 className="text-white text-lg font-semibold mb-2">Structure Prediction</h3>
              <p className="text-[#92b7c9] text-sm">
                Predict 3D protein structures using ColabFold and other state-of-the-art tools
              </p>
            </div>
            <div className="bg-[#233c48] rounded-xl p-6">
              <div className="text-[#13a4ec] text-2xl mb-4">🤖</div>
              <h3 className="text-white text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-[#92b7c9] text-sm">
                Intelligent chatbot to guide you through complex protein analysis workflows
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/sandbox" 
              className="bg-[#13a4ec] hover:bg-[#0f8fd1] text-white px-8 py-3 rounded-xl text-lg font-medium transition-colors duration-200"
            >
                Try Pipeline Sandbox
            </Link>
            <Link 
              to="/chatbot" 
              className="bg-[#233c48] hover:bg-[#2a4653] text-white px-8 py-3 rounded-xl text-lg font-medium transition-colors duration-200"
            >
                Explore AI Chatbot
            </Link>
            <Link 
              to="/documentation" 
              className="text-[#13a4ec] hover:text-[#0f8fd1] px-8 py-3 rounded-xl text-lg font-medium transition-colors duration-200"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </div>

      {/* Additional Features Section */}
      <div className="border-t border-[#233c48] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-white text-2xl font-bold text-center mb-12">
            Comprehensive Protein Analysis Tools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-[#233c48] rounded-lg p-4 mb-4">
                <div className="text-[#13a4ec] text-xl">🔍</div>
              </div>
              <h4 className="text-white font-semibold mb-2">Sequence Search</h4>
              <p className="text-[#92b7c9] text-sm">BLAST and similarity searches</p>
            </div>
            <div className="text-center">
              <div className="bg-[#233c48] rounded-lg p-4 mb-4">
                <div className="text-[#13a4ec] text-xl">⚡</div>
              </div>
              <h4 className="text-white font-semibold mb-2">Structure Search</h4>
              <p className="text-[#92b7c9] text-sm">FoldSeek structural searches</p>
            </div>
            <div className="text-center">
              <div className="bg-[#233c48] rounded-lg p-4 mb-4">
                <div className="text-[#13a4ec] text-xl">📊</div>
              </div>
              <h4 className="text-white font-semibold mb-2">Quality Analysis</h4>
              <p className="text-[#92b7c9] text-sm">Ramachandran plots and validation</p>
            </div>
            <div className="text-center">
              <div className="bg-[#233c48] rounded-lg p-4 mb-4">
                <div className="text-[#13a4ec] text-xl">🌳</div>
              </div>
              <h4 className="text-white font-semibold mb-2">Phylogenetics</h4>
              <p className="text-[#92b7c9] text-sm">Evolutionary analysis tools</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
