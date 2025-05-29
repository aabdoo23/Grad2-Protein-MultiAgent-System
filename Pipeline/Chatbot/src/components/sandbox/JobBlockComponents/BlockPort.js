import React from 'react';

const BlockPort = ({ type, isInput, isMultiDownload, connectionCount }) => {
  return (
    <div className={`flex items-center ${isInput ? '' : 'justify-end'} group`}>
      {isInput && (
        <span
          className="text-white/80 text-xs ml-2 group-hover:text-white transition-colors duration-200 font-bold"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            lineHeight: '16px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            maxHeight: '80px',
            overflow: 'hidden',
          }}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
          {isMultiDownload && connectionCount > 0 && ` (${connectionCount})`}
          {isMultiDownload && !connectionCount && ' (multiple)'}
        </span>
      )}
  
      {!isInput && (
        <span
          className="text-white/80 text-xs mr-2 group-hover:text-white transition-colors duration-200 font-bold"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            lineHeight: '16px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            maxHeight: '80px',
            overflow: 'hidden',
          }}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
          {isMultiDownload && connectionCount > 0 && ` (${connectionCount})`}
          {isMultiDownload && !connectionCount && ' (multiple)'}
        </span>
      )}
    </div>
  );
};

export default BlockPort;