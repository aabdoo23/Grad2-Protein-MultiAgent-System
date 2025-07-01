import React, { useState, useEffect, useCallback } from 'react';

const ResizableBlock = ({ children, width, height, onResize, blockId }) => {
  const [size, setSize] = useState({ width, height });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const minHeight = 300;
  const minWidth = 350;
  const maxHeight = 1200;
  const maxWidth = 1200;
  const resizeFrameHeight = 8;

  useEffect(() => {
    if (!isResizing) {
      setSize({ width, height });
    }
  }, [width, height, isResizing]);

  const handleMouseDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize(size);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    e.preventDefault();
    e.stopPropagation();

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;
    let newWidth = startSize.width;
    let newHeight = startSize.height;

    if (resizeDirection.includes('s')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startSize.height + deltaY));
    }
    if (resizeDirection.includes('n')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startSize.height - deltaY));
    }
    if (resizeDirection.includes('e')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width + deltaX));
    }
    if (resizeDirection.includes('w')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width - deltaX));
    }
    
    setSize({ width: newWidth, height: newHeight });
  }, [isResizing, startPos, startSize, resizeDirection, minWidth, minHeight]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeDirection(null);
      if (size.width !== startSize.width || size.height !== startSize.height) {
        onResize({ width: size.width, height: size.height });
      }
    }
  }, [isResizing, size, startSize, onResize]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const resizeHandleBaseStyle = {
    position: 'absolute',
    userSelect: 'none',
    zIndex: 10, // Ensure handles are above content
  };

  // Define styles for different handles
  const handles = [
    { direction: 's', style: { bottom: 0, left: `${resizeFrameHeight}px`, right: `${resizeFrameHeight}px`, height: resizeFrameHeight, cursor: 's-resize' } },
    { direction: 'e', style: { right: 0, top: `${resizeFrameHeight}px`, bottom: `${resizeFrameHeight}px`, width: resizeFrameHeight, cursor: 'e-resize' } },
    { direction: 'se', style: { bottom: 0, right: 0, width: resizeFrameHeight, height: resizeFrameHeight, cursor: 'se-resize' } },
  ];

  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        position: 'relative',
      }}
      className="job-block-resizable-wrapper" // For potential global styling or identification
    >
      {children}
      
      {handles.map(handle => (
        <div
          key={handle.direction}
          className="nodrag" // Crucial for React Flow to ignore drag for node itself
          style={{
            ...resizeHandleBaseStyle,
            ...handle.style,
            // backgroundColor: 'rgba(0,0,255,0.1)' // For debugging handle visibility
          }}
          onMouseDown={(e) => handleMouseDown(e, handle.direction)}
        />
      ))}
    </div>
  );
};

export default ResizableBlock;