import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ 
      backgroundColor: 'var(--color-primary)',
      fontFamily: 'Inter, "Noto Sans", sans-serif' 
    }}>
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo and Title */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="size-16">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                  fill="var(--color-accent)"
                ></path>
              </svg>
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-[-0.02em]" style={{ color: 'var(--color-textPrimary)' }}>
              Protomatic
            </h1>
          </div>

          {/* Subtitle */}
          <h2 className="text-xl font-normal leading-normal mb-8 max-w-2xl mx-auto" style={{ color: 'var(--color-textSecondary)' }}>
            Advanced protein analysis pipeline with AI-powered chatbot assistance, 
            structure prediction, and comprehensive molecular tools
          </h2>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-secondary)' }}>
              <div className="text-2xl mb-4" style={{ color: 'var(--color-accent)' }}>🧬</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-textPrimary)' }}>Protein Generation</h3>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Generate novel protein sequences with specific properties using advanced AI models
              </p>
            </div>
            <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-secondary)' }}>
              <div className="text-2xl mb-4" style={{ color: 'var(--color-accent)' }}>⚗️</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-textPrimary)' }}>Model Fine-tuning</h3>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Fine-tune protein language models on your own data for specialized applications
              </p>
            </div>
            <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-secondary)' }}>
              <div className="text-2xl mb-4" style={{ color: 'var(--color-accent)' }}>🔬</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-textPrimary)' }}>Structure Prediction</h3>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Predict 3D protein structures using ColabFold and other state-of-the-art tools
              </p>
            </div>
            <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-secondary)' }}>
              <div className="text-2xl mb-4" style={{ color: 'var(--color-accent)' }}>🤖</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-textPrimary)' }}>AI Assistant</h3>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Intelligent chatbot to guide you through complex protein analysis workflows
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/sandbox" 
              className="px-8 py-3 rounded-xl text-lg font-medium transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-accentHover)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
            >
                Try Pipeline Sandbox
            </Link>
            <Link 
              to="/finetuning" 
              className="px-8 py-3 rounded-xl text-lg font-medium transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-secondary)',
                color: 'var(--color-textPrimary)'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-tertiary)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-secondary)'}
            >
                Fine-tune Models
            </Link>
            <Link 
              to="/chatbot" 
              className="px-8 py-3 rounded-xl text-lg font-medium transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-secondary)',
                color: 'var(--color-textPrimary)'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-tertiary)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-secondary)'}
            >
                Explore AI Chatbot
            </Link>
            <Link 
              to="/documentation" 
              className="px-8 py-3 rounded-xl text-lg font-medium transition-colors duration-200"
              style={{ color: 'var(--color-accent)' }}
              onMouseEnter={(e) => e.target.style.color = 'var(--color-accentHover)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--color-accent)'}
            >
              View Documentation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
