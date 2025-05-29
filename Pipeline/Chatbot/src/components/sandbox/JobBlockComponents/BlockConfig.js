import React, { useState, useEffect } from 'react';
import { blockConfigSchema } from '../config/blockConfigSchema';

const InputField = ({ type, label, value, onChange, options, placeholder, min, max, step, rows }) => {
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => {
              // For sequence iterator, split by newlines and filter out empty lines
              if (type === 'textarea' && label.includes('sequences')) {
                const sequences = e.target.value
                  .split('\n')
                  .map(seq => seq.trim())
                  .filter(seq => seq.length > 0);
                onChange(sequences);
              } else {
                onChange(e.target.value);
              }
            }}
            className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec] font-mono text-sm"
            placeholder={placeholder}
            rows={rows}
          />
        );

      case 'file':
        return (
          <div className="space-y-2">
            <input
              type="file"
              accept={options?.accept}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                  const text = await file.text();
                  // Parse FASTA format
                  const sequences = text
                    .split('>')
                    .filter(block => block.trim())
                    .map(block => {
                      const [header, ...sequenceLines] = block.split('\n');
                      const sequence = sequenceLines.join('').trim();
                      return sequence;
                    })
                    .filter(seq => seq.length > 0);

                  onChange(sequences);
                } catch (error) {
                  console.error('Error reading FASTA file:', error);
                }
              }}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
            {options?.description && (
              <p className="text-sm text-gray-400">{options.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
          />
        );

      case 'checkboxGroup':
        const checkboxValue = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${label}-${option.value}`}
                  checked={checkboxValue.includes(option.value)}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...checkboxValue, option.value]
                      : checkboxValue.filter(v => v !== option.value);
                    onChange(newValue);
                  }}
                  className="mr-2"
                />
                <label htmlFor={`${label}-${option.value}`} className="text-sm text-gray-300">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'tagInput':
        const tagValue = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {tagValue.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-[#13a4ec]/20 text-[#13a4ec] rounded text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => onChange(tagValue.filter((_, i) => i !== index))}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={''}
              onChange={(e) => {
                if (e.target.value && e.key === 'Enter') {
                  onChange([...tagValue, e.target.value]);
                  e.target.value = '';
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  onChange([...tagValue, e.target.value]);
                  e.target.value = '';
                }
              }}
              placeholder={placeholder}
              className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-2 rounded bg-[#1a2a33] text-white border border-[#344854] focus:outline-none focus:ring-1 focus:ring-[#13a4ec]"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      {renderInput()}
    </div>
  );
};

const BlockConfig = ({ blockType, isConfigOpen, onClose, onApply, initialParams }) => {
  const [parameters, setParameters] = useState(initialParams || {});
  const [isLoading, setIsLoading] = useState(false);

  const handleParameterChange = (key, value) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLoadData = async () => {
    setIsLoading(true);
    try {
      // Call runBlock with loadData parameter
      await onApply({ ...parameters, loadData: true });
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (key, field) => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={parameters[key] || ''}
            onChange={(e) => handleParameterChange(key, e.target.value)}
            className="w-full h-32 p-2 bg-[#1a2c35] text-white rounded-lg border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
            placeholder={field.placeholder || ''}
          />
        );
      case 'file':
        return (
          <div>
            <input
              type="file"
              accept={field.options?.accept}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    // For FASTA files, parse the sequences
                    if (file.name.endsWith('.fasta') || file.name.endsWith('.fa')) {
                      const text = event.target.result;
                      const sequences = text
                        .split('>')
                        .filter(block => block.trim())
                        .map(block => {
                          const [header, ...sequenceLines] = block.split('\n');
                          const sequence = sequenceLines.join('').trim();
                          return sequence;
                        })
                        .filter(seq => seq.length > 0);
                      handleParameterChange(key, sequences);
                    } else {
                      handleParameterChange(key, event.target.result);
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              className="w-full p-2 bg-[#1a2c35] text-white rounded-lg border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
            />
            {field.description && (
              <p className="mt-1 text-sm text-gray-400">{field.description}</p>
            )}
          </div>
        );
      default:
        return (
          <input
            type={field.type || 'text'}
            value={parameters[key] || ''}
            onChange={(e) => handleParameterChange(key, e.target.value)}
            className="w-full p-2 bg-[#1a2c35] text-white rounded-lg border border-[#344854] focus:border-[#13a4ec] focus:outline-none transition-colors duration-200"
            placeholder={field.placeholder || ''}
          />
        );
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isConfigOpen ? '' : 'hidden'}`}>
      <div className="bg-[#1a2c35] rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">{blockType.name} Configuration</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {blockType.config && Object.entries(blockType.config).map(([key, field]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-white mb-1">
                  {field.label}
                </label>
                {renderInput(key, field)}
              </div>
            ))}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#233c48] text-white rounded-lg text-sm hover:bg-[#2a4a5a] transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => onApply(parameters)}
                className="px-4 py-2 bg-[#13a4ec] text-white rounded-lg text-sm hover:bg-[#0f8fd1] transition-colors duration-200"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockConfig; 