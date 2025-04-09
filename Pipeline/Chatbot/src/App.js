import React, { useState, useRef, useEffect } from 'react';
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
    timeout: 10000,
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

      appendMessage(result.message || 'I received your message.');

      if (result.jobs && Array.isArray(result.jobs)) {
        handleJobConfirmations(result);
      }

      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
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

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#111c22] dark group/design-root overflow-x-hidden" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#233c48] px-10 py-3">
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
        <div className="gap-1 px-6 flex flex-1 justify-center py-5 relative">
          <div className="layout-content-container flex flex-col max-w-[920px] flex-1">
            <h2 className="text-white tracking-light text-[28px] font-bold leading-tight px-4 text-center pb-3 pt-5">Hello, aabdoo23</h2>
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-4 space-y-4 mb-4" 
              style={{ height: 'calc(100vh - 250px)' }}
            >
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-xl px-4 py-2 ${
                    message.isUser ? 'bg-[#13a4ec] text-white' : 'bg-[#233c48] text-white'
                  }`}>
                    {message.text}
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
            </div>
            <div className="flex items-center px-4 py-3 gap-3 @container sticky bottom-0 bg-[#111c22]">
              <label className="flex flex-col min-w-40 h-12 flex-1">
                <div className="flex w-full flex-1 items-stretch rounded-xl h-full">
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Start your first message with Protein AI..."
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-0 border-none bg-[#233c48] focus:border-none h-full placeholder:text-[#92b7c9] px-4 rounded-r-none border-r-0 pr-2 text-base font-normal leading-normal"
                  />
                  <div className="flex border-none bg-[#233c48] items-center justify-center pr-4 rounded-r-xl border-l-0 !pr-2">
                    <div className="flex items-center gap-4 justify-end">
                      <button
                        onClick={handleSendMessage}
                        className="min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-8 px-4 bg-[#13a4ec] text-white text-sm font-medium leading-normal hidden @[480px]:block"
                      >
                        <span className="truncate">Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div className="layout-content-container flex flex-col w-[360px]">
            <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Running Jobs</h3>
            <JobStatus ref={jobStatusRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 