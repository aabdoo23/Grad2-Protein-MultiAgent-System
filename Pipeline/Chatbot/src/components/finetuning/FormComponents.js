import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDownload, 
  faCopy, 
  faExpand, 
  faCompress,
  faEye,
  faEyeSlash,
  faFileText,
  faDna
} from '@fortawesome/free-solid-svg-icons';
import { FormField, Button, Card } from './CommonComponents';

// Storage utility for generation history
const GENERATION_HISTORY_KEY = 'protein_generation_history';

const saveGenerationToHistory = (generationResult) => {
  try {
    const history = JSON.parse(localStorage.getItem(GENERATION_HISTORY_KEY) || '[]');
    const newEntry = {
      ...generationResult,
      timestamp: new Date().toISOString(),
      id: generationResult.generation_id || Date.now().toString()
    };
    
    // Keep only the last 50 generations
    const updatedHistory = [newEntry, ...history].slice(0, 50);
    localStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(updatedHistory));
    
    return updatedHistory;
  } catch (error) {
    console.error('Failed to save generation to history:', error);
    return [];
  }
};

const getGenerationHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(GENERATION_HISTORY_KEY) || '[]');
  } catch (error) {
    console.error('Failed to load generation history:', error);
    return [];
  }
};

const clearGenerationHistory = () => {
  localStorage.removeItem(GENERATION_HISTORY_KEY);
};

// Component to display generated protein sequences
export const GeneratedSequencesDisplay = ({ 
  generationResult, 
  onClose,
  className = ""
}) => {
  const [expandedSequences, setExpandedSequences] = useState(new Set());
  const [showAllSequences, setShowAllSequences] = useState(false);

  if (!generationResult?.generated_sequences) {
    return null;
  }

  const { generated_sequences, generation_params, model_name, model_dir, prompt } = generationResult;

  const toggleSequenceExpansion = (sequenceId) => {
    const newExpanded = new Set(expandedSequences);
    if (newExpanded.has(sequenceId)) {
      newExpanded.delete(sequenceId);
    } else {
      newExpanded.add(sequenceId);
    }
    setExpandedSequences(newExpanded);
  };

  const copySequence = (sequence) => {
    navigator.clipboard.writeText(sequence);
    // You could add a toast notification here
    alert('Sequence copied to clipboard!');
  };

  const downloadSequences = (format = 'fasta') => {
    let content = '';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    if (format === 'fasta') {
      generated_sequences.forEach((seq, index) => {
        const cleanSequence = seq.generated_text.replace(/\n/g, '').replace(prompt, '');
        content += `>Generated_Sequence_${seq.sequence_id || index + 1}_${model_name}\n`;
        content += `${cleanSequence}\n\n`;
      });
    } else if (format === 'json') {
      content = JSON.stringify(generationResult, null, 2);
    } else if (format === 'txt') {
      content = `Generated Protein Sequences\n`;
      content += `=========================\n\n`;
      content += `Model: ${model_name}\n`;
      content += `Model Directory: ${model_dir}\n`;
      content += `Prompt: ${prompt}\n`;
      content += `Generated: ${new Date().toISOString()}\n`;
      content += `Parameters: ${JSON.stringify(generation_params, null, 2)}\n\n`;
      
      generated_sequences.forEach((seq, index) => {
        const cleanSequence = seq.generated_text.replace(/\n/g, '').replace(prompt, '');
        content += `Sequence ${seq.sequence_id || index + 1}:\n`;
        content += `${cleanSequence}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated_sequences_${timestamp}.${format === 'json' ? 'json' : format === 'fasta' ? 'fasta' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const displayedSequences = showAllSequences ? generated_sequences : generated_sequences.slice(0, 5);

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faDna} className="text-green-400" />
            <span>Generated Protein Sequences ({generated_sequences.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => downloadSequences('fasta')}
              size="sm"
              variant="secondary"
            >
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4 mr-1" />
              FASTA
            </Button>
            <Button
              onClick={() => downloadSequences('json')}
              size="sm"
              variant="secondary"
            >
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4 mr-1" />
              JSON
            </Button>
            <Button
              onClick={() => downloadSequences('txt')}
              size="sm"
              variant="secondary"
            >
              <FontAwesomeIcon icon={faDownload} className="w-4 h-4 mr-1" />
              TXT
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                size="sm"
                variant="secondary"
              >
                ×
              </Button>
            )}
          </div>
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        {/* Generation Info */}
        <div className="bg-[#1a2d35] rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Generation Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Model:</span>
              <span className="text-white ml-2">{model_name}</span>
            </div>
            <div>
              <span className="text-gray-400">Sequences:</span>
              <span className="text-white ml-2">{generated_sequences.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Max Tokens:</span>
              <span className="text-white ml-2">{generation_params?.max_new_tokens || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Temperature:</span>
              <span className="text-white ml-2">{generation_params?.temperature || 'N/A'}</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-gray-400">Prompt:</span>
            <div className="text-white ml-2 font-mono text-xs bg-[#233c48] p-2 rounded mt-1">
              {prompt}
            </div>
          </div>
        </div>

        {/* Sequences */}
        <div className="space-y-3">
          {displayedSequences.map((seq, index) => {
            const isExpanded = expandedSequences.has(seq.sequence_id || index);
            const cleanSequence = seq.generated_text.replace(/\n/g, '').replace(prompt, '');
            const displaySequence = isExpanded ? cleanSequence : cleanSequence.slice(0, 100) + (cleanSequence.length > 100 ? '...' : '');
            
            return (
              <div key={seq.sequence_id || index} className="bg-[#1a2d35] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-white font-medium">
                    Sequence {seq.sequence_id || index + 1}
                    <span className="text-gray-400 ml-2 text-sm">({cleanSequence.length} amino acids)</span>
                  </h5>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => copySequence(cleanSequence)}
                      size="xs"
                      variant="secondary"
                    >
                      <FontAwesomeIcon icon={faCopy} className="w-3 h-3" />
                    </Button>
                    {cleanSequence.length > 100 && (
                      <Button
                        onClick={() => toggleSequenceExpansion(seq.sequence_id || index)}
                        size="xs"
                        variant="secondary"
                      >
                        <FontAwesomeIcon 
                          icon={isExpanded ? faCompress : faExpand} 
                          className="w-3 h-3" 
                        />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="font-mono text-xs bg-[#233c48] p-3 rounded border border-gray-600 overflow-x-auto">
                  <div className="text-green-400 whitespace-pre-wrap break-all">
                    {displaySequence}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More/Less Button */}
        {generated_sequences.length > 5 && (
          <div className="text-center">
            <Button
              onClick={() => setShowAllSequences(!showAllSequences)}
              variant="secondary"
              size="sm"
            >
              <FontAwesomeIcon 
                icon={showAllSequences ? faEyeSlash : faEye} 
                className="w-4 h-4 mr-2" 
              />
              {showAllSequences 
                ? 'Show Less' 
                : `Show All (${generated_sequences.length - 5} more)`
              }
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export const FinetuneForm = ({ 
  baseModels, 
  onSubmit, 
  isLoading = false, 
  isServerOnline = true 
}) => {
  const [formData, setFormData] = useState({
    model: '',
    fastaFile: null,
    fastaContent: '',
    use_lora: true,
    use_optuna: true,
    n_trials: 5,
    learning_rate: 5e-5,
    per_device_train_batch_size: 4,
    num_train_epochs: 2,
    weight_decay: 0.01,
    optuna_lr_min: 1e-7,
    optuna_lr_max: 1e-6,
    optuna_batch_sizes: [4, 8],
    optuna_epochs_min: 1,
    optuna_epochs_max: 3,
    optuna_weight_decay_min: 0.0,
    optuna_weight_decay_max: 0.2
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.model || (!formData.fastaFile && !formData.fastaContent)) {
      alert('Please select a model and provide FASTA data (either upload a file or paste content)');
      return;
    }

    // Create the submission data
    const submissionData = { ...formData };
    
    // If no file was uploaded but content was pasted, create a file from the content
    if (!formData.fastaFile && formData.fastaContent) {
      const blob = new Blob([formData.fastaContent], { type: 'text/plain' });
      submissionData.fastaFile = new File([blob], 'sequences.fasta', { type: 'text/plain' });
    }

    onSubmit(submissionData);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        fastaFile: file,
        fastaContent: '' // Clear text content when file is uploaded
      }));
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card title="Start Fine-tuning Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Selection */}
        <FormField label="Base Model" required>
          <select
            value={formData.model}
            onChange={(e) => updateField('model', e.target.value)}
            className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="">Select a base model</option>
            {baseModels.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </FormField>

        {/* FASTA Content */}
        <FormField 
          label="Training Data (FASTA format)" 
          required
          description="Upload a FASTA file or paste your sequences directly"
        >
          <div className="space-y-2">
            <input
              type="file"
              accept=".fasta,.fa,.fna,.ffn,.faa,.frn"
              onChange={handleFileUpload}
              className="text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-[#233c48] file:text-gray-300 hover:file:bg-[#2a4653]"
            />
            {formData.fastaFile && (
              <p className="text-sm text-green-400">
                File selected: {formData.fastaFile.name}
              </p>
            )}
            <textarea
              value={formData.fastaContent}
              onChange={(e) => updateField('fastaContent', e.target.value)}
              className="w-full h-32 bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
              placeholder=">protein1&#10;MKVLIVLLQKTSR...&#10;>protein2&#10;MQIFVKTLTGKTI..."
              disabled={!!formData.fastaFile}
            />
            {formData.fastaFile && (
              <p className="text-xs text-gray-400">
                Text area disabled - file upload takes priority
              </p>
            )}
          </div>
        </FormField>

        {/* Advanced Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Training Parameters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField 
              label="Use LoRA"
              description="LoRA fine-tuning is faster and uses less memory"
            >
              <select
                value={formData.use_lora.toString()}
                onChange={(e) => updateField('use_lora', e.target.value === 'true')}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="true">Yes (Recommended)</option>
                <option value="false">No (Full Fine-tuning)</option>
              </select>
            </FormField>

            <FormField 
              label="Use Optuna Optimization"
              description="Automatically find best hyperparameters"
            >
              <select
                value={formData.use_optuna.toString()}
                onChange={(e) => updateField('use_optuna', e.target.value === 'true')}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="true">Yes (Recommended)</option>
                <option value="false">No (Use manual parameters)</option>
              </select>
            </FormField>
          </div>

          {formData.use_optuna && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField 
                label="Number of Trials"
                description="More trials may improve results but take longer"
              >
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.n_trials}
                  onChange={(e) => updateField('n_trials', parseInt(e.target.value))}
                  className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </FormField>

              <FormField 
                label="Learning Rate Range"
                description="Min to Max learning rate for search"
              >
                <div className="space-y-2">
                  <input
                    type="number"
                    step="1e-7"
                    min="1e-9"
                    max="1e-3"
                    value={formData.optuna_lr_min}
                    onChange={(e) => updateField('optuna_lr_min', parseFloat(e.target.value))}
                    placeholder="Min (e.g., 1e-7)"
                    className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    step="1e-7"
                    min="1e-8"
                    max="1e-2"
                    value={formData.optuna_lr_max}
                    onChange={(e) => updateField('optuna_lr_max', parseFloat(e.target.value))}
                    placeholder="Max (e.g., 1e-6)"
                    className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </FormField>

              <FormField 
                label="Epoch Range"
                description="Min to Max epochs for search"
              >
                <div className="space-y-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.optuna_epochs_min}
                    onChange={(e) => updateField('optuna_epochs_min', parseInt(e.target.value))}
                    placeholder="Min epochs"
                    className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.optuna_epochs_max}
                    onChange={(e) => updateField('optuna_epochs_max', parseInt(e.target.value))}
                    placeholder="Max epochs"
                    className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </FormField>
            </div>
          )}

          {!formData.use_optuna && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Learning Rate">
                <input
                  type="number"
                  step="1e-5"
                  min="1e-7"
                  max="1e-3"
                  value={formData.learning_rate}
                  onChange={(e) => updateField('learning_rate', parseFloat(e.target.value))}
                  className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </FormField>

              <FormField label="Batch Size">
                <input
                  type="number"
                  min="1"
                  max="32"
                  value={formData.per_device_train_batch_size}
                  onChange={(e) => updateField('per_device_train_batch_size', parseInt(e.target.value))}
                  className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </FormField>

              <FormField label="Epochs">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.num_train_epochs}
                  onChange={(e) => updateField('num_train_epochs', parseInt(e.target.value))}
                  className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </FormField>

              <FormField label="Weight Decay">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.5"
                  value={formData.weight_decay}
                  onChange={(e) => updateField('weight_decay', parseFloat(e.target.value))}
                  className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </FormField>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || !isServerOnline}
          loading={isLoading}
          size="md"
          className="w-full sm:w-auto"
        >
          {isLoading ? 'Starting Fine-tuning...' : 'Start Fine-tuning'}
        </Button>
        
        {!isServerOnline && (
          <p className="text-red-400 text-sm">
            Fine-tuning server is offline. Please check connection.
          </p>
        )}
      </form>
    </Card>
  );
};

export const GenerateForm = ({ 
  baseModels, 
  userModels = [],
  finetunedModels = [],
  onSubmit, 
  isLoading = false, 
  isServerOnline = true,
  generationResult = null,
  onClearResults = null
}) => {
  const [modelType, setModelType] = useState('base'); // 'base' or 'finetuned'
  const [formData, setFormData] = useState({
    prompt: '<|startoftext|>',
    model_name: '',
    model_dir: '',
    max_new_tokens: 200,
    num_return_sequences: 1,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 50
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.prompt || !formData.model_name) {
      alert('Please fill in all required fields: prompt and model');
      return;
    }

    if (modelType === 'finetuned' && !formData.model_dir) {
      alert('Please select a fine-tuned model directory');
      return;
    }

    // Add model_type to form data for the hook to handle properly
    const submissionData = {
      ...formData,
      model_type: modelType
    };

    onSubmit(submissionData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModelTypeChange = (type) => {
    setModelType(type);
    // Reset model selection when switching types
    updateField('model_name', '');
    updateField('model_dir', '');
  };

  return (
    <div className="space-y-6">
      <Card title="Generate Protein Sequence">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Model Type Selection */}
          <FormField 
            label="Model Type" 
            required
            description="Choose between base models or your fine-tuned models"
          >
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="modelType"
                  value="base"
                  checked={modelType === 'base'}
                  onChange={() => handleModelTypeChange('base')}
                  className="mr-2 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-white">Base Model</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="modelType"
                  value="finetuned"
                  checked={modelType === 'finetuned'}
                  onChange={() => handleModelTypeChange('finetuned')}
                  className="mr-2 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-white">Fine-tuned Model</span>
              </label>
            </div>
          </FormField>

          {/* Prompt */}
          <FormField 
            label="Prompt" 
            required
            description="Starting text for sequence generation (e.g., '<|startoftext|>' or protein prefix)"
          >
            <input
              type="text"
              value={formData.prompt}
              onChange={(e) => updateField('prompt', e.target.value)}
              className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="<|startoftext|>"
              required
            />
          </FormField>

          {/* Model Selection based on type */}
          {modelType === 'base' ? (
            <FormField 
              label="Base Model" 
              required
              description="Choose a pre-trained protein language model"
            >
              <select
                value={formData.model_name}
                onChange={(e) => updateField('model_name', e.target.value)}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select base model</option>
                {baseModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </FormField>
          ) : (
            <div className="space-y-4">
              <FormField 
                label="Fine-tuned Model" 
                required
                description="Choose from your trained models"
              >
                <select
                  value={formData.model_dir}
                  onChange={(e) => {
                    const selectedModel = finetunedModels.find(m => m.model_path === e.target.value);
                    if (selectedModel) {
                      updateField('model_dir', selectedModel.model_path);
                      updateField('model_name', selectedModel.base_model_name);
                    }
                  }}
                  className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select fine-tuned model</option>
                  {finetunedModels.map((model) => (
                    <option key={model.id} value={model.model_path}>
                      {model.model_name} (based on {model.base_model_name})
                    </option>
                  ))}
                </select>
              </FormField>

              {finetunedModels.length === 0 && (
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm">
                    <FontAwesomeIcon icon={faFileText} className="mr-2" />
                    No fine-tuned models found. Complete a fine-tuning job first to use custom models.
                  </p>
                </div>
              )}

              {/* Fallback to job selection for backwards compatibility */}
              {userModels.length > 0 && (
                <FormField 
                  label="Or Select from Recent Jobs" 
                  description="Choose from recently completed fine-tuning jobs"
                >
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const selectedJob = userModels.find(job => job.job_id === e.target.value);
                        if (selectedJob && selectedJob.result?.model_dir) {
                          updateField('model_dir', selectedJob.result.model_dir);
                          // Try to extract base model from job data
                          const baseModel = selectedJob.hyperparameters?.model || 
                                          selectedJob.result?.finetuned_model_name?.split('-')[1] || 
                                          'progen2-small';
                          updateField('model_name', baseModel);
                        }
                      }
                    }}
                    className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select from completed jobs...</option>
                    {userModels
                      .filter(job => job.status === 'completed' && job.result?.model_dir)
                      .map((job) => (
                        <option key={job.job_id} value={job.job_id}>
                          Job {job.job_id.slice(0, 8)}... - {new Date(job.created_at).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
                </FormField>
              )}
            </div>
          )}

          {/* Generation Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField 
              label="Max New Tokens"
              description="Maximum number of tokens to generate"
            >
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.max_new_tokens}
                onChange={(e) => updateField('max_new_tokens', parseInt(e.target.value))}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </FormField>

            <FormField 
              label="Number of Sequences"
              description="How many sequences to generate"
            >
              <input
                type="number"
                min="1"
                max="100"
                value={formData.num_return_sequences}
                onChange={(e) => updateField('num_return_sequences', parseInt(e.target.value))}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </FormField>

            <FormField 
              label="Temperature"
              description="Sampling temperature (higher = more random)"
            >
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="2.0"
                value={formData.temperature}
                onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </FormField>

            <FormField 
              label="Top-p"
              description="Nucleus sampling parameter"
            >
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="1.0"
                value={formData.top_p}
                onChange={(e) => updateField('top_p', parseFloat(e.target.value))}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </FormField>

            <FormField 
              label="Top-k"
              description="Top-k sampling parameter"
            >
              <input
                type="number"
                min="1"
                max="100"
                value={formData.top_k}
                onChange={(e) => updateField('top_k', parseInt(e.target.value))}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </FormField>
          </div>

          {/* Model Info Display */}
          {modelType === 'base' && formData.model_name && (
            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                <FontAwesomeIcon icon={faDna} className="mr-2" />
                Using base model: <strong>{formData.model_name}</strong>
              </p>
            </div>
          )}

          {modelType === 'finetuned' && formData.model_dir && (
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
              <p className="text-green-400 text-sm">
                <FontAwesomeIcon icon={faDna} className="mr-2" />
                Using fine-tuned model: <strong>{formData.model_name}</strong>
              </p>
              <p className="text-green-300 text-xs mt-1">
                Path: {formData.model_dir}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || !isServerOnline}
              loading={isLoading}
              size="md"
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Generating...' : `Generate with ${modelType === 'base' ? 'Base' : 'Fine-tuned'} Model`}
            </Button>
            
            {generationResult && onClearResults && (
              <Button
                type="button"
                onClick={onClearResults}
                variant="secondary"
                size="md"
                className="w-full sm:w-auto"
              >
                Clear Results
              </Button>
            )}
          </div>
          
          {!isServerOnline && (
            <p className="text-red-400 text-sm">
              Fine-tuning server is offline. Please check connection.
            </p>
          )}
        </form>
      </Card>

      {/* Show generation results if available */}
      {generationResult && (
        <GeneratedSequencesDisplay
          generationResult={generationResult}
          className="mt-6"
        />
      )}
    </div>
  );
};

// Generation History Component
export const GenerationHistory = ({ onSelectGeneration, className = "" }) => {
  const [history, setHistory] = useState(getGenerationHistory());
  const [showHistory, setShowHistory] = useState(false);

  const refreshHistory = () => {
    setHistory(getGenerationHistory());
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all generation history?')) {
      clearGenerationHistory();
      setHistory([]);
    }
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <span>Generation History ({history.length})</span>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              size="sm"
              variant="secondary"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
            <Button
              onClick={handleClearHistory}
              size="sm"
              variant="danger"
            >
              Clear All
            </Button>
          </div>
        </div>
      }
      className={className}
    >
      {showHistory && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {history.map((generation) => (
            <div 
              key={generation.id}
              className="bg-[#1a2d35] rounded p-3 hover:bg-[#233c48] cursor-pointer transition-colors"
              onClick={() => onSelectGeneration?.(generation)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">
                    {generation.model_name} - {generation.generated_sequences?.length || 0} sequences
                  </div>
                  <div className="text-gray-400 text-xs">
                    {new Date(generation.timestamp).toLocaleString()}
                  </div>
                  <div className="text-gray-500 text-xs font-mono">
                    {generation.prompt?.slice(0, 50)}...
                  </div>
                </div>
                <FontAwesomeIcon icon={faEye} className="text-gray-400 w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// Export the storage utilities for use in the main component
export { saveGenerationToHistory, getGenerationHistory, clearGenerationHistory };

// For testing - you can call this to populate with the sample data
export const useSampleData = () => {
  const sampleGenerationResult = {
    "generation_id": "6ef21094-95a4-45bf-89ce-b26b60419080",
    "model_name": "protgpt2",
    "model_dir": "/workspace/volume1/finetuned/user-protgpt2-20250701_125828/final_model",
    "prompt": "MELHILEHRVRVLSVARQGLWLYTHPLIKLLFLPHRSRCKFFSLTETPEDYTLMVDEEGFKELPPSEFLQVAEATWLVMNVSSHSGAVMQA",
    "generated_sequences": [
      {
        "sequence_id": 1,
        "generated_text": "\nMELHILEHRVRVLSVARQGLWLYTHPLIKLLFLPHRSRCKFFSLTETPEDYTLMVDEEGFKELPPSEFLQVAEATWLVMNVSSHSGAVMQA\nLQSLVRQMRQLLPHLPDLPSPPPTPPSPSLPPPTTPRPPPTTPPPPPSPTPSTTPPPSPTPLFP\nNITTLLPRLQALSEDIADLRDTLLKLQGLHLHLPTPPPDPGPPPAPGDPLLPRLNVTAQGLRG\nLHQHLSVLRGLWGNLTQQHQHLSGLYRRLDGLFLSHYQSHQPSPTTPWPPPSPPSPTPPYPPT\nPGPSPTPPFPPPTPPYPPTPGPSPTPPFPPPTPPYPPTPGPSPTPPFPPPTPPYPPTPGPSP\nTPPFPPPTPPYPPTPGPSPTPPFPPPTPPYPPTPGPSPTPPFPPPTPPYPPTPGPSPTPPFPP\nPTPPYPPTPGPSPTPPFPPPTPPYPPTPGPSPTPPFPPPTPPYPPTPGPSPTPPFPPPTPPY\nPPTPGPSPTPPFPPPTPPYPPTPGPSPTPPFPPPTPPYPPTPGPSPTPPFPPPTPPYPPTPR\nPSPTPPFPPPTPPYPPTPGPSPTPPF"
      },
      // ... more sequences
    ],
    "generation_params": {
      "max_new_tokens": 200,
      "temperature": 0.7,
      "top_p": 0.9,
      "top_k": 50,
      "num_return_sequences": 13
    }
  };

  return sampleGenerationResult;
};
