import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 900000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Download API with blob response type
const downloadApi = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  responseType: 'blob'
});

export const jobService = {
  // Confirm a job
  confirmJob: async (jobId, jobData) => {
    try {
      const response = await api.post('/confirm-job', {
        job_id: jobId,
        job_data: jobData
      });
      return response.data;
    } catch (error) {
      console.error('Error confirming job:', error);
      throw error;
    }
  },

  // Get job status
  getJobStatus: async (jobId) => {
    try {
      const response = await api.get(`/job-status/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }
};

export const downloadService = {
  // Download sequence
  downloadSequence: async (sequence, sequenceName) => {
    try {
      const response = await downloadApi.post('/download-sequence', {
        sequence,
        sequence_name: sequenceName
      });
      return response;
    } catch (error) {
      console.error('Error downloading sequence:', error);
      throw error;
    }
  },

  // Download structure
  downloadStructure: async (pdbFile) => {
    try {
      const response = await downloadApi.post('/download-structure', {
        pdb_file: pdbFile
      });
      return response;
    } catch (error) {
      console.error('Error downloading structure:', error);
      throw error;
    }
  },

  // Download search results
  downloadSearchResults: async (results, searchType) => {
    try {
      const response = await downloadApi.post('/download-search-results', {
        results,
        search_type: searchType
      });
      return response;
    } catch (error) {
      console.error('Error downloading search results:', error);
      throw error;
    }
  },

  // Download multiple block outputs
  downloadMultipleOutputs: async (blockOutputs) => {
    try {
      const response = await downloadApi.post('/multi-download', {
        block_outputs: blockOutputs
      });
      return response;
    } catch (error) {
      console.error('Error downloading multiple outputs:', error);
      throw error;
    }
  },

  // Helper function to handle file download
  handleFileDownload: (response) => {
    if (response && response.data) {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `download_${Date.now()}`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  },
  
  multiDownload: async ({ items }) => {
    try {
      console.log('Multi-download items:', items);
      const r = await downloadApi.post(
        '/download-multiple',
        { items }
      );
      // create a URL for the blob
      const blobUrl = window.URL.createObjectURL(new Blob([r.data], { type: 'application/zip' }));
      return { success: true, zipUrl: blobUrl };
    } catch (err) {
      console.error('Multi-download error:', err);
      return { success: false, error: err.message };
    }
  }
}; 