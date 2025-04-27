import React, { useState, useRef, useEffect } from 'react';
import Split from 'react-split';
import axios from 'axios';
import JobManager from './components/JobManager';
import JobStatus from './components/JobStatus';
import JobConfirmation from './components/JobConfirmation';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [pendingJobs, setPendingJobs] = useState([]);
  const chatContainerRef = useRef(null);
  const jobManager = useRef(new JobManager());
  const jobStatusRef = useRef(null);

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    timeout: 300000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  useEffect(() => {
    // Set up the job update callback
    jobManager.current.setJobUpdateCallback(() => {
      setPendingJobs(jobManager.current.getPendingConfirmations());
    });
  }, []);

  const appendMessage = (message, isUser = false) => {
    setMessages(prev => [...prev, { text: message, isUser }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      appendMessage(inputValue, true);
      
      const response = await api.post('/chat', { message: inputValue });
      const result = response.data;

      // Display the natural language explanation if available
      if (result.explanation) {
        appendMessage(result.explanation);
      } else {
        appendMessage(result.message || 'I received your message.');
      }

      // Handle function pipeline jobs
      if (result.functions && Array.isArray(result.functions)) {
        // Create jobs with IDs from the backend response
        handleJobConfirmations({
          jobs: result.functions.map((func, index) => ({
            id: `job-${Date.now()}-${index}`,
            name: func.name,
            description: getPipelineFunctionDescription(func.name),
            parameters: func.parameters,
            status: 'pending',
            function_data: func  // Store the original function data
          }))
        });
      } else if (result.jobs && Array.isArray(result.jobs)) {
        // Fallback for old format
        handleJobConfirmations(result);
      }

      setInputValue('');
      
      // Scroll to bottom after new message
      if (chatContainerRef.current) {
        setTimeout(() => {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      appendMessage('Sorry, there was an error processing your request. Please try again.');
    }
  };

  // Get description for pipeline functions
  const getPipelineFunctionDescription = (functionName) => {
    const descriptions = {
      'generate_protein': 'Generate a protein sequence with specific properties',
      'predict_structure': 'Predict the 3D structure of a protein sequence',
      'evaluate_sequence': 'Evaluate properties of a protein sequence',
      'search_similarity': 'Search for similar protein sequences',
      'search_structure': 'Search for similar protein structures using FoldSeek',
      'evaluate_structure': 'Evaluate the quality and properties of a predicted 3D structure'
    };
    return descriptions[functionName] || 'Execute protein pipeline function';
  };

  const handleJobConfirmations = (response) => {
    if (response.jobs && Array.isArray(response.jobs)) {
      response.jobs.forEach(job => {
        jobManager.current.addJobConfirmation(job);
      });
    }
  };

  const handleConfirmJob = async (jobId) => {
    const success = await jobManager.current.confirmJob(jobId);
    if (success && jobStatusRef.current) {
      jobStatusRef.current.startPolling(jobId);
    }
  };

  const handleRejectJob = (jobId) => {
    jobManager.current.rejectJob(jobId);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, pendingJobs]);

  // Helper function to format text with markdown-like syntax
  const formatMessageText = (text) => {
    // Split by newlines and convert to JSX
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="flex flex-col min-h-screen h-screen bg-[#111c22]" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#233c48] px-10 py-3 shrink-0">
        <div className="flex items-center gap-4 text-white">
          <div className="size-4">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Protein AI</h2>
        </div>
      </header>

      {/* Main content area */}
      <Split
        className="flex flex-1 overflow-hidden"
        sizes={[50, 50]}
        minSize={200}
        expandToMin={false}
        gutterSize={8}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="horizontal"
        cursor="col-resize"
        gutterStyle={() => ({
          backgroundColor: '#233c48',
          width: '8px',
          cursor: 'col-resize',
          position: 'relative',
        })}
      >
        {/* Chat section */}
        <div className="flex flex-col relative border-r border-[#233c48]">
          <h2 className="text-white tracking-light text-[28px] font-bold leading-tight px-4 text-center pb-3 pt-5 shrink-0">
            Hello, aabdoo23
          </h2>

          {/* Messages container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 space-y-4 pb-4"
          >
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-xl px-4 py-2 ${
                  message.isUser ? 'bg-[#13a4ec] text-white' : 'bg-[#233c48] text-white'
                }`}>
                  {formatMessageText(message.text)}
                </div>
              </div>
            ))}
            {pendingJobs.map(job => (
              <JobConfirmation
                key={job.id}
                job={job}
                onConfirm={handleConfirmJob}
                onReject={handleRejectJob}
              />
            ))}
            <div className="h-4"></div>
          </div>

          {/* Input area */}
          <div className="border-t border-[#233c48] px-4 py-3 bg-[#111c22] shrink-0">
            <div className="flex items-center w-full gap-3">
              <div className="flex flex-1 items-stretch rounded-xl h-12">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message with Protein AI..."
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-xl text-white focus:outline-0 focus:ring-0 border-none bg-[#233c48] focus:border-none h-full placeholder:text-[#92b7c9] px-4 pr-2 text-base font-normal leading-normal"
                />
                <div className="flex items-center justify-center pr-4 bg-[#233c48] rounded-r-xl !pr-2">
                  <button
                    onClick={handleSendMessage}
                    className="min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-8 px-4 bg-[#13a4ec] text-white text-sm font-medium leading-normal"
                  >
                    <span className="truncate">Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs section */}
        <div className="flex flex-col flex-grow-0 flex-shrink-0 bg-[#111c22] mb-4">
          <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 px-4 py-4 sticky top-0 bg-[#111c22] z-10 border-b border-[#233c48]">
            Running Jobs
          </h3>

          {/* Job status container */}
          <div className="flex-1 overflow-y-auto">
            <JobStatus ref={jobStatusRef} />
          </div>
        </div>
      </Split>
    </div>
  );
}

export default App;