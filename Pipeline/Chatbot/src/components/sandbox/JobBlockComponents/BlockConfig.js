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
  const [localParams, setLocalParams] = useState({});

  useEffect(() => {
    if (blockType && blockType.id) {
      const schema = blockConfigSchema[blockType.id];
      if (schema) {
        const defaultParams = {};
        Object.entries(schema).forEach(([key, config]) => {
          defaultParams[key] = initialParams?.[key] ?? config.defaultValue;
        });
        setLocalParams(defaultParams);
      }
    }
  }, [blockType, initialParams]);

  const handleParameterChange = (paramName, value) => {
    setLocalParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const renderConfigPanel = () => {
    if (!isConfigOpen || !blockType) return null;

    const schema = blockConfigSchema[blockType.id];
    if (!schema) {
      return (
        <div className="text-sm text-gray-300">
          No configurable parameters available.
        </div>
      );
    }

    return (
      <div className="bg-[#233c48] p-4 rounded-lg shadow-inner border border-[#344854] mt-2 mb-2">
        <h4 className="text-white font-bold text-sm mb-3">Configure Parameters</h4>
        <div className="space-y-4">
          {Object.entries(schema).map(([paramName, config]) => (
            <InputField
              key={paramName}
              type={config.type}
              label={config.label}
              value={localParams[paramName]}
              onChange={(value) => handleParameterChange(paramName, value)}
              options={config.options}
              placeholder={config.placeholder}
              min={config.min}
              max={config.max}
              step={config.step}
              rows={config.rows}
            />
          ))}
        </div>
        <div className="flex justify-end mt-3">
          <button
            onClick={onClose}
            className="px-3 py-1 mr-2 bg-[#233c48] text-white border border-[#13a4ec] rounded text-sm hover:bg-[#2a4a5a]"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(localParams)}
            className="px-3 py-1 bg-[#13a4ec] text-white rounded text-sm hover:bg-[#0f8fd1]"
          >
            Apply
          </button>
        </div>
      </div>
    );
  };

  return renderConfigPanel();
};

export default BlockConfig; 