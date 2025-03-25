// Job status polling and updates
class JobStatusManager {
    constructor() {
        this.pollingIntervals = new Map();
        this.pollingDelay = 5000; // 5 seconds between polls
    }

    startPolling(jobId) {
        if (this.pollingIntervals.has(jobId)) return;

        const interval = setInterval(async () => {
            try {
                const response = await api.get(`/job-status/${jobId}`);
                const jobStatus = response.data;

                // Update job UI with new status
                jobUI.updateJobStatus(jobId, jobStatus.status, jobStatus.result);

                // If job is completed or failed, stop polling
                if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
                    this.stopPolling(jobId);
                }
            } catch (error) {
                console.error(`Error polling job status for ${jobId}:`, error);
                this.stopPolling(jobId);
            }
        }, this.pollingDelay);

        this.pollingIntervals.set(jobId, interval);
    }

    stopPolling(jobId) {
        const interval = this.pollingIntervals.get(jobId);
        if (interval) {
            clearInterval(interval);
            this.pollingIntervals.delete(jobId);
        }
    }

    stopAllPolling() {
        for (const [jobId, interval] of this.pollingIntervals) {
            clearInterval(interval);
        }
        this.pollingIntervals.clear();
    }
}

// Initialize job status manager
const jobStatusManager = new JobStatusManager();

// Add event listener for page unload to clean up polling intervals
window.addEventListener('beforeunload', () => {
    jobStatusManager.stopAllPolling();
});