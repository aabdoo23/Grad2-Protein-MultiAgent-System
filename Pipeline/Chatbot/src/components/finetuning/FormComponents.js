import { useState } from 'react';
import { FormField, Button, Card } from './CommonComponents';

export const FinetuneForm = ({ 
  baseModels, 
  onSubmit, 
  isLoading = false, 
  isServerOnline = true 
}) => {
  const [formData, setFormData] = useState({
    model_key: '',
    fasta_content: '',
    finetune_mode: 'qlora',
    n_trials: 5
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.model_key || !formData.fasta_content) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit(formData);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          fasta_content: e.target.result
        }));
      };
      reader.readAsText(file);
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
            value={formData.model_key}
            onChange={(e) => updateField('model_key', e.target.value)}
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
            <textarea
              value={formData.fasta_content}
              onChange={(e) => updateField('fasta_content', e.target.value)}
              className="w-full h-32 bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
              placeholder=">protein1&#10;MKVLIVLLQKTSR...&#10;>protein2&#10;MQIFVKTLTGKTI..."
              required
            />
          </div>
        </FormField>

        {/* Advanced Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField 
            label="Fine-tuning Mode"
            description="QLoRA is faster and uses less memory"
          >
            <select
              value={formData.finetune_mode}
              onChange={(e) => updateField('finetune_mode', e.target.value)}
              className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="qlora">QLoRA (Recommended)</option>
              <option value="full">Full Fine-tuning</option>
            </select>
          </FormField>

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
  onSubmit, 
  isLoading = false, 
  isServerOnline = true 
}) => {
  const [formData, setFormData] = useState({
    prompt: '<|startoftext|>',
    base_model_key: '',
    model_dir_on_volume: '',
    finetuned_model_job_id: '',
    max_new_tokens: 200
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.prompt || (!formData.base_model_key && !formData.model_dir_on_volume && !formData.finetuned_model_job_id)) {
      alert('Please fill in all required fields and select a model');
      return;
    }

    // Prepare the submission data
    let submissionData = {
      prompt: formData.prompt,
      max_new_tokens: formData.max_new_tokens
    };

    // Handle different model selection types
    if (formData.base_model_key) {
      submissionData.base_model_key = formData.base_model_key;
    } else if (formData.finetuned_model_job_id) {
      // For fine-tuned models, we'll use the model_dir_on_volume field
      // with a special path format that the backend can recognize
      submissionData.model_dir_on_volume = `/finetuned_models/${formData.finetuned_model_job_id}`;
    } else if (formData.model_dir_on_volume) {
      submissionData.model_dir_on_volume = formData.model_dir_on_volume;
    }

    onSubmit(submissionData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModelChange = (modelType, value) => {
    // Clear other model selections when one is chosen
    setFormData(prev => ({
      ...prev,
      base_model_key: modelType === 'base' ? value : '',
      model_dir_on_volume: modelType === 'custom' ? value : '',
      finetuned_model_job_id: modelType === 'finetuned' ? value : ''
    }));
  };

  // Get the currently selected model info for display
  const getSelectedModelInfo = () => {
    if (formData.base_model_key) {
      return { type: 'Base Model', name: formData.base_model_key };
    }
    if (formData.finetuned_model_job_id) {
      const selectedModel = userModels.find(model => model.job_id === formData.finetuned_model_job_id);
      return { 
        type: 'Fine-tuned Model', 
        name: selectedModel ? `${selectedModel.model_key} (${selectedModel.job_id.slice(0, 8)}...)` : 'Unknown'
      };
    }
    if (formData.model_dir_on_volume) {
      return { type: 'Custom Path', name: formData.model_dir_on_volume };
    }
    return null;
  };

  const selectedModel = getSelectedModelInfo();
  return (
    <Card title="Generate Protein Sequence">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField 
          label="Prompt" 
          required
          description="Starting text for sequence generation"
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

        {/* Model Selection */}
        <FormField 
          label="Select Model" 
          required
          description="Choose from base models, your fine-tuned models, or specify a custom path"
        >
          {/* Selected Model Display */}
          {selectedModel && (
            <div className="mb-3 p-3 bg-[#1a2e3a] rounded border border-green-500/30">
              <div className="text-sm text-green-400 font-medium">
                Selected: {selectedModel.type}
              </div>
              <div className="text-white text-sm mt-1">
                {selectedModel.name}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Base Models */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Base Models
              </label>
              <select
                value={formData.base_model_key}
                onChange={(e) => handleModelChange('base', e.target.value)}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a base model</option>
                {baseModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            {/* Fine-tuned Models */}
            {userModels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Fine-tuned Models ({userModels.length})
                </label>
                <select
                  value={formData.finetuned_model_job_id}
                  onChange={(e) => handleModelChange('finetuned', e.target.value)}
                  className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a fine-tuned model</option>
                  {userModels.map((model) => (
                    <option key={model.job_id} value={model.job_id}>
                      {model.model_key} - {model.finetune_mode} (Job: {model.job_id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {userModels.length === 0 && (
              <div className="text-sm text-gray-400 bg-[#1a2e3a] p-3 rounded border border-gray-600">
                No fine-tuned models available. Create one in the "Fine-tune Model" tab first.
              </div>
            )}

            {/* Custom Model Path */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Model Path (Advanced)
              </label>
              <input
                type="text"
                value={formData.model_dir_on_volume}
                onChange={(e) => handleModelChange('custom', e.target.value)}
                className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Path to your custom model directory"
              />
            </div>
          </div>
        </FormField>

        <FormField 
          label="Max New Tokens"
          description="Maximum length of generated sequence"
        >
          <input
            type="number"
            min="10"
            max="1000"
            value={formData.max_new_tokens}
            onChange={(e) => updateField('max_new_tokens', parseInt(e.target.value))}
            className="w-full bg-[#233c48] text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </FormField>

        <Button
          type="submit"
          disabled={isLoading || !isServerOnline}
          loading={isLoading}
          size="md"
          className="w-full sm:w-auto"
        >
          {isLoading ? 'Generating...' : 'Generate Sequence'}
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
