import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronRight,
  faChevronLeft,
  faLayerGroup,
  faSearch,
  faTimes,
  faGripVertical,
  faPlay,
  faStop,
  faCog,
  faDatabase,
  faAtom,
  faChartLine,
  faUpload,
  faDna,
  faSync,
  faLightbulb,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import useWorkspaceStore from '../../store/workspaceStore';
import { getBlockStats, getRecommendedBlocks, sortBlocksByPopularity } from '../../utils/blockPaletteUtils';

// Icon mapping for different block types
const getTypeIcon = (type) => {
  const iconMap = {
    'I/O': faUpload,
    'Generate Protein': faDna,
    'Iterate': faSync,
    '3D Structure Prediction': faAtom,
    'Multiple Sequence Alignment': faDatabase,
    'BLAST Search': faSearch,
    '3D Structure Search': faSearch,
    'Docking': faCog,
    'Analysis': faChartLine
  };
  return iconMap[type] || faLayerGroup;
};

// Enhanced block card with better visual design
const BlockType = ({ blockType, isCompact = false, onBlockAdd }) => {
  const addBlock = useWorkspaceStore(state => state.addBlock);
  const [isHovered, setIsHovered] = useState(false);

  const onDragStart = (event, blockType) => {
    const data = JSON.stringify(blockType);
    event.dataTransfer.setData('application/reactflow', data);
    event.dataTransfer.effectAllowed = 'move';
  };
  const handleQuickAdd = (e) => {
    e.stopPropagation();

    // Track usage statistics
    if (onBlockAdd) {
      onBlockAdd(blockType);
    }

    // Add block to workspace
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      blockTypeId: blockType.id,
      type: blockType.id,
      position: {
        // Position blocks in a grid pattern, offset by existing blocks
        x: 100 + (Math.floor(Math.random() * 3) * 350),
        y: 100 + (Math.floor(Math.random() * 3) * 250),
      },
      parameters: {},
      status: 'idle',
    };

    addBlock(newBlock);
  };

  if (isCompact) {
    return (
      <div
        className="group relative p-2 mb-2 rounded-lg cursor-move transition-all duration-300 hover:scale-105 hover:shadow-xl border border-transparent"
        style={{
          background: `linear-gradient(135deg, ${blockType.color}dd, ${blockType.color}aa)`,
          backdropFilter: 'blur(10px)',
        }}
        draggable
        onDragStart={(event) => onDragStart(event, blockType)}
        onMouseEnter={(e) => {
          setIsHovered(true);
          e.target.style.borderColor = 'var(--color-borderLight)';
        }}
        onMouseLeave={(e) => {
          setIsHovered(false);
          e.target.style.borderColor = 'transparent';
        }}
        title={blockType.description}
      >
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={getTypeIcon(blockType.type)}
            className="text-sm flex-shrink-0"
            style={{ color: 'rgba(255, 255, 255, 0.9)' }}
          />
          <span className="font-medium text-sm truncate" style={{ color: 'white' }}>
            {blockType.name}
          </span>
        </div>

        {/* Hover tooltip */}
        {isHovered && (
          <div 
            className="absolute left-full ml-2 top-0 z-50 p-3 rounded-lg shadow-xl border w-64 animate-in slide-in-from-left-2"
            style={{
              backgroundColor: 'var(--color-secondary)',
              color: 'var(--color-textPrimary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <h4 className="font-bold text-sm mb-1">{blockType.name}</h4>
            <p className="text-xs mb-2" style={{ color: 'var(--color-textSecondary)' }}>
              {blockType.description}
            </p>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-textMuted)' }}>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }}></div>
                {blockType.inputs.length} in
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-info)' }}></div>
                {blockType.outputs.length} out
              </span>
            </div>
          </div>
        )}

        {/* Drag indicator */}
        <FontAwesomeIcon
          icon={faGripVertical}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/40 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    );
  }

  return (
    <div
      className="group relative p-4 mb-3 rounded-xl cursor-move transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border border-white/10 hover:border-white/30"
      style={{
        background: `linear-gradient(135deg, ${blockType.color}ee, ${blockType.color}cc)`,
        backdropFilter: 'blur(10px)',
      }}
      draggable
      onDragStart={(event) => onDragStart(event, blockType)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
            <FontAwesomeIcon
              icon={getTypeIcon(blockType.type)}
              className="text-white text-sm"
            />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm tracking-wide">{blockType.name}</h4>
            <span className="text-white/70 text-xs px-2 py-1 rounded-md bg-white/10 backdrop-blur-sm">
              {blockType.type}
            </span>
          </div>
        </div>
        <FontAwesomeIcon
          icon={faGripVertical}
          className="text-white/40 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>

      <p className="text-white/90 text-xs leading-relaxed mb-3">{blockType.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-white/60 text-xs">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400/70"></div>
            {blockType.inputs.length} inputs
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400/70"></div>
            {blockType.outputs.length} outputs
          </span>
        </div>

        {/* Add to workspace button */}
        <button
          onClick={handleQuickAdd}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs"
          title="Quick add to workspace"
        >
          <FontAwesomeIcon icon={faPlay} />
        </button>
      </div>
    </div>
  );
};

// Enhanced block group with better animations and states
const BlockGroup = ({ title, blocks, isCollapsed, isCompact = false, onBlockAdd }) => {
  const [isExpanded, setIsExpanded] = useState(!isCompact);

  const groupColor = blocks[0]?.color || '#4B5563';
  const typeIcon = getTypeIcon(title);

  const darkerColor = (color) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const darken = (value) => Math.max(0, Math.floor(value * 0.8));

    return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
  };

  React.useEffect(() => {
    if (isCollapsed) {
      setIsExpanded(false);
    }
  }, [isCollapsed]);

  if (isCompact) {
    return (
      <div className="mb-1">
        <div
          className="flex items-center justify-center p-2 rounded-lg transition-all duration-200 hover:bg-white/5 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          title={`${title} (${blocks.length} blocks)`}
        >
          <FontAwesomeIcon
            icon={typeIcon}
            className="text-white/70 text-lg hover:text-white transition-colors"
          />
        </div>

        {isExpanded && (
          <div className="mt-2 space-y-1 animate-in slide-in-from-top-2">
            {blocks.map((blockType) => (
              <BlockType key={blockType.id} blockType={blockType} isCompact={true} onBlockAdd={onBlockAdd} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl overflow-hidden shadow-lg border border-white/10"
      style={{ background: `linear-gradient(135deg, ${darkerColor(groupColor)}dd, ${darkerColor(groupColor)}aa)` }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 transition-all duration-200 hover:bg-white/5 group"
        style={{ background: `linear-gradient(135deg, ${groupColor}ee, ${groupColor}cc)` }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
            <FontAwesomeIcon
              icon={typeIcon}
              className="text-white text-sm"
            />
          </div>
          <div className="text-left">
            <span className="text-white font-bold text-sm tracking-wide block">{title}</span>
            <span className="text-white/60 text-xs">{blocks.length} blocks available</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
            {blocks.length}
          </span>
          <FontAwesomeIcon
            icon={isExpanded ? faChevronDown : faChevronRight}
            className={`text-white/60 w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-0' : 'rotate-0'
              }`}
          />
        </div>
      </button>

      <div
        className={`transition-all duration-300 ease-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
      >
        <div className="p-4 space-y-2 bg-gradient-to-b from-transparent to-black/10">
          {blocks.map((blockType) => (
            <BlockType key={blockType.id} blockType={blockType} onBlockAdd={onBlockAdd} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Main BlockPalette component with modern sidebar design
const BlockPalette = ({ blockTypes }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showRecommended, setShowRecommended] = useState(false);
  const [sortBy, setSortBy] = useState('type'); // 'type', 'name', 'popularity'
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Get current workspace state
  const blocks = useWorkspaceStore(state => state.blocks);

  // Block usage statistics (could be persisted)
  const [usageStats, setUsageStats] = useState({});

  // Calculate block statistics
  const blockStats = useMemo(() => getBlockStats(blockTypes), [blockTypes]);

  // Get recommended blocks based on current workspace
  const recommendedBlocks = useMemo(() =>
    getRecommendedBlocks(blocks, blockTypes), [blocks, blockTypes]
  );

  // Group blocks by type
  const groupedBlocks = useMemo(() => {
    let processedBlocks = [...blockTypes];

    // Sort blocks within each group
    if (sortBy === 'popularity') {
      processedBlocks = sortBlocksByPopularity(processedBlocks, usageStats);
    } else if (sortBy === 'name') {
      processedBlocks.sort((a, b) => a.name.localeCompare(b.name));
    }

    return processedBlocks.reduce((acc, block) => {
      const type = block.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(block);
      return acc;
    }, {});
  }, [blockTypes, sortBy, usageStats]);

  // Filter blocks based on search and category
  const filteredGroupedBlocks = useMemo(() => {
    if (showRecommended && recommendedBlocks.length > 0) {
      return { 'Recommended': recommendedBlocks };
    }

    let filtered = { ...groupedBlocks };

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = Object.keys(filtered).reduce((acc, type) => {
        const filteredBlocks = filtered[type].filter(block =>
          block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          block.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          block.type.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filteredBlocks.length > 0) {
          acc[type] = filteredBlocks;
        }
        return acc;
      }, {});
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = { [selectedCategory]: filtered[selectedCategory] || [] };
    }

    return filtered;
  }, [groupedBlocks, searchQuery, selectedCategory, showRecommended, recommendedBlocks]);

  const categories = useMemo(() => {
    return ['all', ...Object.keys(groupedBlocks)];
  }, [groupedBlocks]);

  const totalBlocks = useMemo(() => {
    return Object.values(filteredGroupedBlocks).reduce((total, blocks) => total + blocks.length, 0);
  }, [filteredGroupedBlocks]);

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setShowRecommended(false);
    setFiltersExpanded(false);
  };

  // Track block usage
  const handleBlockAdd = (blockType) => {
    setUsageStats(prev => ({
      ...prev,
      [blockType.id]: (prev[blockType.id] || 0) + 1
    }));
  };

  return (
    <div className={`relative flex flex-col h-full transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-80'
      }`}>

      <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {!isCollapsed && (
          <div className="mb-4">            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-textPrimary)' }}>
                <FontAwesomeIcon icon={faLayerGroup} style={{ color: 'var(--color-accent)' }} />
                Block Library
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRecommended(!showRecommended)}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: showRecommended ? 'var(--color-warning)' : 'transparent',
                    color: showRecommended ? 'white' : 'var(--color-textSecondary)'
                  }}
                  onMouseEnter={(e) => {
                    if (showRecommended) {
                      e.target.style.backgroundColor = '#d97706'; // darker warning
                    } else {
                      e.target.style.backgroundColor = 'var(--color-tertiary)';
                      e.target.style.color = 'var(--color-textPrimary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = showRecommended ? 'var(--color-warning)' : 'transparent';
                    e.target.style.color = showRecommended ? 'white' : 'var(--color-textSecondary)';
                  }}
                  title="Show recommended blocks"
                >
                  <FontAwesomeIcon icon={faLightbulb} className="w-3 h-3" />
                </button>
                {/* Compact View Toggle */}
                <button
                  onClick={() => setIsCompact(!isCompact)}
                  className="p-2 rounded-lg transition-all duration-200 border hover:shadow-lg"
                  style={{
                    backgroundColor: isCompact ? 'var(--color-info)' : 'var(--color-secondary)',
                    color: isCompact ? 'white' : 'var(--color-textSecondary)',
                    borderColor: isCompact ? 'var(--color-info)' : 'var(--color-border)'
                  }}
                  onMouseEnter={(e) => {
                    if (isCompact) {
                      e.target.style.backgroundColor = '#2563eb'; // darker blue
                      e.target.style.borderColor = '#3b82f6';
                    } else {
                      e.target.style.backgroundColor = 'var(--color-tertiary)';
                      e.target.style.color = 'var(--color-textPrimary)';
                      e.target.style.borderColor = 'var(--color-borderLight)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = isCompact ? 'var(--color-info)' : 'var(--color-secondary)';
                    e.target.style.color = isCompact ? 'white' : 'var(--color-textSecondary)';
                    e.target.style.borderColor = isCompact ? 'var(--color-info)' : 'var(--color-border)';
                  }}
                  title={isCompact ? "Detailed view" : "Compact view"}
                >
                  <FontAwesomeIcon icon={isCompact ? faStop : faLayerGroup} className="w-3 h-3" />
                </button>

                {/* Separator */}
                <div className="w-px h-6 bg-white/20 mx-1"></div>

                {/* Collapse Button - Made more prominent */}
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-2.5 rounded-lg bg-gradient-to-r from-red-500/20 to-red-600/20 
                           hover:from-red-500/30 hover:to-red-600/30 text-red-300 hover:text-red-200 
                           transition-all duration-200 border border-red-500/30 hover:border-red-400/50
                           hover:shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95
                           group relative"
                  title="Collapse sidebar"
                >
                  <FontAwesomeIcon 
                    icon={faChevronLeft} 
                    className="w-3.5 h-3.5 group-hover:animate-pulse" 
                  />
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 rounded-lg bg-red-500/10 opacity-0 group-hover:opacity-100 
                                transition-opacity duration-200 -z-10 blur-sm"></div>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <p style={{ color: 'var(--color-textSecondary)' }}>
                {totalBlocks} blocks • {Object.keys(filteredGroupedBlocks).length} categories
              </p>
              {recommendedBlocks.length > 0 && !showRecommended && (
                <button
                  onClick={() => setShowRecommended(true)}
                  className="transition-colors flex items-center gap-1"
                  style={{ color: 'var(--color-warning)' }}
                  onMouseEnter={(e) => e.target.style.color = '#d97706'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--color-warning)'}
                >
                  <FontAwesomeIcon icon={faLightbulb} className="w-3 h-3" />
                  <span className="text-xs">{recommendedBlocks.length} suggested</span>
                </button>
              )}
            </div>
          </div>
        )}

        {!isCollapsed && (
          <>
            {/* Search Bar */}
            <div className="relative mb-3">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--color-textMuted)' }}
              />
              <input
                type="text"
                placeholder="Search blocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border rounded-lg transition-all focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-textPrimary)',
                  '--tw-ring-color': 'var(--color-accent)'
                }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--color-textMuted)' }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--color-textSecondary)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--color-textMuted)'}
                >
                  <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Collapsible Filters Section */}
            <div className="mb-3">
              {/* Filter Toggle Button */}
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="w-full flex items-center justify-between p-2.5 border rounded-lg transition-all duration-200 hover:shadow-lg group"
                style={{
                  backgroundColor: 'var(--color-secondary)',
                  borderColor: 'var(--color-border)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--color-tertiary)';
                  e.target.style.borderColor = 'var(--color-borderLight)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'var(--color-secondary)';
                  e.target.style.borderColor = 'var(--color-border)';
                }}
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon 
                    icon={faFilter} 
                    className="w-3 h-3 transition-all duration-200"
                    style={{ color: filtersExpanded ? 'var(--color-accent)' : 'var(--color-textSecondary)' }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-textPrimary)' }}>
                    Filters & Sort
                  </span>
                  {(selectedCategory !== 'all' || sortBy !== 'type' || showRecommended) && (
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                  )}
                </div>
                <FontAwesomeIcon
                  icon={filtersExpanded ? faChevronDown : faChevronRight}
                  className="w-3 h-3 transition-all duration-200"
                  style={{ color: 'var(--color-textMuted)' }}
                />
              </button>

              {/* Expandable Filters Content */}
              <div
                className={`transition-all duration-300 ease-out overflow-hidden ${
                  filtersExpanded 
                    ? 'max-h-96 opacity-100 mt-3' 
                    : 'max-h-0 opacity-0 mt-0'
                }`}
              >
                <div 
                  className="space-y-3 p-3 rounded-lg border backdrop-blur-sm"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-tertiary), var(--color-quaternary))',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  {/* Sort Controls */}
                  <div className="space-y-2">
                    <label 
                      className="text-xs font-medium tracking-wide uppercase"
                      style={{ color: 'var(--color-textSecondary)' }}
                    >
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all backdrop-blur-sm"
                      style={{
                        backgroundColor: 'var(--color-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-textPrimary)',
                        '--tw-ring-color': 'var(--color-accent)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-accent)';
                        e.target.style.backgroundColor = 'var(--color-tertiary)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--color-border)';
                        e.target.style.backgroundColor = 'var(--color-secondary)';
                      }}
                    >
                      <option value="type">By Type</option>
                      <option value="name">By Name</option>
                      <option value="popularity">By Usage</option>
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label 
                      className="text-xs font-medium tracking-wide uppercase"
                      style={{ color: 'var(--color-textSecondary)' }}
                    >
                      Categories
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 capitalize hover:scale-105 active:scale-95 border"
                          style={selectedCategory === category 
                            ? {
                                background: 'linear-gradient(135deg, var(--color-accent), var(--color-info))',
                                color: 'white',
                                borderColor: 'var(--color-accent)',
                                boxShadow: `0 4px 12px ${selectedCategory === category ? 'var(--color-accent)' : 'transparent'}25`
                              }
                            : {
                                backgroundColor: 'var(--color-tertiary)',
                                color: 'var(--color-textSecondary)',
                                borderColor: 'var(--color-border)'
                              }
                          }
                          onMouseEnter={(e) => {
                            if (selectedCategory !== category) {
                              e.target.style.backgroundColor = 'var(--color-quaternary)';
                              e.target.style.color = 'var(--color-textPrimary)';
                              e.target.style.borderColor = 'var(--color-borderLight)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedCategory !== category) {
                              e.target.style.backgroundColor = 'var(--color-tertiary)';
                              e.target.style.color = 'var(--color-textSecondary)';
                              e.target.style.borderColor = 'var(--color-border)';
                            }
                          }}
                        >
                          {category === 'all' ? 'All' : category}
                          {category !== 'all' && groupedBlocks[category] && (
                            <span className="ml-1 text-xs opacity-60">
                              ({groupedBlocks[category].length})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>      
      {/* Collapsed State */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-4 space-y-4">
          {/* Expand Button - Made more prominent */}
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-3 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 border group relative"
            style={{
              background: 'linear-gradient(135deg, var(--color-success)20, var(--color-success)30)',
              color: 'var(--color-success)',
              borderColor: 'var(--color-success)30'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, var(--color-success)30, var(--color-success)40)';
              e.target.style.color = 'var(--color-textPrimary)';
              e.target.style.borderColor = 'var(--color-success)50';
              e.target.style.boxShadow = `0 4px 12px var(--color-success)20`;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, var(--color-success)20, var(--color-success)30)';
              e.target.style.color = 'var(--color-success)';
              e.target.style.borderColor = 'var(--color-success)30';
              e.target.style.boxShadow = 'none';
            }}
            title="Expand block library"
          >
            <FontAwesomeIcon 
              icon={faChevronRight} 
              className="w-4 h-4 group-hover:animate-pulse" 
            />
            {/* Subtle glow effect */}
            <div 
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10 blur-sm"
              style={{ backgroundColor: 'var(--color-success)10' }}
            ></div>
          </button>

          {/* Recommendations Badge */}
          {recommendedBlocks.length > 0 && (
            <button
              onClick={() => {
                setIsCollapsed(false);
                setShowRecommended(true);
              }}
              className="p-2.5 rounded-lg transition-all duration-200 border hover:scale-105 active:scale-95 animate-pulse group relative"
              style={{
                background: 'linear-gradient(135deg, var(--color-warning)20, var(--color-warning)30)',
                color: 'var(--color-warning)',
                borderColor: 'var(--color-warning)30'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, var(--color-warning)30, var(--color-warning)40)';
                e.target.style.color = 'var(--color-textPrimary)';
                e.target.style.borderColor = 'var(--color-warning)50';
                e.target.style.boxShadow = `0 4px 12px var(--color-warning)20`;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, var(--color-warning)20, var(--color-warning)30)';
                e.target.style.color = 'var(--color-warning)';
                e.target.style.borderColor = 'var(--color-warning)30';
                e.target.style.boxShadow = 'none';
              }}
              title={`${recommendedBlocks.length} recommended blocks`}
            >
              <FontAwesomeIcon icon={faLightbulb} className="w-3.5 h-3.5" />
              {/* Badge for count */}
              <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-900 text-xs 
                            rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {recommendedBlocks.length}
              </div>
            </button>
          )}

          {/* Category Icons */}
          <div className="flex flex-col items-center space-y-3">
            {Object.entries(groupedBlocks).map(([type, blocks]) => (
              <div
                key={type}
                className="p-2.5 rounded-lg bg-slate-700/30 hover:bg-slate-600/50 text-slate-400 
                         hover:text-white transition-all duration-200 cursor-pointer border 
                         border-slate-600/20 hover:border-slate-500/40 hover:shadow-md 
                         hover:shadow-slate-500/10 hover:scale-105 active:scale-95 group"
                onClick={() => {
                  setIsCollapsed(false);
                  setSelectedCategory(type);
                }}
                title={`${type} (${blocks.length} blocks)`}
              >
                <FontAwesomeIcon icon={getTypeIcon(type)} className="w-4 h-4" />
              </div>
            ))}
          </div>

          {/* Bottom Label */}
          <div className="mt-auto">
            <div className="transform -rotate-90 whitespace-nowrap text-white/40 text-xs font-medium tracking-wider mt-5">
              BLOCKS
            </div>
          </div>
        </div>
      )}

      {/* Block Groups */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden block-palette-scroll">
          <div className="p-4 space-y-3">
            {Object.keys(filteredGroupedBlocks).length === 0 ? (
              <div className="text-center py-8">
                <FontAwesomeIcon icon={faSearch} className="text-white/20 text-3xl mb-4" />
                <p className="text-white/40 text-sm">No blocks found</p>
                <button
                  onClick={clearSearch}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              Object.entries(filteredGroupedBlocks).map(([type, blocks]) => (
                <BlockGroup
                  key={type}
                  title={type}
                  blocks={blocks}
                  isCollapsed={true}
                  isCompact={isCompact}
                  onBlockAdd={handleBlockAdd}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer Stats */}
      {!isCollapsed && (
        <div className="flex-shrink-0 p-4 border-t" style={{ 
          borderColor: 'var(--color-border)', 
          background: 'linear-gradient(to top, var(--color-tertiary), transparent)' 
        }}>
          <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: 'var(--color-textSecondary)' }}>
            <div className="text-center">
              <div className="font-medium" style={{ color: 'var(--color-textPrimary)' }}>{blockStats.total}</div>
              <div>Blocks</div>
            </div>
            <div className="text-center">
              <div className="font-medium" style={{ color: 'var(--color-textPrimary)' }}>{Object.keys(blockStats.byType).length}</div>
              <div>Types</div>
            </div>
            <div className="text-center">
              <div className="font-medium" style={{ color: 'var(--color-textPrimary)' }}>{blocks.length}</div>
              <div>In Use</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockPalette;