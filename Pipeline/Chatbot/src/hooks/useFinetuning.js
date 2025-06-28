import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useFinetuning = () => {
  const [baseModels, setBaseModels] = useState([]);
  const [userModels, setUserModels] = useState([]);
  const [userJobs, setUserJobs] = useState([]);
  const [serverHealth, setServerHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pollingJobs, setPollingJobs] = useState(new Set());

  const apiCall = useCallback(async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }, []);

  const checkServerHealth = useCallback(async () => {
    try {
      const result = await apiCall('/api/finetune/health');
      setServerHealth(result);
      return result;
    } catch (error) {
      const errorResult = { success: false, server_status: 'offline', error: error.message };
      setServerHealth(errorResult);
      return errorResult;
    }
  }, [apiCall]);

  const loadBaseModels = useCallback(async () => {
    try {
      const result = await apiCall('/api/finetune/models/base');
      setBaseModels(result.models || []);
      return result.models || [];
    } catch (error) {
      console.error('Failed to load base models:', error);
      return [];
    }
  }, [apiCall]);

  const loadUserData = useCallback(async () => {
    try {
      const [modelsResult, jobsResult] = await Promise.all([
        apiCall('/api/finetune/models/user/current'),
        apiCall('/api/finetune/jobs/user/current')
      ]);
      
      setUserModels(modelsResult.models || []);
      setUserJobs(jobsResult.jobs || []);
      return { models: modelsResult.models || [], jobs: jobsResult.jobs || [] };
    } catch (error) {
      console.error('Failed to load user data:', error);
      return { models: [], jobs: [] };
    }
  }, [apiCall]);

  const startFinetuning = useCallback(async (formData) => {
    setLoading(true);
    try {
      const result = await apiCall('/api/finetune/start', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (result.success) {
        setPollingJobs(prev => new Set([...prev, result.job_id]));
        await loadUserData();
        return result;
      } else {
        throw new Error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [apiCall, loadUserData]);

  const generateSequence = useCallback(async (formData) => {
    setLoading(true);
    try {
      const result = await apiCall('/api/finetune/generate', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (result.success) {
        setPollingJobs(prev => new Set([...prev, result.job_id]));
        await loadUserData();
        return result;
      } else {
        throw new Error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [apiCall, loadUserData]);

  const checkJobStatus = useCallback(async (jobId) => {
    try {
      const result = await apiCall(`/api/finetune/status/${jobId}`);
      
      if (result.success) {
        const status = result.status;
        if (status === 'completed' || status === 'failed') {
          setPollingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(jobId);
            return newSet;
          });
          await loadUserData();
        }
        return result;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error(`Failed to check status for job ${jobId}:`, error);
      throw error;
    }
  }, [apiCall, loadUserData]);

  const deleteModel = useCallback(async (jobId) => {
    try {
      const result = await apiCall(`/api/finetune/models/current/${jobId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        await loadUserData();
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Failed to delete model ${jobId}:`, error);
      throw error;
    }
  }, [apiCall, loadUserData]);

  // Auto-poll job statuses
  useEffect(() => {
    if (pollingJobs.size > 0) {
      const interval = setInterval(() => {
        pollingJobs.forEach(jobId => {
          checkJobStatus(jobId).catch(console.error);
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [pollingJobs, checkJobStatus]);

  // Initialize data
  useEffect(() => {
    checkServerHealth();
    loadBaseModels();
    loadUserData();
  }, [checkServerHealth, loadBaseModels, loadUserData]);

  return {
    // Data
    baseModels,
    userModels,
    userJobs,
    serverHealth,
    loading,
    pollingJobs,
    
    // Actions
    startFinetuning,
    generateSequence,
    checkJobStatus,
    deleteModel,
    loadUserData,
    loadBaseModels,
    checkServerHealth,
    
    // Utilities
    isServerOnline: serverHealth?.success === true,
    hasPollingJobs: pollingJobs.size > 0
  };
};

export default useFinetuning;
