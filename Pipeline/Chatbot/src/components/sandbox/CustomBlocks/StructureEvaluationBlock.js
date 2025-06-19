import React, { useState, useEffect } from 'react';

const StructureEvaluationBlock = ({ 
  onUpdateParameters, 
  connections, 
  inputData, 
  initialParams = {},
  blockOutput,
  status 
}) => {
  const [pdbFile1, setPdbFile1] = useState(initialParams.pdb_file1 || '');
  const [pdbFile2, setPdbFile2] = useState(initialParams.pdb_file2 || '');
  const [isManualInput, setIsManualInput] = useState(false);  // Check if we have connected inputs
  const hasStructureInput1 = connections?.structure || connections?.structure_1;
  const hasStructureInput2 = connections?.structure_2;
  
  // Handle different data formats from different block types
  const connectedStructure1 = inputData?.structure || inputData?.structure_1;
  const connectedStructure2 = inputData?.structure_2;

  useEffect(() => {
    // Auto-fill from connected inputs
    let updatedParams = { model_type: 'evaluate_structure' };
    let hasChanges = false;
    
    // Handle structure inputs - check for both naming conventions and different data formats
    if (connectedStructure1) {
      // Structure prediction blocks might have pdb_file instead of filePath
      const filePath1 = connectedStructure1.filePath || connectedStructure1.pdb_file || connectedStructure1;
      if (filePath1 && typeof filePath1 === 'string') {
        updatedParams.pdb_file1 = filePath1;
        if (pdbFile1 !== filePath1) {
          setPdbFile1(filePath1);
          hasChanges = true;
        }
      }
    }
    
    if (connectedStructure2) {
      // Structure prediction blocks might have pdb_file instead of filePath
      const filePath2 = connectedStructure2.filePath || connectedStructure2.pdb_file || connectedStructure2;
      if (filePath2 && typeof filePath2 === 'string') {
        updatedParams.pdb_file2 = filePath2;
        if (pdbFile2 !== filePath2) {
          setPdbFile2(filePath2);
          hasChanges = true;
        }
      }
    }

    // If we have manual inputs and they're different from connected inputs
    if (isManualInput) {
      if (pdbFile1) updatedParams.pdb_file1 = pdbFile1;
      if (pdbFile2) updatedParams.pdb_file2 = pdbFile2;
      hasChanges = true;
    }

    // Debug logging
    console.log('Parameter update:', {
      updatedParams,
      hasChanges,
      connectedStructure1,
      connectedStructure2,
      filePath1: connectedStructure1?.filePath || connectedStructure1?.pdb_file,
      filePath2: connectedStructure2?.filePath || connectedStructure2?.pdb_file
    });

    // Only update parameters if there are actual changes or if we have valid files
    if (hasChanges || updatedParams.pdb_file1 || updatedParams.pdb_file2) {
      onUpdateParameters(updatedParams);
    }
  }, [connectedStructure1, connectedStructure2, pdbFile1, pdbFile2, isManualInput]);

  const handleFilePathChange = (fileNumber, value) => {
    if (fileNumber === 1) {
      setPdbFile1(value);
    } else {
      setPdbFile2(value);
    }
  };

  const getConnectionStatus = () => {
    const status1 = hasStructureInput1 ? 'Connected' : 'Not connected';
    const status2 = hasStructureInput2 ? 'Connected' : 'Not connected';
    return { status1, status2 };
  };

  const { status1, status2 } = getConnectionStatus();

  // Results display component
  const renderResults = () => {
    if (status !== 'completed' || !blockOutput) return null;

    if (!blockOutput.success) {
      return (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded">
          <div className="flex items-center space-x-2">
            <span className="text-red-400">✗</span>
            <span className="text-sm text-red-300">Error: {blockOutput.error}</span>
          </div>
        </div>
      );
    }

    const { metrics, interpretations, summary, quality_assessment } = blockOutput;

    return (
      <div className="mt-4 space-y-3">
        {/* Summary */}
        {summary && (
          <div className="p-3 bg-green-900/20 border border-green-700/30 rounded">
            <div className="flex items-center space-x-2">
              <span className="text-green-400">✓</span>
              <span className="text-xs text-green-300">{summary}</span>
            </div>
          </div>
        )}

        {/* Metrics */}
        {metrics && (
          <div className="p-3 bg-gray-800/50 rounded border border-gray-600/30">
            <div className="text-xs font-medium text-white mb-2">Comparison Metrics</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">TM-Score:</span>
                <span className={`font-medium ${
                  metrics.tm_score >= 0.7 ? 'text-green-400' : 
                  metrics.tm_score >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {metrics.tm_score?.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">RMSD:</span>
                <span className={`font-medium ${
                  metrics.rmsd <= 2.0 ? 'text-green-400' : 
                  metrics.rmsd <= 5.0 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {metrics.rmsd?.toFixed(3)} Å
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Seq ID:</span>
                <span className={`font-medium ${
                  metrics.seq_id >= 0.7 ? 'text-green-400' : 
                  metrics.seq_id >= 0.3 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {(metrics.seq_id * 100)?.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Aligned:</span>
                <span className="text-blue-400 font-medium">{metrics.aligned_length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quality Assessment */}
        {quality_assessment && (
          <div className="p-3 bg-gray-800/50 rounded border border-gray-600/30">
            <div className="text-xs font-medium text-white mb-2">Quality Assessment</div>
            <div className="space-y-1">
              {Object.entries(quality_assessment).map(([key, value]) => {
                const getColor = (val) => {
                  switch(val) {
                    case 'High': return 'text-green-400 bg-green-900/30';
                    case 'Medium': return 'text-yellow-400 bg-yellow-900/30';
                    case 'Low': return 'text-red-400 bg-red-900/30';
                    default: return 'text-gray-400 bg-gray-900/30';
                  }
                };
                
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 capitalize">
                      {key.replace('_', ' ')}:
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getColor(value)}`}>
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300 mb-3 text-center">
        Structure Comparison Setup
      </div>

      {/* Connection Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Structure 1:</span>
          <span className={`font-medium ${hasStructureInput1 ? 'text-green-400' : 'text-yellow-400'}`}>
            {status1}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Structure 2:</span>
          <span className={`font-medium ${hasStructureInput2 ? 'text-green-400' : 'text-yellow-400'}`}>
            {status2}
          </span>
        </div>
      </div>

      {/* Manual Input Toggle */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="manual-input"
          checked={isManualInput}
          onChange={(e) => setIsManualInput(e.target.checked)}
          className="w-3 h-3 text-[#13a4ec] bg-gray-700 border-gray-600 rounded focus:ring-[#13a4ec] focus:ring-1"
        />
        <label htmlFor="manual-input" className="text-xs text-gray-300 cursor-pointer">
          Manual file path input
        </label>
      </div>

      {/* Manual Input Fields */}
      {isManualInput && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">PDB File 1 Path:</label>
            <input
              type="text"
              value={pdbFile1}
              onChange={(e) => handleFilePathChange(1, e.target.value)}
              placeholder="Path to first PDB file..."
              className="w-full px-2 py-1 text-xs bg-gray-700/50 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-[#13a4ec] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">PDB File 2 Path:</label>
            <input
              type="text"
              value={pdbFile2}
              onChange={(e) => handleFilePathChange(2, e.target.value)}
              placeholder="Path to second PDB file..."
              className="w-full px-2 py-1 text-xs bg-gray-700/50 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-[#13a4ec] focus:outline-none"
            />
          </div>
        </div>
      )}      {/* Connected File Display */}
      {!isManualInput && (
        <div className="space-y-2">
          {connectedStructure1 && (
            <div className="text-xs">
              <span className="text-gray-400">File 1: </span>
              <span className="text-green-400 font-mono">
                {(connectedStructure1.filePath || connectedStructure1.pdb_file || connectedStructure1)?.split(/[\\\\/]/).pop()}
              </span>
            </div>
          )}
          {connectedStructure2 && (
            <div className="text-xs">
              <span className="text-gray-400">File 2: </span>
              <span className="text-green-400 font-mono">
                {(connectedStructure2.filePath || connectedStructure2.pdb_file || connectedStructure2)?.split(/[\\\\/]/).pop()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Status Message */}
      <div className="text-xs text-center">
        {hasStructureInput1 && hasStructureInput2 ? (
          <span className="text-green-400">✓ Ready to compare structures</span>
        ) : isManualInput && pdbFile1 && pdbFile2 ? (
          <span className="text-green-400">✓ Manual paths configured</span>
        ) : (          <span className="text-yellow-400">⚠ Connect two structures or use manual input</span>
        )}
      </div>

      {/* Results Display */}
      {renderResults()}
    </div>
  );
};

export default StructureEvaluationBlock;
