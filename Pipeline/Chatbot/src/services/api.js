import axios from 'axios';
import { BASE_URL } from '../config/config';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 900000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Download API with blob response type
const downloadApi = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  responseType: 'blob'
});

// File upload API with multipart/form-data
const uploadApi = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
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
  },

  // Read FASTA file
  readFastaFile: async (filePath) => {
    try {
      const response = await api.post('/read-fasta-file', { file_path: filePath });
      return response.data;
    } catch (error) {
      console.error('Error reading FASTA file:', error);
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

  // Download files as ZIP
  downloadFilesAsZip: async (files) => {
    try {
      const response = await downloadApi.post('/download-files-zip', {
        files
      });
      return response;
    } catch (error) {
      console.error('Error downloading files as ZIP:', error);
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
  
  multiDownload: async ({ items, downloadSettings }) => {
    try {
      console.log('Multi-download items:', items);
      const r = await downloadApi.post(
        '/download-multiple',
        { items, downloadSettings }
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

export const uploadService = {
  // Upload file
  uploadFile: async (formData) => {
    try {
      const response = await uploadApi.post('/upload-file', formData);
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // Upload FASTA file
  uploadFastaFile: async (formData) => {
    try {
      const response = await uploadApi.post('/upload-file', formData);
      if (response.data.success) {
        // Read the FASTA file content
        const fastaResponse = await api.post('/read-fasta-file', {
          file_path: response.data.filePath
        });
        return {
          ...response.data,
          sequences: fastaResponse.data.sequences
        };
      }
      return response.data;
    } catch (error) {
      console.error('Error uploading FASTA file:', error);
      throw error;
    }
  }
};

export const fileService = {
  // Get file content
  getFileContent: async (filePath) => {
    try {
      const response = await api.get(`/file-content/${encodeURIComponent(filePath)}`);
      return response.data;
    } catch (error) {
      console.error('Error getting file content:', error);
      throw error;
    }
  },

  // Save file
  saveFile: async (filePath, content) => {
    try {
      const response = await api.post('/save-file', {
        file_path: filePath,
        content
      });
      return response.data;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }
};

export const blastService = {
  // Build BLAST database
  buildDatabase: async (params) => {
    try {
      const response = await api.post('/build-blast-db', params);
      return response.data;
    } catch (error) {
      console.error('Error building BLAST database:', error);
      throw error;
    }
  },

  // Get active databases
  getActiveDatabases: async () => {
    try {
      const response = await api.get('/active-blast-dbs');
      return response.data;
    } catch (error) {
      console.error('Error getting active BLAST databases:', error);
      throw error;
    }
  },

  // Get Pfam data
  getPfamData: async (pfamIds) => {
    try {
      const response = await api.post('/get-pfam-data', { pfam_ids: pfamIds });
      return response.data;
    } catch (error) {
      console.error('Error getting Pfam data:', error);
      throw error;
    }
  }
};