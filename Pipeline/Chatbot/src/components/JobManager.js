import React from 'react';

class JobManager {
  constructor() {
    this.jobQueue = [];
    this.jobList = new Map();
    this.pendingConfirmations = [];
  }

  addJobConfirmation(job) {
    const jobElement = this.createConfirmationDialog(job);
    this.pendingConfirmations.push(job.id);
    
    // Find the chat container and append the job confirmation
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      chatContainer.appendChild(jobElement);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  createConfirmationDialog(job) {
    const dialog = document.createElement('div');
    dialog.className = 'flex justify-start';
    dialog.innerHTML = `
      <div class="max-w-[70%] rounded-xl px-4 py-2 bg-[#233c48] text-white">
        <div class="font-medium mb-2">${job.title}</div>
        <div class="text-sm text-gray-300 mb-3">${job.description}</div>
        <div class="flex gap-2">
          <button 
            onclick="window.jobManager.confirmJob('${job.id}')"
            class="px-3 py-1 bg-[#13a4ec] text-white rounded-lg text-sm hover:bg-[#0f8fd1]"
          >
            Confirm
          </button>
          <button 
            onclick="window.jobManager.rejectJob('${job.id}')"
            class="px-3 py-1 bg-[#233c48] text-white border border-[#13a4ec] rounded-lg text-sm hover:bg-[#2a4a5a]"
          >
            Reject
          </button>
        </div>
      </div>
    `;
    return dialog;
  }

  confirmJob(jobId) {
    const job = this.jobList.get(jobId);
    if (job) {
      // Remove the confirmation dialog
      const dialog = document.querySelector(`[data-job-id="${jobId}"]`);
      if (dialog) {
        dialog.remove();
      }
      
      // Add the job to the queue
      this.jobQueue.push(job);
      
      // Remove from pending confirmations
      this.pendingConfirmations = this.pendingConfirmations.filter(id => id !== jobId);
      
      // Start the job
      this.startJob(job);
    }
  }

  rejectJob(jobId) {
    // Remove the confirmation dialog
    const dialog = document.querySelector(`[data-job-id="${jobId}"]`);
    if (dialog) {
      dialog.remove();
    }
    
    // Remove from pending confirmations
    this.pendingConfirmations = this.pendingConfirmations.filter(id => id !== jobId);
    
    // Remove from job list
    this.jobList.delete(jobId);
  }

  startJob(job) {
    // Implementation for starting the job
    console.log('Starting job:', job);
    // Add your job execution logic here
  }

  addJobToList(job) {
    this.jobList.set(job.id, job);
  }
}

export default JobManager; 