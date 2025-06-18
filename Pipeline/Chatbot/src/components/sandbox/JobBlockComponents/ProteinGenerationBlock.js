import React, { useState, useEffect, useCallback, useRef } from 'react';

const ProteinGenerationBlock = ({ onUpdateParameters, initialPrompt }) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isValid, setIsValid] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    setIsValid(prompt.trim().length > 0);
  }, [prompt]);

  // Debounced parameter update to prevent constant re-renders
  const debouncedUpdateParameters = useCallback((newPrompt) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (onUpdateParameters) {
        onUpdateParameters({
          prompt: newPrompt,
          model_type: 'generate_protein'
        });
      }
    }, 300); // 300ms delay
  }, [onUpdateParameters]);

  const handlePromptChange = (e) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    
    // Update parameters with debounce to prevent focus loss
    debouncedUpdateParameters(newPrompt);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-300">
            Protein Generation Prompt
          </label>
          <span className="text-xs text-gray-400">
            {prompt.length}/500
          </span>
        </div>
        <textarea
          value={prompt}
          onChange={handlePromptChange}
          maxLength={500}
          placeholder="Enter a description of the protein you want to generate (e.g., 'Generate a membrane protein with alpha-helical structure')"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors duration-200"
          rows={4}
        />
      </div>
      
      {/* Validation indicator */}
      <div className="flex items-center space-x-2">
        {isValid ? (
          <>
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-400">Prompt ready for generation</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-yellow-400">Enter a prompt to generate protein</span>
          </>
        )}
      </div>
      
      {/* Help text */}
      <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
        <p className="font-medium mb-2 text-gray-300">💡 Tips for effective prompts:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Describe the desired protein function (e.g., "enzyme", "receptor", "structural")</li>
          <li>Mention specific properties (e.g., "membrane protein", "binding domain")</li>
          <li>Include structural preferences (e.g., "alpha-helical", "beta-sheet rich")</li>
          <li>Specify any constraints or special requirements</li>
        </ul>
        <div className="mt-2 pt-2 border-t border-gray-700">
          <p className="text-gray-400">
            <span className="font-medium">Example:</span> "Generate a small antimicrobial peptide with cationic properties and alpha-helical structure"
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProteinGenerationBlock;
