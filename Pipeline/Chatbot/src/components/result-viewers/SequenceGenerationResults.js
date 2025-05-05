import React from 'react';

const SequenceGenerationResults = ({ sequence, info }) => {
  return (
    <div className="space-y-2">
      {sequence && (
        <div className="bg-[#1a2b34] rounded-lg p-3 mb-2">
          <h6 className="text-white text-xs font-medium mb-1">Sequence:</h6>
          <p className="text-sm font-mono text-[#13a4ec] break-all">{sequence}</p>
        </div>
      )}
      {info && (
        <p className="text-sm text-gray-300 mt-2">{info}</p>
      )}
    </div>
  );
};

export default SequenceGenerationResults; 