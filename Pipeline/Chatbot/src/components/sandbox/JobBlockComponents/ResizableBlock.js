import React, { useState, useEffect } from 'react';

const ResizableBlock = ({ children, width, height, onResize }) => {
  const [size, setSize] = useState({ width, height });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const minHeight = 300;
  const minWidth = 350;
  let resizeFrameHeight = 5;
  const handleMouseDown = (e, direction) => {
    setIsResizing(true);
    setResizeDirection(direction);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize(size);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;
    let newWidth = size.width;
    let newHeight = size.height;

    switch (resizeDirection) {
      case 's':
        newHeight = Math.max(minHeight, Math.min(800, startSize.height + deltaY));
        break;
      case 'e':
        newWidth = Math.max(minWidth, Math.min(800, startSize.width + deltaX));
        break;
      case 'w':
        newWidth = Math.max(minWidth, Math.min(800, startSize.width - deltaX));
        break;
      case 'ne':
        newWidth = Math.max(minWidth, Math.min(800, startSize.width + deltaX));
        newHeight = Math.max(minHeight, Math.min(800, startSize.height - deltaY));
        break;
      case 'nw':
        newWidth = Math.max(minWidth, Math.min(800, startSize.width - deltaX));
        newHeight = Math.max(minHeight, Math.min(800, startSize.height - deltaY));
        break;
      case 'se':
        newWidth = Math.max(minWidth, Math.min(800, startSize.width + deltaX));
        newHeight = Math.max(minHeight, Math.min(800, startSize.height + deltaY));
        break;
      case 'sw':
        newWidth = Math.max(minWidth, Math.min(800, startSize.width - deltaX));
        newHeight = Math.max(minHeight, Math.min(800, startSize.height + deltaY));
        break;
    }

    setSize({ width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
      setResizeDirection(null);
      onResize(size);
    }
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startPos, startSize, resizeDirection]);

  const resizeHandleStyle = {
    position: 'absolute',
  };

  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        position: 'relative'
      }}
    >
      {children}
      
      {/* South */}
      <div
        style={{
          ...resizeHandleStyle,
          bottom: 0,
          left: 0,
          right: 0,
          height: resizeFrameHeight,
          cursor: 's-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 's')}
      />
      {/* East */}
      <div
        style={{
          ...resizeHandleStyle,
          right: 0,
          top: 0,
          bottom: 0,
          width: resizeFrameHeight,
          cursor: 'e-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'e')}
      />
      {/* West */}
      <div
        style={{
          ...resizeHandleStyle,
          left: 0,
          top: 0,
          bottom: 0,
          width: resizeFrameHeight,
          cursor: 'w-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'w')}
      />
      {/* North-East */}
      <div
        style={{
          ...resizeHandleStyle,
          top: 0,
          right: 0,
          width: resizeFrameHeight,
          height: resizeFrameHeight,
          cursor: 'ne-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      {/* North-West */}
      <div
        style={{
          ...resizeHandleStyle,
          top: 0,
          left: 0,
          width: resizeFrameHeight,
          height: resizeFrameHeight,
          cursor: 'nw-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
      {/* South-East */}
      <div
        style={{
          ...resizeHandleStyle,
          bottom: 0,
          right: 0,
          width: resizeFrameHeight,
          height: resizeFrameHeight,
          cursor: 'se-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      {/* South-West */}
      <div
        style={{
          ...resizeHandleStyle,
          bottom: 0,
          left: 0,
          width: resizeFrameHeight,
          height: resizeFrameHeight,
          cursor: 'sw-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />
    </div>
  );
};

export default ResizableBlock;