import React from 'react';

const ConnectionLine = ({ start, end, color, dashed = false }) => {
  // Calculate control points for the curve
  const controlPoint1 = {
    x: start.x + (end.x - start.x) / 3,
    y: start
  };
  
  const controlPoint2 = {
    x: start.x + (end.x - start.x) * 2 / 3,
    y: end
  };
  
  // Create SVG path for the connection
  const pathData = `
    M ${start.x},${start.y}
    C ${controlPoint1.x},${start.y} ${controlPoint2.x},${end.y} ${end.x},${end.y}
  `;
  
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? '5,5' : 'none'}
        markerEnd={`url(#arrow-${color.replace('#', '')})`}
      />
      
      {/* Arrow marker definition */}
      <defs>
        <marker
          id={`arrow-${color.replace('#', '')}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={color}
          />
        </marker>
      </defs>
    </svg>
  );
};

export default ConnectionLine; 