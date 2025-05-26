import React from 'react';

const BlockPort = ({ type, isInput, isMultiDownload, connectionCount }) => {
  return (
    <div className={`flex items-center ${isInput ? 'my-3' : 'my-3 justify-end'} group`}>
      {/* The visual representation of a clickable port (circle) is removed. 
          The React Flow Handle component in JobBlock.js serves this purpose. */}
      
      <span 
        className={`text-white/80 text-xs ${isInput ? 'ml-3' : 'mr-3'} group-hover:text-white transition-colors duration-200`}
        style={{ lineHeight: '16px' }} // Ensure vertical alignment with typical Handle size if they are 8px + border
      >
        {type}
        {isMultiDownload && connectionCount > 0 && ` (${connectionCount})`}
        {isMultiDownload && !connectionCount && " (multiple)"}
      </span>
      
      {/* Optional: If a connection count badge is still desired for multi_download inputs and needs specific positioning,
          it would be placed here, but its positioning would be relative to the Handle or the JobBlock structure,
          not a now-removed circle in BlockPort. For simplicity, the count is currently appended to the text. */}
    </div>
  );
};

export default BlockPort;