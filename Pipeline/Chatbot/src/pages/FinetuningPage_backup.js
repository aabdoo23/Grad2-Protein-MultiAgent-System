import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFlask,
  faFileText
} from '@fortawesome/free-solid-svg-icons';

import useFinetuning from '../hooks/useFinetuning';
import { ServerHealthIndicator } from '../components/finetuning/CommonComponents';
import { FinetuneForm, GenerateForm } from '../components/finetuning/FormComponents';
import { ModelsList, JobsList } from '../components/finetuning/JobComponents';

const FinetuningPage = () => {
  const [activeTab, setActiveTab] = useState('finetune');
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') || `user_${Date.now()}`);

  // Use the custom hook for all fine-tuning functionality
  const {
    baseModels,
    userModels,
    userJobs,
    serverHealth,
    loading,
    pollingJobs,
    startFinetuning,
    generateSequence,
    deleteModel,
    loadUserData,
    isServerOnline
  } = useFinetuning(userId);

  // Save userId to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('userId', userId);
  }, [userId]);

  const handleStartFinetuning = async (formData) => {
    try {
      const result = await startFinetuning(formData);
      alert(`Fine-tuning job started! Job ID: ${result.job_id}`);
    } catch (error) {
      alert(`Failed to start fine-tuning: ${error.message}`);
    }
  };

  const handleGenerateSequence = async (formData) => {
    try {
      const result = await generateSequence(formData);
      alert(`Generation job started! Job ID: ${result.job_id}`);
    } catch (error) {
      alert(`Failed to start generation: ${error.message}`);
    }
  };

  const handleDeleteModel = async (jobId) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      await deleteModel(jobId);
      alert('Model deleted successfully');
    } catch (error) {
      alert(`Failed to delete model: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111c22] overflow-y-auto">
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Protein Model Fine-tuning</h1>
          <p className="text-gray-400">Fine-tune protein language models and generate sequences</p>
          
          {/* User ID Input */}
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm text-gray-300">User ID:</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-[#233c48] text-white px-3 py-1 rounded text-sm w-48"
              placeholder="Enter your user ID"
            />
            
            {/* Server Status */}
            <div className="ml-4">
              <ServerHealthIndicator health={serverHealth} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-[#233c48] p-1 rounded-lg w-fit">
            {[
              { id: 'finetune', label: 'Fine-tune Model', icon: faFlask },
              { id: 'generate', label: 'Generate Sequence', icon: faFileText },
              { id: 'models', label: 'My Models', icon: faFileText },
              { id: 'jobs', label: 'Job History', icon: faFileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#13a4ec] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-[#2a4653]'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'finetune' && (
            <FinetuneForm
              baseModels={baseModels}
              onSubmit={handleStartFinetuning}
              isLoading={loading}
              isServerOnline={isServerOnline}
            />
          )}

          {activeTab === 'generate' && (
            <GenerateForm
              baseModels={baseModels}
              onSubmit={handleGenerateSequence}
              isLoading={loading}
              isServerOnline={isServerOnline}
            />
          )}

          {activeTab === 'models' && (
            <ModelsList
              models={userModels}
              onDelete={handleDeleteModel}
              onRefresh={loadUserData}
              isLoading={loading}
            />
          )}

          {activeTab === 'jobs' && (
            <JobsList
              jobs={userJobs}
              pollingJobs={pollingJobs}
              onRefresh={loadUserData}
              isLoading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FinetuningPage;
