import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFlask,
  faFileText
} from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '../contexts/AuthContext';
import useAdvancedFinetuning from '../hooks/useAdvancedFinetuning';
import { 
  EnhancedServerHealthIndicator, 
  ConnectionStatusBanner, 
  ErrorDisplay,
  StatisticsCard,
  LoadingSpinner
} from '../components/finetuning/CommonComponents';
import { 
  FinetuneForm, 
  GenerateForm, 
  GeneratedSequencesDisplay, 
  GenerationHistory,
  saveGenerationToHistory 
} from '../components/finetuning/FormComponents';
import { ModelsList, JobsList } from '../components/finetuning/JobComponents';

const FinetuningPage = () => {
  const [activeTab, setActiveTab] = useState('finetune');
  const [generationResult, setGenerationResult] = useState(null);
  const { user } = useAuth();

  // Use the advanced hook for all fine-tuning functionality
  const {
    baseModels,
    userJobs,
    serverHealth,
    statistics,
    storageInfo,
    activeJobs,
    completedJobs,
    failedJobs,
    loading,
    initializing,
    error,
    connectionError,
    pollingJobs,
    startFinetuning,
    generateSequence,
    deleteJob,
    cleanupJobFiles,
    refreshAll,
    isServerOnline,
    clearError,
    hasActiveJobs
  } = useAdvancedFinetuning();

  const handleStartFinetuning = async (formData) => {
    try {
      // Add the username from the authenticated user
      const finetuningParams = {
        ...formData,
        username: user?.user_name || user?.username || user?.email
      };
      
      const result = await startFinetuning(finetuningParams);
      alert(`Fine-tuning job started! Job ID: ${result.job_id}`);
    } catch (error) {
      console.error('Fine-tuning error:', error);
      alert(`Failed to start fine-tuning: ${error.message}`);
    }
  };

  const handleGenerateSequence = async (formData) => {
    try {
      const result = await generateSequence(formData);
      if (result.generated_sequences) {
        // Save to history
        saveGenerationToHistory(result);
        // Store the result to display it
        setGenerationResult(result);
        alert(`Generation completed! Generated ${result.generated_sequences.length} sequences`);
      } else {
        alert(`Generation job started! Generation ID: ${result.generation_id}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert(`Failed to start generation: ${error.message}`);
    }
  };

  const handleDeleteJob = async (jobId) => {
    // Find the job to get its status
    const job = userJobs.find(j => j.job_id === jobId);
    const isRunning = job && (job.status === 'running' || job.status === 'pending');
    
    // Different confirmation messages based on job status
    let confirmMessage;
    if (isRunning) {
      confirmMessage = `Are you sure you want to ${job.status === 'pending' ? 'cancel' : 'stop'} this ${job.status} job? This will terminate the process and cannot be undone.`;
    } else {
      confirmMessage = 'Are you sure you want to delete this job? This will remove it from your job history.';
    }
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteJob(jobId);
      
      // Show appropriate success message
      if (isRunning) {
        alert(`Job ${job.status === 'pending' ? 'cancelled' : 'stopped'} successfully`);
      } else {
        alert('Job deleted successfully');
      }
    } catch (error) {
      console.error('Delete error:', error);
      
      // Show appropriate error message
      if (isRunning) {
        alert(`Failed to ${job.status === 'pending' ? 'cancel' : 'stop'} job: ${error.message}`);
      } else {
        alert(`Failed to delete job: ${error.message}`);
      }
    }
  };

  const handleCleanupJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to clean up all files for this job? This action cannot be undone.')) return;

    try {
      const result = await cleanupJobFiles(jobId);
      alert(`Cleanup completed! Freed ${result.freed_space_mb}MB of storage`);
    } catch (error) {
      console.error('Cleanup error:', error);
      alert(`Failed to cleanup job: ${error.message}`);
    }
  };

  // Show loading screen during initialization
  if (initializing) {
    return (
      <div className="flex flex-col h-full bg-[#111c22] overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="xl" />
            <p className="text-gray-400 mt-4">Initializing fine-tuning service...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111c22] overflow-y-auto">
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Protein Model Fine-tuning</h1>
          <p className="text-gray-400">Fine-tune protein language models and generate sequences</p>
          
          {/* User Info and Controls */}
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <div className="text-sm text-gray-300">
              Signed in as: <span className="text-white font-medium">{user?.user_name}</span>
            </div>
            
            {/* Server Status */}
            <EnhancedServerHealthIndicator health={serverHealth} />
            
            {/* Refresh Button */}
            <button
              onClick={refreshAll}
              disabled={loading}
              className="px-3 py-1 bg-[#233c48] hover:bg-[#2a4653] text-white text-sm rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh All'}
            </button>
            
            {/* Active Jobs Indicator */}
            {hasActiveJobs && (
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <LoadingSpinner size="sm" />
                <span>{pollingJobs.size} active job{pollingJobs.size !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status Banner */}
        <ConnectionStatusBanner 
          connectionError={connectionError} 
          onRetry={refreshAll}
          className="mb-4"
        />

        {/* Error Display */}
        <ErrorDisplay 
          error={error} 
          onDismiss={clearError} 
          className="mb-4"
        />

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatisticsCard
              title="Total Jobs"
              value={statistics.job_statistics?.total_jobs || 0}
              icon={faFlask}
              color="blue"
              className="bg-[#1a2d35]"
            />
            <StatisticsCard
              title="Active Jobs"
              value={activeJobs.length}
              subtitle={`${pollingJobs.size} polling`}
              icon={faFlask}
              color="green"
              className="bg-[#1a2d35]"
            />
            <StatisticsCard
              title="Completed"
              value={completedJobs.length}
              subtitle="Ready for generation"
              icon={faFileText}
              color="purple"
              className="bg-[#1a2d35]"
            />
            <StatisticsCard
              title="Failed Jobs"
              value={failedJobs.length}
              subtitle={statistics.recent_jobs_24h ? `${statistics.recent_jobs_24h} in 24h` : ''}
              icon={faFileText}
              color="red"
              className="bg-[#1a2d35]"
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-[#233c48] p-1 rounded-lg w-fit">
            {[
              { id: 'finetune', label: 'Fine-tune Model', icon: faFlask },
              { id: 'generate', label: 'Generate Sequence', icon: faFileText },
              { id: 'results', label: 'Generated Sequences', icon: faFileText, badge: generationResult?.generated_sequences?.length || 0, hidden: !generationResult },
              { id: 'jobs', label: 'Job History', icon: faFileText, badge: userJobs.length }
            ].filter(tab => !tab.hidden).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'bg-[#13a4ec] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-[#2a4653]'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
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
            <div className="space-y-6">
              <GenerateForm
                baseModels={baseModels}
                userModels={completedJobs} // Use completed jobs as available models
                onSubmit={handleGenerateSequence}
                isLoading={loading}
                isServerOnline={isServerOnline}
                generationResult={generationResult}
                onClearResults={() => setGenerationResult(null)}
              />
              
              <GenerationHistory
                onSelectGeneration={setGenerationResult}
              />
            </div>
          )}

          {activeTab === 'results' && generationResult && (
            <GeneratedSequencesDisplay
              generationResult={generationResult}
              onClose={() => {
                setGenerationResult(null);
                setActiveTab('generate');
              }}
            />
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {/* Job Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#1a2d35] rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Active Jobs</h3>
                  <p className="text-2xl font-bold text-blue-400">{activeJobs.length}</p>
                  <p className="text-sm text-gray-400">
                    {activeJobs.length > 0 ? 'Can be cancelled/stopped' : 'Currently running'}
                  </p>
                </div>
                <div className="bg-[#1a2d35] rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Completed</h3>
                  <p className="text-2xl font-bold text-green-400">{completedJobs.length}</p>
                  <p className="text-sm text-gray-400">Ready for use</p>
                </div>
                <div className="bg-[#1a2d35] rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-2">Failed</h3>
                  <p className="text-2xl font-bold text-red-400">{failedJobs.length}</p>
                  <p className="text-sm text-gray-400">Need attention</p>
                </div>
              </div>

              <JobsList
                jobs={userJobs}
                pollingJobs={pollingJobs}
                onRefresh={refreshAll}
                onDelete={handleDeleteJob}
                onCleanup={handleCleanupJob}
                isLoading={loading}
                title="Job History"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinetuningPage;
