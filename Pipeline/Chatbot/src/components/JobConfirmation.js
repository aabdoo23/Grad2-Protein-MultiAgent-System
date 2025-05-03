import React, { useState, useEffect } from 'react';

const JobConfirmation = ({ job, onConfirm, onReject }) => {
  const [selectedModel, setSelectedModel] = useState("openfold");
  const [selectedSearchType, setSelectedSearchType] = useState("ncbi");
  const [jobWithModel, setJobWithModel] = useState(job);
  const [jobWithSearchType, setJobWithSearchType] = useState(job);

  // Check if this is a structure prediction job that needs model selection
  const isStructurePrediction = job.function_name === "predict_structure";
  const needsModelSelection = isStructurePrediction && 
    (!job.parameters.hasOwnProperty("model") || job.parameters.model === "");

  // Check if this is a BLAST search job that needs search type selection
  const isBlastSearch = job.function_name === "search_similarity";
  const needsSearchTypeSelection = isBlastSearch && 
    (!job.parameters.hasOwnProperty("search_type") || job.parameters.search_type === "");

  useEffect(() => {
    if (needsModelSelection) {
      // Create a new job object with the selected model
      const updatedJob = {
        ...job,
        parameters: {
          ...job.parameters,
          model: selectedModel
        }
      };
      setJobWithModel(updatedJob);
    }
  }, [selectedModel, job, needsModelSelection]);

  useEffect(() => {
    if (needsSearchTypeSelection) {
      // Create a new job object with the selected search type
      const updatedJob = {
        ...job,
        parameters: {
          ...job.parameters,
          search_type: selectedSearchType
        }
      };
      setJobWithSearchType(updatedJob);
    }
  }, [selectedSearchType, job, needsSearchTypeSelection]);

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  const handleSearchTypeChange = (e) => {
    setSelectedSearchType(e.target.value);
  };

  const handleConfirm = () => {
    // Pass the job with the selected model if it's a structure prediction
    if (needsModelSelection) {
      onConfirm(job.id, jobWithModel);
    } else if (needsSearchTypeSelection) {
      onConfirm(job.id, jobWithSearchType);
    } else {
      onConfirm(job.id, null);
    }
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-xl px-4 py-2 bg-[#233c48] text-white">
        <div className="font-medium mb-2">{job.title}</div>
        <div className="text-sm text-gray-300 mb-3">{job.description}</div>
        
        {needsModelSelection && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Select structure prediction model:
            </label>
            <select 
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            >
              <option value="openfold">OpenFold - Most accurate and fast (~30 sec)</option>
              <option value="alphafold2">AlphaFold2 - Accurate but slow (~6 min)</option>
              <option value="esm">ESMFold - Least accurate but fastest (~10 sec)</option>
            </select>
          </div>
        )}

        {needsSearchTypeSelection && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Select sequence similarity search method:
            </label>
            <select
              value={selectedSearchType}
              onChange={handleSearchTypeChange}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            >
              <option value="colabfold">ColabFold MSA - Fast, modern MSA search(~20 sec)</option>
              <option value="ncbi">NCBI BLAST - Standard, comprehensive search(~3 min)</option>
              <option value="local">Local BLAST - Custom database search(~1 min)</option>
            </select>
          </div>
        )}
        
        <div className="flex gap-2">
          <button 
            onClick={handleConfirm}
            className="px-3 py-1 bg-[#13a4ec] text-white rounded-lg text-sm hover:bg-[#0f8fd1]"
          >
            Confirm
          </button>
          <button 
            onClick={() => onReject(job.id)}
            className="px-3 py-1 bg-[#233c48] text-white border border-[#13a4ec] rounded-lg text-sm hover:bg-[#2a4a5a]"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobConfirmation; 