import React from 'react';

const BlockPort = ({ type, isInput, isMultiDownload, connectionCount, portIndex }) => {
  // Format the type by replacing underscores with spaces and capitalizing each word
  const formatType = (type) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formattedType = formatType(type);
  
  // Add port number if there are multiple ports of the same type
  const displayName = portIndex && portIndex > 1 ? `${formattedType} ${portIndex}` : formattedType;

  return (
    <div className={`flex items-center ${isInput ? '' : 'justify-end'} group`}>      {isInput && (
        <span
          className="text-white/80 text-xs ml-2 group-hover:text-white transition-colors duration-200 font-bold"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            lineHeight: '18px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            maxHeight: '120px',
            overflow: 'hidden',
            letterSpacing: '0.5px',
          }}
        >
          {displayName}
          {isMultiDownload && connectionCount > 0 && ` (${connectionCount})`}
          {isMultiDownload && !connectionCount && ' (multiple)'}
        </span>
      )}      {!isInput && (
        <span
          className="text-white/80 text-xs mr-2 group-hover:text-white transition-colors duration-200 font-bold"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            lineHeight: '18px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            maxHeight: '120px',
            overflow: 'hidden',
            letterSpacing: '0.5px',
          }}
        >
          {displayName}
          {isMultiDownload && connectionCount > 0 && ` (${connectionCount})`}
          {isMultiDownload && !connectionCount && ' (multiple)'}
        </span>
      )}
    </div>
  );
};

export default BlockPort;