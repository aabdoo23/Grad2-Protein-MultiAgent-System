// Job management and UI interactions
class JobUI {
    constructor() {
        this.jobQueue = [];
        this.jobList = new Map();
        this.pendingConfirmations = [];
    }

    createJobElement(job) {
        const jobElement = document.createElement('div');
        jobElement.className = 'flex flex-col bg-[#111c22] px-4 min-h-[72px] py-2 mb-2';
        jobElement.id = `job-${job.id}`;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center justify-between w-full';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'flex flex-col justify-center flex-1';

        const titleP = document.createElement('p');
        titleP.className = 'text-white text-base font-medium leading-normal line-clamp-1';
        titleP.textContent = job.title;

        const descP = document.createElement('p');
        descP.className = 'text-[#92b7c9] text-sm font-normal leading-normal line-clamp-2';
        descP.textContent = job.description;

        const statusP = document.createElement('p');
        statusP.className = 'text-[#92b7c9] text-sm font-normal leading-normal';
        statusP.textContent = `Status: ${job.status}`;

        contentDiv.appendChild(titleP);
        contentDiv.appendChild(descP);
        contentDiv.appendChild(statusP);

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'hidden w-full mt-2 border-t border-[#233c48] pt-2 pb-2';
        detailsDiv.id = `details-${job.id}`;

        const paramsDiv = document.createElement('div');
        paramsDiv.className = 'text-[#92b7c9] text-sm mb-3';
        paramsDiv.innerHTML = `<strong>Parameters:</strong><br><pre class="text-[#92b7c9] text-sm font-mono whitespace-pre-wrap bg-[#1a2c36] p-3 rounded mt-2 overflow-x-auto">${JSON.stringify(job.parameters, null, 2)}</pre>`;

        const resultDiv = document.createElement('div');
        resultDiv.className = 'text-[#92b7c9] text-sm mt-2';
        resultDiv.id = `result-${job.id}`;
        resultDiv.innerHTML = job.result ? `<strong>Result:</strong><br><pre class="text-[#92b7c9] text-sm font-mono whitespace-pre-wrap bg-[#1a2c36] p-3 rounded mt-2 overflow-x-auto">${JSON.stringify(job.result, null, 2)}</pre>` : '';

        detailsDiv.appendChild(paramsDiv);
        detailsDiv.appendChild(resultDiv);

        const toggleButton = document.createElement('div');
        toggleButton.className = 'shrink-0 cursor-pointer';
        toggleButton.innerHTML = `
            <div class="text-white flex size-7 items-center justify-center" data-icon="CaretDown">
                <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path>
                </svg>
            </div>
        `;

        toggleButton.addEventListener('click', () => {
            const details = document.getElementById(`details-${job.id}`);
            details.classList.toggle('hidden');
            toggleButton.querySelector('svg').style.transform = details.classList.contains('hidden') ? '' : 'rotate(180deg)';
        });

        headerDiv.appendChild(contentDiv);
        headerDiv.appendChild(toggleButton);
        jobElement.appendChild(headerDiv);
        jobElement.appendChild(detailsDiv);

        return jobElement;
    }

    createConfirmationDialog(job) {
        const dialog = document.createElement('div');
        dialog.className = 'flex items-center gap-4 bg-[#233c48] px-4 py-3 rounded-xl mt-2';
        dialog.id = `confirm-${job.id}`;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex-1 text-white';
        messageDiv.innerHTML = `
            <p class="font-medium">${job.title}</p>
            <p class="text-sm text-[#92b7c9]">${job.description}</p>
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-2';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'bg-[#13a4ec] text-white px-4 py-1 rounded-lg text-sm';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.onclick = () => this.confirmJob(job.id);

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'bg-[#374151] text-white px-4 py-1 rounded-lg text-sm';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => this.cancelJob(job.id);

        buttonContainer.appendChild(confirmBtn);
        buttonContainer.appendChild(cancelBtn);

        dialog.appendChild(messageDiv);
        dialog.appendChild(buttonContainer);

        return dialog;
    }

    addJobConfirmation(job) {
        const chatContainer = document.getElementById('chatContainer');
        const confirmationDialog = this.createConfirmationDialog(job);
        this.pendingConfirmations.push(job.id);
        chatContainer.appendChild(confirmationDialog);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async confirmJob(jobId) {
        try {
            const response = await api.post('/confirm-job', { job_id: jobId });
            if (response.data.success) {
                this.removeConfirmationDialog(jobId);
                this.addJobToList(response.data.job);
            }
        } catch (error) {
            console.error('Error confirming job:', error);
        }
    }

    cancelJob(jobId) {
        this.removeConfirmationDialog(jobId);
        this.pendingConfirmations = this.pendingConfirmations.filter(id => id !== jobId);
    }

    removeConfirmationDialog(jobId) {
        const dialog = document.getElementById(`confirm-${jobId}`);
        if (dialog) {
            dialog.remove();
        }
    }

    addJobToList(job) {
        const jobsContainer = document.querySelector('.layout-content-container.flex.flex-col.w-\\[360px\\]');
        const jobElement = this.createJobElement(job);
        this.jobList.set(job.id, job);
        
        // Remove any placeholder content
        const existingJob = document.getElementById(`job-${job.id}`);
        if (existingJob) {
            existingJob.replaceWith(jobElement);
        } else {
            jobsContainer.appendChild(jobElement);
        }
    }

    updateJobStatus(jobId, status, result = null) {
        const job = this.jobList.get(jobId);
        if (job) {
            job.status = status;
            if (result) {
                job.result = result;
            }
            const jobElement = document.getElementById(`job-${jobId}`);
            if (jobElement) {
                const statusP = jobElement.querySelector('p:nth-child(3)');
                statusP.textContent = `Status: ${status}`;
                
                if (result) {
                    const resultDiv = document.getElementById(`result-${jobId}`);
                    if (resultDiv) {
                        resultDiv.innerHTML = `<strong>Result:</strong><br><pre class="text-[#92b7c9] text-sm font-mono whitespace-pre-wrap bg-[#1a2c36] p-3 rounded mt-2 overflow-x-auto">${JSON.stringify(result, null, 2)}</pre>`;
                    }
                }
            }
        }
    }
}

// Initialize job UI manager
const jobUI = new JobUI();

// Extend the existing sendMessage function to handle job confirmations
async function handleJobConfirmations(response) {
    if (response.jobs && Array.isArray(response.jobs)) {
        for (const job of response.jobs) {
            jobUI.addJobConfirmation(job);
        }
    }
}