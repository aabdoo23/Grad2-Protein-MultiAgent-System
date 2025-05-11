import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import * as NGL from 'ngl';
import BlastResults from '../BlastResults';
import ResizableBlock from './ResizableBlock';
import FoldSeekResults from '../result-viewers/FoldSeekResults';
import SequenceGenerationResults from '../result-viewers/SequenceGenerationResults';
import { downloadService } from '../../services/api';

const JobBlock = ({
  block,
  blockType,
  onStartConnection,
  onCompleteConnection,
  onInputPortHover,
  onRunBlock,
  onUpdateParameters,
  blockOutput,
  isConnecting,
  onPositionUpdate,
  onResize,
  onDeleteBlock,
  connections
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [localParams, setLocalParams] = useState({});
  const nodeRef = useRef(null);
  const viewerRef = useRef(null);
  const contentRef = useRef(null);
  const [dimensions, setDimensions] = useState({
    width: block.width || 450,
    height: block.height || 300
  });

  // Model and search type states
  const [selectedModel, setSelectedModel] = useState("openfold");
  const [selectedSearchType, setSelectedSearchType] = useState("colabfold");

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
    databases: ["Uniref30_2302", "PDB70_220313", "colabfold_envdb_202108"],
    output_alignment_formats: ["fasta"]
  });

  const [localBlastParams, setLocalBlastParams] = useState({
    fasta_file: "",
    db_name: "",
    interpro_ids: []
  });

  // Sequence iterator state
  const [sequenceList, setSequenceList] = useState(block.parameters.sequences || []);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(block.parameters.currentIndex || 0);

  const viewerRefs = useRef({});
  const initViewer = (jobId, pdbPath) => {
    // if (!viewerRefs.current[jobId]) {
      const stage = new NGL.Stage(`viewer-${jobId}`, { backgroundColor: '#1a2b34' });
      viewerRefs.current[jobId] = stage;

      // Load and display the PDB structure
      const filename = pdbPath.split('\\').pop();
      stage.loadFile(`http://localhost:5000/pdb/${filename}`).then(component => {
        component.addRepresentation('cartoon', {
          color: '#13a4ec',
          roughness: 1.0,
          metalness: 0.0
        });
        component.autoView();
      });
    // }
  };

  // Update job parameters when model or search type changes
  useEffect(() => {
    if (blockType.id === "predict_structure") {
      const updatedParams = {
        model: selectedModel,
        ...(selectedModel === "openfold" ? openfoldParams : {}),
        ...(selectedModel === "alphafold2" ? alphafold2Params : {})
      };
      setLocalParams(updatedParams);
    } else if (blockType.id === "search_similarity") {
      const updatedParams = {
        search_type: selectedSearchType,
        ...(selectedSearchType === "ncbi" ? ncbiParams : {}),
        ...(selectedSearchType === "colabfold" ? colabfoldParams : {}),
        ...(selectedSearchType === "local" ? localBlastParams : {})
      };
      setLocalParams(updatedParams);
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

  // Update local parameters when block parameters change
  useEffect(() => {
    if (blockType.id === 'sequence_iterator') {
      setSequenceList(block.parameters.sequences || []);
      setCurrentSequenceIndex(block.parameters.currentIndex || 0);
    }
  }, [block.parameters, blockType.id]);

  // Handle parameter changes
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
      case "sequence_iterator":
        if (paramName === "sequences") {
          setSequenceList(value);
          setCurrentSequenceIndex(0); // Reset index when sequences change
        }
        break;
      default:
        setLocalParams(prev => ({ ...prev, [paramName]: value }));
    }
  };

  // Apply parameter changes
  const handleApplyParameters = () => {
    if (blockType.id === 'sequence_iterator') {
      onUpdateParameters({
        sequences: sequenceList,
        currentIndex: 0 // Reset index when applying new sequences
      });
    } else {
      onUpdateParameters(localParams);
    }
    setIsConfigOpen(false);
  };

  // Status colors
  const getStatusColor = () => {
    switch (block.status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Initialize NGL viewer for structure results
  useEffect(() => {
    if (isResultsOpen && blockOutput && blockOutput.pdb_file && viewerRef.current) {
      try {
        const stage = new NGL.Stage(viewerRef.current, { backgroundColor: '#1a2b34' });

        // Load and display the PDB structure
        const filename = blockOutput.pdb_file.split('\\').pop();
        stage.loadFile(`http://localhost:5000/pdb/${filename}`).then(component => {
          component.addRepresentation('cartoon', {
            color: '#13a4ec',
            roughness: 1.0,
            metalness: 0.0
          });
          component.autoView();
        });

        return () => {
          if (stage) {
            stage.dispose();
          }
        };
      } catch (error) {
        console.error('Error initializing NGL viewer:', error);
      }
    }
  }, [isResultsOpen, blockOutput]);

  // Format metric values
  const formatMetric = (value) => {
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  // Handle input port hover
  const handleInputPortHover = (inputType, isHovering) => {
    if (onInputPortHover) {
      onInputPortHover(block.id, inputType, isHovering);
    }
  };

  // Calculate content height
  const calculateContentHeight = () => {
    if (!contentRef.current) return 200;

    const baseHeight = 200; // Minimum height
    const contentHeight = contentRef.current.scrollHeight;
    const configHeight = isConfigOpen ? 300 : 0; // Approximate config panel height
    const resultsHeight = isResultsOpen ? 400 : 0; // Approximate results height

    return Math.max(baseHeight, contentHeight + configHeight + resultsHeight);
  };

  // Update dimensions when config or results state changes
  useEffect(() => {
    const newHeight = calculateContentHeight();
    setDimensions(prev => ({
      ...prev,
      height: newHeight
    }));
    if (onResize) {
      onResize(block.id, { width: dimensions.width, height: newHeight });
    }
  }, [isConfigOpen, isResultsOpen]);

  // Toggle results view
  const toggleResults = () => {
    setIsResultsOpen(!isResultsOpen);
  };

  // Toggle config view
  const toggleConfig = () => {
    setIsConfigOpen(!isConfigOpen);
  };

  // Handle position change
  const handleDragStop = (e, data) => {
    if (onPositionUpdate) {
      onPositionUpdate(block.id, { x: data.x, y: data.y });
    }
  };

  // Handle resize
  const handleResize = (newSize) => {
    setDimensions(newSize);
    if (onResize) {
      onResize(block.id, newSize);
    }
  };

  // Check if block has configurable options
  const hasConfigurableOptions = () => {
    return blockType.id === 'predict_structure' ||
      blockType.id === 'search_similarity' ||
      blockType.id === 'sequence_iterator';
  };

  const renderResults = () => {
    if (!blockOutput) return null;

    const renderDownloadButton = () => {
      if (!blockOutput) return null;

      const handleDownload = async () => {
        try {
          let response;

          switch (blockType.id) {
            case 'generate_protein':
            case 'sequence_iterator':
              response = await downloadService.downloadSequence(
                blockOutput.sequence,
                `sequence_${block.id}`
              );
              break;

            case 'predict_structure':
              response = await downloadService.downloadStructure(blockOutput.pdb_file);
              break;

            case 'search_similarity':
            case 'search_structure':
              response = await downloadService.downloadSearchResults(
                blockOutput.results,
                blockType.id === 'search_similarity' ? 'similarity' : 'structure'
              );
              break;

            default:
              console.error('Unknown block type for download:', blockType.id);
              return;
          }

          downloadService.handleFileDownload(response);
        } catch (error) {
          console.error('Error downloading file:', error);
          if (error.response) {
            console.error('Error response:', error.response.data);
          }
        }
      };

      return (
        <button
          onClick={handleDownload}
          className="mt-2 px-3 py-1 bg-[#13a4ec] text-white rounded text-sm hover:bg-[#0f8fd1]"
        >
          Download Results
        </button>
      );
    };

    switch (blockType.id) {
      case 'sequence_iterator':
        return (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Sequence Iterator Results</h3>
              {blockOutput.progress && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>Progress: {blockOutput.progress.completed} of {blockOutput.progress.total} sequences</span>
                    <span>{blockOutput.progress.remaining} remaining</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${(blockOutput.progress.completed / blockOutput.progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <div className="bg-[#1a2a33] p-3 rounded-lg">
                <div className="text-sm text-gray-300 mb-2">{blockOutput.info}</div>
                <div className="font-mono text-sm text-white whitespace-pre-wrap break-all">
                  {blockOutput.sequence}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              {renderDownloadButton()}
            </div>
          </div>
        );

      case 'generate_protein':
        return (
          <div className="bg-[#1a2b34] rounded-lg p-3">
            <SequenceGenerationResults sequence={blockOutput.sequence} info={blockOutput.info} />
            {renderDownloadButton()}
          </div>
        );

      case 'predict_structure':
        return (
          <div className="bg-[#1a2b34] rounded-lg p-3">
            <>
              <div
                id={`viewer-${blockOutput.id}`}
                className="w-full h-[300px] rounded-lg mb-3 bg-[#1a2b34]"
                ref={(el) => {
                  if (el) {
                    initViewer(blockOutput.id, blockOutput.pdb_file);
                  }
                }}
              />
              {blockOutput.metrics && (
                <div className="grid grid-cols-2 gap-3 bg-[#1a2b34] p-3 rounded-lg">
                  {Object.entries(blockOutput.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-300 text-sm capitalize">{key}:</span>
                      <span className="text-[#13a4ec] text-sm font-medium">{formatMetric(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>

            {renderDownloadButton()}
          </div>
        );

      case 'search_similarity':
        return blockOutput.results ? (
          <div className="flex flex-col bg-[#1a2b34] rounded-lg ">
            <div className="flex justify-center">
              {renderDownloadButton()}
            </div>
            <BlastResults results={blockOutput.results} />
          </div>
        ) : null;

      case 'search_structure':
        return blockOutput.results ? (
          <div className="bg-[#1a2b34] rounded-lg p-3">
            <div className="text-white text-sm mb-2">Search Results:</div>
            <FoldSeekResults results={blockOutput.results} originalPdbPath={blockOutput.pdb_file} />
            {renderDownloadButton()}
          </div>
        ) : null;

      default:
        return null;
    }
  };

  // Config panel for setting parameters
  const renderConfigPanel = () => {
    if (!isConfigOpen) return null;

    let parameterInputs = null;

    switch (blockType.id) {
      case 'sequence_iterator':
        parameterInputs = (
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Enter sequences (one per line):
              </label>
              <textarea
                value={sequenceList.join('\n')}
                onChange={(e) => {
                  const sequences = e.target.value.split('\n').filter(s => s.trim());
                  setSequenceList(sequences);
                  setLocalParams({ sequences });
                }}
                className="w-full h-32 p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec] font-mono text-sm"
                placeholder="Enter sequences here, one per line..."
              />
            </div>
          </div>
        );
        break;

      case 'predict_structure':
        parameterInputs = (
          <>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select structure prediction model:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
              >
                <option value="openfold">OpenFold - Most accurate and fast (~30 sec)</option>
                <option value="alphafold2">AlphaFold2 - Accurate but slow (~6 min)</option>
                <option value="esm">ESMFold - Least accurate but fastest (~10 sec)</option>
              </select>
            </div>
            {selectedModel === "openfold" && (
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
            )}
            {selectedModel === "alphafold2" && (
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
            )}
          </>
        );
        break;

      case 'search_similarity':
        parameterInputs = (
          <>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select sequence similarity search method:
              </label>
              <select
                value={selectedSearchType}
                onChange={(e) => setSelectedSearchType(e.target.value)}
                className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
              >
                <option value="colabfold">ColabFold MSA - Fast, modern MSA search(~20 sec)</option>
                <option value="ncbi">NCBI BLAST - Standard, comprehensive search(~6 min)</option>
                <option value="local">Local BLAST - Custom database search(~1 min)</option>
              </select>
            </div>
            {selectedSearchType === "ncbi" && (
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
            )}
            {selectedSearchType === "colabfold" && (
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
            )}
            {selectedSearchType === "local" && (
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
            )}
          </>
        );
        break;

      default:
        parameterInputs = (
          <div className="text-sm text-gray-300">
            No configurable parameters available.
          </div>
        );
    }

    return (
      <div className="bg-[#233c48] p-4 rounded-lg shadow-inner border border-[#344854] mt-2 mb-2">
        <h4 className="text-white font-bold text-sm mb-3">Configure Parameters</h4>
        {parameterInputs}
        <div className="flex justify-end mt-3">
          <button
            onClick={() => setIsConfigOpen(false)}
            className="px-3 py-1 mr-2 bg-[#233c48] text-white border border-[#13a4ec] rounded text-sm hover:bg-[#2a4a5a]"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyParameters}
            className="px-3 py-1 bg-[#13a4ec] text-white rounded text-sm hover:bg-[#0f8fd1]"
          >
            Apply
          </button>
        </div>
      </div>
    );
  };

  // Handle running the block
  const handleRunBlock = () => {
    if (blockType.id === 'sequence_iterator') {
      if (sequenceList.length === 0) {
        // No sequences to iterate through
        return;
      }

      // Get the current sequence
      const currentSequence = sequenceList[currentSequenceIndex];

      // Update the output
      onRunBlock({
        sequence: currentSequence,
        info: `Sequence ${currentSequenceIndex + 1} of ${sequenceList.length}`
      });

      // Move to the next sequence for the next run
      setCurrentSequenceIndex((prevIndex) =>
        prevIndex + 1 >= sequenceList.length ? 0 : prevIndex + 1
      );
    } else {
      onRunBlock();
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={block.position}
      bounds="parent"
      handle=".drag-handle"
      onStop={handleDragStop}
    >
      <div
        ref={nodeRef}
        className="absolute"
      >
        <ResizableBlock
          width={dimensions.width}
          height={dimensions.height}
          onResize={handleResize}
        >
          <div
            className="rounded shadow-md"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: blockType.color
            }}
          >
            {/* Block header */}
            <div className="drag-handle p-2 rounded-t cursor-move flex justify-between items-center">
              <h4 className="text-white font-bold text-sm">{blockType.name}</h4>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <button
                  onClick={() => onDeleteBlock(block.id)}
                  className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded"
                  title="Delete block"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Block content */}
            <div
              ref={contentRef}
              className="p-2 bg-opacity-20 bg-black h-[calc(100%-40px)] overflow-auto"
            >
              {/* Input ports on the left side */}
              <div className="mb-2">
                {blockType.inputs.map((input, index) => (
                  <div
                    key={`input-${input}`}
                    className="flex items-center my-3"
                  >
                    <div
                      className={`w-4 h-4 rounded-full cursor-pointer border-2 flex items-center justify-center relative
                        ${isConnecting ? 'border-white hover:bg-white hover:bg-opacity-30' : 'border-gray-400'}
                      `}
                      style={{ marginLeft: 0 }}
                      onClick={() => onCompleteConnection(block.id, input)}
                      onMouseEnter={() => handleInputPortHover(input, true)}
                      onMouseLeave={() => handleInputPortHover(input, false)}
                    >
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      
                      {/* Show connection count badge for multi_download block */}
                      {blockType.id === 'multi_download' && connections && connections[block.id] && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {Object.keys(connections[block.id] || {}).length}
                        </div>
                      )}
                    </div>
                    <span className="text-white text-xs ml-2">
                      {input}
                      {blockType.id === 'multi_download' && " (multiple)"}
                    </span>
                  </div>
                ))}
              </div>
              {/* Output ports on the right side */}
              <div className="mt-2">
                {blockType.outputs.map((output, index) => (
                  <div
                    key={`output-${output}`}
                    className="flex items-center justify-end my-3"
                  >
                    <span className="text-white text-xs mr-2">{output}</span>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white cursor-pointer hover:bg-white hover:bg-opacity-30 flex items-center justify-center"
                      style={{ marginRight: 0 }}
                      onClick={() => onStartConnection(block.id, output)}
                    >
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Block actions */}
              <div className="flex flex-col justify-between mt-2 mb-2 space-y-2">
                {hasConfigurableOptions() && (
                  <button
                    onClick={toggleConfig}
                    className="px-2 py-1 bg-white bg-opacity-20 text-white rounded w-full text-xs hover:bg-opacity-30"
                  >
                    {isConfigOpen ? 'Close Config' : 'Configure'}
                  </button>
                )}
                <button
                  onClick={handleRunBlock}
                  disabled={block.status === 'running'}
                  className="px-2 py-1 bg-white bg-opacity-20 text-white rounded text-xs hover:bg-opacity-30 w-full disabled:opacity-50"
                >
                  {block.status === 'running' ? 'Running...' : 'Run'}
                </button>
              </div>

              {isConfigOpen && (
                <div className="w-full">
                  {renderConfigPanel()}
                </div>
              )}

              {/* View results button */}
              {block.status === 'completed' && blockOutput && (
                <div className="mt-1 mb-1">
                  <button
                    onClick={toggleResults}
                    className="w-full px-2 py-1 bg-white bg-opacity-20 text-white rounded text-xs hover:bg-opacity-30"
                  >
                    {isResultsOpen ? 'Hide Results' : 'View Results'}
                  </button>
                </div>
              )}

              {/* Results section */}
              {isResultsOpen && blockOutput && (
                <div className="mt-2 border-t border-[#344854] pt-2">
                  {renderResults()}
                </div>
              )}
            </div>
          </div>
        </ResizableBlock>
      </div>
    </Draggable>
  );
};

export default JobBlock; 