import React from 'react';
import axios from 'axios';

class JobManager {
  constructor() {
    this.jobQueue = [];
    this.jobList = new Map();
    this.pendingConfirmations = [];
    this.onJobUpdate = null;
    
    this.api = axios.create({
      baseURL: 'http://localhost:5000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  setJobUpdateCallback(callback) {
    this.onJobUpdate = callback;
  }

  addJobConfirmation(job) {
    this.jobList.set(job.id, job);
    this.pendingConfirmations.push(job.id);
    
    if (this.onJobUpdate) {
      this.onJobUpdate();
    }
  }

  async confirmJob(jobId) {
    const job = this.jobList.get(jobId);
    if (job) {
      try {
        // Send confirmation to backend
        const response = await this.api.post('/confirm-job', { job_id: jobId });
        
        if (response.data.success) {
          // Add the job to the queue
          this.jobQueue.push(job);
          
          // Remove from pending confirmations
          this.pendingConfirmations = this.pendingConfirmations.filter(id => id !== jobId);
          
          if (this.onJobUpdate) {
            this.onJobUpdate();
          }
          
          return true;
        } else {
          console.error('Failed to confirm job:', response.data.message);
          return false;
        }
      } catch (error) {
        console.error('Error confirming job:', error);
        return false;
      }
    }
    return false;
  }

  rejectJob(jobId) {
    // Remove from pending confirmations
    this.pendingConfirmations = this.pendingConfirmations.filter(id => id !== jobId);
    
    // Remove from job list
    this.jobList.delete(jobId);
    
    if (this.onJobUpdate) {
      this.onJobUpdate();
    }
  }

  startJob(job) {
    // Implementation for starting the job
    console.log('Starting job:', job);
    // Add your job execution logic here
  }

  addJobToList(job) {
    this.jobList.set(job.id, job);
    
    if (this.onJobUpdate) {
      this.onJobUpdate();
    }
  }

  getPendingConfirmations() {
    return this.pendingConfirmations.map(id => this.jobList.get(id));
  }

  getJobQueue() {
    return this.jobQueue;
  }
}

export default JobManager; 