import React, { useState, useEffect } from 'react';

const JobConfirmation = ({ job, onConfirm, onReject }) => {
  // State for different job types
  const [selectedModel, setSelectedModel] = useState("openfold");
  const [selectedSearchType, setSelectedSearchType] = useState("colabfold");
  const [jobParameters, setJobParameters] = useState(job.parameters || {});

  // Check job type
  const isStructurePrediction = job.function_name === "predict_structure";
  const isBlastSearch = job.function_name === "search_similarity";

  // Model-specific parameters
  const [openfoldParams, setOpenfoldParams] = useState({
    selected_models: [1, 2, 3, 4, 5],
    relax_prediction: false
  });

  const [alphafold2Params, setAlphafold2Params] = useState({
    e_value: 0.0001,
    databases: ["small_bfd"],
    algorithm: "mmseqs2",
    iterations: 1,
    relax_prediction: false,
    structure_model_preset: "monomer",
    structure_models_to_relax: "all",
    num_predictions_per_model: 1,
    max_msa_sequences: 512,
    template_searcher: "hhsearch"
  });

  // Search type specific parameters
  const [ncbiParams, setNcbiParams] = useState({
    e_value: 0.0001,
    database: "nr"
  });

  const [colabfoldParams, setColabfoldParams] = useState({
    e_value: 0.0001,
    iterations: 1,
    databases: ["Uniref30_2302","PDB70_220313","colabfold_envdb_202108"],
    output_alignment_formats: ["fasta"]
  });

  const [localBlastParams, setLocalBlastParams] = useState({
    fasta_file: "",
    db_name: "",
    interpro_ids: []
  });

  useEffect(() => {
    if (isStructurePrediction) {
      const updatedJob = {
        ...job,
        parameters: {
          ...job.parameters,
          model: selectedModel,
          ...(selectedModel === "openfold" ? openfoldParams : {}),
          ...(selectedModel === "alphafold2" ? alphafold2Params : {})
        }
      };
      setJobParameters(updatedJob.parameters);
    } else if (isBlastSearch) {
      const updatedJob = {
        ...job,
        parameters: {
          ...job.parameters,
          search_type: selectedSearchType,
          ...(selectedSearchType === "ncbi" ? ncbiParams : {}),
          ...(selectedSearchType === "colabfold" ? colabfoldParams : {}),
          ...(selectedSearchType === "local" ? localBlastParams : {})
        }
      };
      setJobParameters(updatedJob.parameters);
    }
  }, [
    selectedModel,
    selectedSearchType,
    openfoldParams,
    alphafold2Params,
    ncbiParams,
    colabfoldParams,
    localBlastParams
  ]);

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  const handleSearchTypeChange = (e) => {
    setSelectedSearchType(e.target.value);
  };

  const handleParameterChange = (paramType, paramName, value) => {
    switch (paramType) {
      case "openfold":
        setOpenfoldParams(prev => ({ ...prev, [paramName]: value }));
        break;
      case "alphafold2":
        setAlphafold2Params(prev => ({ ...prev, [paramName]: value }));
        break;
      case "ncbi":
        setNcbiParams(prev => ({ ...prev, [paramName]: value }));
        break;
      case "colabfold":
        setColabfoldParams(prev => ({ ...prev, [paramName]: value }));
        break;
      case "local":
        setLocalBlastParams(prev => ({ ...prev, [paramName]: value }));
        break;
      default:
        setJobParameters(prev => ({ ...prev, [paramName]: value }));
    }
  };

  const handleConfirm = () => {
    onConfirm(job.id, { ...job, parameters: jobParameters });
  };

  const renderModelParameters = () => {
    if (selectedModel === "openfold") {
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Selected Models:
            </label>
            <input
              type="text"
              value={openfoldParams.selected_models.join(",")}
              onChange={(e) => handleParameterChange("openfold", "selected_models", e.target.value.split(",").map(Number))}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Relax Prediction:
            </label>
            <select
              value={openfoldParams.relax_prediction}
              onChange={(e) => handleParameterChange("openfold", "relax_prediction", e.target.value === "true")}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>
      );
    } else if (selectedModel === "alphafold2") {
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              E-value:
            </label>
            <input
              type="number"
              step="0.0001"
              value={alphafold2Params.e_value}
              onChange={(e) => handleParameterChange("alphafold2", "e_value", parseFloat(e.target.value))}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Algorithm:
            </label>
            <select
              value={alphafold2Params.algorithm}
              onChange={(e) => handleParameterChange("alphafold2", "algorithm", e.target.value)}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            >
              <option value="mmseqs2">MMSeqs2</option>
              <option value="jackhmmer">JackHMMer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Structure Model Preset:
            </label>
            <select
              value={alphafold2Params.structure_model_preset}
              onChange={(e) => handleParameterChange("alphafold2", "structure_model_preset", e.target.value)}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            >
              <option value="monomer">Monomer</option>
              <option value="multimer">Multimer</option>
            </select>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderSearchParameters = () => {
    if (selectedSearchType === "ncbi") {
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              E-value:
            </label>
            <input
              type="number"
              step="0.0001"
              value={ncbiParams.e_value}
              onChange={(e) => handleParameterChange("ncbi", "e_value", parseFloat(e.target.value))}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Database:
            </label>
            <select
              value={ncbiParams.database}
              onChange={(e) => handleParameterChange("ncbi", "database", e.target.value)}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            >
              <option value="nr">Non-redundant protein sequences (nr)</option>
              <option value="refseq_protein">Reference proteins (refseq_protein)</option>
              <option value="swissprot">Swiss-Prot protein sequences (swissprot)</option>
            </select>
          </div>
        </div>
      );
    } else if (selectedSearchType === "colabfold") {
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              E-value:
            </label>
            <input
              type="number"
              step="0.0001"
              value={colabfoldParams.e_value}
              onChange={(e) => handleParameterChange("colabfold", "e_value", parseFloat(e.target.value))}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Iterations:
            </label>
            <input
              type="number"
              value={colabfoldParams.iterations}
              onChange={(e) => handleParameterChange("colabfold", "iterations", parseInt(e.target.value))}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Databases:
            </label>
            {colabfoldParams.databases.map((database, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="checkbox"
                  checked={colabfoldParams.databases.includes(database)}
                  onChange={(e) => handleParameterChange("colabfold", "databases", e.target.value.split(","))}
                  className="mr-2"
                />
                <label className="text-sm text-gray-300">{database}</label>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (selectedSearchType === "local") {
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              FASTA File Path:
            </label>
            <input
              type="text"
              value={localBlastParams.fasta_file}
              onChange={(e) => handleParameterChange("local", "fasta_file", e.target.value)}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Database Name:
            </label>
            <input
              type="text"
              value={localBlastParams.db_name}
              onChange={(e) => handleParameterChange("local", "db_name", e.target.value)}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              InterPro IDs (comma-separated):
            </label>
            <input
              type="text"
              value={localBlastParams.interpro_ids.join(",")}
              onChange={(e) => handleParameterChange("local", "interpro_ids", e.target.value.split(","))}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-xl px-4 py-2" style={{
        backgroundColor: 'var(--color-secondary)',
        color: 'var(--color-textPrimary)'
      }}>
        <div className="font-medium mb-2">{job.title}</div>
        <div className="text-sm mb-3" style={{ color: 'var(--color-textSecondary)' }}>{job.description}</div>
        
        {isStructurePrediction && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
              Select structure prediction model:
            </label>
            <select 
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full p-2 rounded border focus:outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--color-tertiary)',
                color: 'var(--color-textPrimary)',
                borderColor: 'var(--color-border)',
                '&:focus': { borderColor: 'var(--color-accent)' }
              }}
            >
              <option value="openfold">OpenFold - Most accurate and fast (~30 sec)</option>
              <option value="alphafold2">AlphaFold2 - Accurate but slow (~6 min)</option>
              <option value="esm">ESMFold - Least accurate but fastest (~10 sec)</option>
            </select>
            {renderModelParameters()}
          </div>
        )}

        {isBlastSearch && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
              Select sequence similarity search method:
            </label>
            <select
              value={selectedSearchType}
              onChange={handleSearchTypeChange}
              className="w-full p-2 rounded border focus:outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--color-tertiary)',
                color: 'var(--color-textPrimary)',
                borderColor: 'var(--color-border)'
              }}
            >
              <option value="colabfold">ColabFold MSA - Fast, modern MSA search(~20 sec)</option>
              <option value="ncbi">NCBI BLAST - Standard, comprehensive search(~6 min)</option>
              <option value="local">Local BLAST - Custom database search(~1 min)</option>
            </select>
            {renderSearchParameters()}
          </div>
        )}
        
        <div className="flex gap-2">
          <button 
            onClick={handleConfirm}
            className="px-3 py-1 text-white rounded-lg text-sm transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-accentHover)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
          >
            Confirm
          </button>
          <button 
            onClick={() => onReject(job.id)}
            className="px-3 py-1 border rounded-lg text-sm transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-secondary)',
              color: 'var(--color-textPrimary)',
              borderColor: 'var(--color-accent)'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-tertiary)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-secondary)'}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobConfirmation; 