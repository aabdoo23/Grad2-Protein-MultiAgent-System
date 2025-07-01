import React from 'react';

const EvaluationResults = ({ metrics, interpretations, summary, quality_assessment }) => {
  const formatMetric = (value, type) => {
    if (typeof value !== 'number') return value;
    
    switch (type) {
      case 'tm_score':
        return value.toFixed(4);
      case 'rmsd':
        return `${value.toFixed(3)} Å`;
      case 'seq_id':
        return `${(value * 100).toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  const getMetricColor = (value, type) => {
    switch (type) {
      case 'tm_score':
        return value >= 0.7 ? 'text-green-400' : value >= 0.5 ? 'text-yellow-400' : 'text-red-400';
      case 'rmsd':
        return value <= 2.0 ? 'text-green-400' : value <= 5.0 ? 'text-yellow-400' : 'text-red-400';
      case 'seq_id':
        return value >= 0.7 ? 'text-green-400' : value >= 0.3 ? 'text-yellow-400' : 'text-red-400';
      default:
        return 'text-[#13a4ec]';
    }
  };

  const getQualityBadgeColor = (quality) => {
    switch (quality) {
      case 'High':
        return 'bg-green-600 text-green-100';
      case 'Medium':
        return 'bg-yellow-600 text-yellow-100';
      case 'Low':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="bg-[#1a2b34] p-3 rounded-lg">
          <p className="text-sm text-gray-300">{summary}</p>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="bg-[#1a2b34] p-3 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-3">Structure Comparison Metrics</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-xs">TM-Score:</span>
                <span className={`text-xs font-medium ${getMetricColor(metrics.tm_score, 'tm_score')}`}>
                  {formatMetric(metrics.tm_score, 'tm_score')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-xs">RMSD:</span>
                <span className={`text-xs font-medium ${getMetricColor(metrics.rmsd, 'rmsd')}`}>
                  {formatMetric(metrics.rmsd, 'rmsd')}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-xs">Seq Identity:</span>
                <span className={`text-xs font-medium ${getMetricColor(metrics.seq_id, 'seq_id')}`}>
                  {formatMetric(metrics.seq_id, 'seq_id')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-xs">Aligned Length:</span>
                <span className="text-[#13a4ec] text-xs font-medium">
                  {metrics.aligned_length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quality Assessment */}
      {quality_assessment && (
        <div className="bg-[#1a2b34] p-3 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-3">Quality Assessment</h4>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-300">Structural Similarity:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getQualityBadgeColor(quality_assessment.structural_similarity)}`}>
                {quality_assessment.structural_similarity}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-300">Geometric Accuracy:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getQualityBadgeColor(quality_assessment.geometric_accuracy)}`}>
                {quality_assessment.geometric_accuracy}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-300">Sequence Conservation:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getQualityBadgeColor(quality_assessment.sequence_conservation)}`}>
                {quality_assessment.sequence_conservation}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interpretations */}
      {interpretations && (
        <div className="bg-[#1a2b34] p-3 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-3">Detailed Analysis</h4>
          <div className="space-y-2">
            {interpretations.tm_score && (
              <div>
                <span className="text-xs text-gray-400">TM-Score Analysis:</span>
                <p className="text-xs text-gray-300 mt-1">{interpretations.tm_score}</p>
              </div>
            )}
            {interpretations.rmsd && (
              <div>
                <span className="text-xs text-gray-400">RMSD Analysis:</span>
                <p className="text-xs text-gray-300 mt-1">{interpretations.rmsd}</p>
              </div>
            )}
            {interpretations.seq_id && (
              <div>
                <span className="text-xs text-gray-400">Sequence Identity Analysis:</span>
                <p className="text-xs text-gray-300 mt-1">{interpretations.seq_id}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationResults;