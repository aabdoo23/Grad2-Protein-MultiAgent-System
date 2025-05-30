import React from 'react';

const EvaluationResults = ({ metrics }) => {
  const formatMetric = (value) => {
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  return (
    <div className="space-y-2">
      {metrics && (
        <div className="grid grid-cols-2 gap-2 bg-[#1a2b34] p-3 rounded-lg">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-300 text-xs capitalize">{key}:</span>
              <span className="text-[#13a4ec] text-xs font-medium">{formatMetric(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvaluationResults; 