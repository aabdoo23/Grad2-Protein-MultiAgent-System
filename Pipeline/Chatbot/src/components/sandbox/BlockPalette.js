import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faChevronLeft, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

const BlockType = ({ blockType }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'BLOCK_TYPE',
    item: { blockType },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className="p-3 mb-2 rounded-lg cursor-move transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: blockType.color,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-white font-bold text-sm tracking-wide">{blockType.name}</h4>
        <span className="ml-2 mr-2 text-white/80 text-xs px-2 py-1 rounded-lg bg-white/10 backdrop-blur-sm">
          {blockType.type}
        </span>
      </div>
      <p className="text-white/90 text-xs leading-relaxed">{blockType.description}</p>
      <div className="mt-2 flex items-center gap-2 text-white/60 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white/40"></span>
          {blockType.inputs.length} inputs
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white/40"></span>
          {blockType.outputs.length} outputs
        </span>
      </div>
    </div>
  );
};

const BlockGroup = ({ title, blocks, isCollapsed }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const groupColor = blocks[0]?.color || '#4B5563';
  
  const darkerColor = (color) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const darken = (value) => Math.max(0, Math.floor(value * 0.7));
    
    return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
  };

  React.useEffect(() => {
    if (isCollapsed) {
      setIsExpanded(false);
    }
  }, [isCollapsed]);

  return (
    <div className="mb-2 rounded-lg overflow-hidden shadow-lg" style={{ backgroundColor: darkerColor(groupColor) }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 transition-all duration-200 hover:bg-opacity-90"
        style={{ backgroundColor: groupColor }}
      >
        <div className="flex items-center gap-2">
          <span className="text-m font-bold text-white text-left tracking-wide">{title}</span>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
            {blocks.length}
          </span>
        </div>
        <span className="text-white/60 transition-transform duration-200">
          <FontAwesomeIcon 
            icon={isExpanded ? faChevronDown : faChevronRight} 
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      <div 
        className={`transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-3 space-y-2">
          {blocks.map((blockType) => (
            <BlockType key={blockType.id} blockType={blockType} />
          ))}
        </div>
      </div>
    </div>
  );
};

const BlockPalette = ({ blockTypes }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const groupedBlocks = blockTypes.reduce((acc, block) => {
    const type = block.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(block);
    return acc;
  }, {});

  return (
    <div 
      className={`relative transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-12' : 'w-full'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-3 top-1/2 transform -translate-y-1/2 bg-[#1a2b34] text-white p-2 rounded-full border border-[#233c48] 
          hover:bg-[#233c48] transition-all duration-200 z-10 shadow-lg hover:shadow-xl
          ${isHovered ? 'opacity-100' : 'opacity-70'}`}
        title={isCollapsed ? "Expand palette" : "Collapse palette"}
      >
        <FontAwesomeIcon 
          icon={isCollapsed ? faChevronRight : faChevronLeft} 
          className="w-3 h-3 transition-transform duration-200"
        />
      </button>
      
      <div className={`space-y-3 transition-all duration-300 ${
        isCollapsed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}>
        {Object.entries(groupedBlocks).map(([type, blocks]) => (
          <BlockGroup key={type} title={type} blocks={blocks} isCollapsed={isCollapsed} />
        ))}
      </div>
      
      {isCollapsed && (
        <div className="absolute top-5 right-1 w-full h-full flex flex-col items-center justify-center gap-10">
          <div className="transform -rotate-90 whitespace-nowrap text-white/60 text-sm font-medium tracking-wider">
            Job Blocks
          </div>
          <FontAwesomeIcon 
            icon={faLayerGroup} 
            className="transform -rotate-90 text-white/60 text-xl"
          />
        </div>
      )}
    </div>
  );
};

export default BlockPalette;