import React, { useEffect, useRef, useState } from 'react';
import Tree from 'react-d3-tree';

const PhylogeneticTreeResults = ({ treeData, alignmentData, metadata }) => {
  const treeContainerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [showNewick, setShowNewick] = useState(false);
  const [showInternalNodes, setShowInternalNodes] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [pathToRoot, setPathToRoot] = useState(new Set());
  const [viewMode, setViewMode] = useState('horizontal'); // 'horizontal', 'vertical', 'radial'
  const [filteredTree, setFilteredTree] = useState(null);
  useEffect(() => {
    if (treeContainerRef.current) {
      const { width } = treeContainerRef.current.getBoundingClientRect();
      const height = viewMode === 'radial' ? Math.min(width, 600) : 500;
      setDimensions({ width, height });
      
      if (viewMode === 'radial') {
        setTranslate({ x: width / 2, y: height / 2 });
      } else {
        setTranslate({ x: width / 4, y: height / 2 });
      }
    }
  }, [viewMode]);

  // Filter tree based on internal node visibility
  useEffect(() => {
    const originalTree = parseTreeVisualizationToD3Tree(treeData);
    if (originalTree) {
      const filtered = showInternalNodes ? originalTree : filterInternalNodes(originalTree);
      setFilteredTree(filtered);
    }
  }, [treeData, showInternalNodes]);

  // Find path from a node to root
  const findPathToRoot = (tree, targetNodeId, path = []) => {
    if (!tree) return null;
    
    path.push(tree.id);
    
    if (tree.id === targetNodeId) {
      return [...path];
    }
    
    if (tree.children) {
      for (const child of tree.children) {
        const result = findPathToRoot(child, targetNodeId, [...path]);
        if (result) return result;
      }
    }
    
    return null;
  };

  // Filter out internal nodes while preserving tree structure
  const filterInternalNodes = (node) => {
    if (!node) return null;
    
    const filtered = { ...node, children: [] };
    
    if (node.children) {
      for (const child of node.children) {
        if (child.is_terminal) {
          // Keep terminal nodes
          filtered.children.push(filterInternalNodes(child));
        } else {
          // Skip internal nodes, but include their children
          const grandchildren = filterInternalNodes(child);
          if (grandchildren && grandchildren.children) {
            filtered.children.push(...grandchildren.children);
          }
        }
      }
    }
    
    return filtered;
  };
  // Convert tree to radial layout by transforming node positions
  const convertToRadialLayout = (tree, depth = 0, angle = 0, angleStep = 2 * Math.PI) => {
    if (!tree) return null;
    
    const radius = depth * 80; // Distance from center
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    const radialNode = {
      ...tree,
      x,
      y,
      children: []
    };
    
    if (tree.children && tree.children.length > 0) {
      const childAngleStep = angleStep / tree.children.length;
      tree.children.forEach((child, index) => {
        const childAngle = angle - angleStep / 2 + (index + 0.5) * childAngleStep;
        const radialChild = convertToRadialLayout(child, depth + 1, childAngle, childAngleStep);
        if (radialChild) {
          radialNode.children.push(radialChild);
        }
      });
    }
    
    return radialNode;
  };
  // Get the appropriate tree data based on view mode
  const getTreeForVisualization = () => {
    if (!filteredTree) return null;
    
    if (viewMode === 'radial') {
      // For radial view, we'll use the diagonal path function and circular translation
      return filteredTree;
    }
    
    return filteredTree;
  };

  // Handle node selection
  const handleNodeClick = (nodeData) => {
    const nodeId = nodeData.id || nodeData.name;
    setSelectedNode(nodeId);
    
    // Find path to root
    const originalTree = parseTreeVisualizationToD3Tree(treeData);
    const path = findPathToRoot(originalTree, nodeId);
    if (path) {
      setPathToRoot(new Set(path));
    }
  };

  const handleDownload = (fileType) => {
    if (!treeData?.files) return;
    
    const fileMap = {
      'newick': treeData.files.newick,
      'nexus': treeData.files.nexus,
      'alignment_fasta': treeData.files.alignment_fasta,
      'alignment_phylip': treeData.files.alignment_phylip
    };
    
    const filePath = fileMap[fileType];
    if (filePath) {
      // Create a download link
      const link = document.createElement('a');
      link.href = `/api/download?file=${encodeURIComponent(filePath)}`;
      link.download = filePath.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  // Convert tree visualization data to react-d3-tree format
  const parseTreeVisualizationToD3Tree = (treeData) => {
    if (!treeData || !treeData.visualization) return null;
    
    try {
      const { nodes, edges } = treeData.visualization;
      
      if (!nodes || !edges) return null;
      
      // Create a map of nodes by ID
      const nodeMap = new Map();
      nodes.forEach(node => {
        nodeMap.set(node.id, {
          id: node.id,
          name: node.name,
          is_terminal: node.is_terminal,
          branch_length: node.branch_length,
          depth: node.depth,
          children: []
        });
      });
      
      // Build the tree structure using edges
      edges.forEach(edge => {
        const parent = nodeMap.get(edge.source);
        const child = nodeMap.get(edge.target);
        if (parent && child) {
          parent.children.push(child);
        }
      });
      
      // Find the root node (depth 0)
      const rootNode = nodes.find(node => node.depth === 0);
      if (!rootNode) return null;
      
      return nodeMap.get(rootNode.id);
    } catch (error) {
      console.error('Error parsing tree visualization data:', error);
      return null;
    }
  };  const renderCustomNode = ({ nodeDatum, toggleNode }) => {
    const nodeId = nodeDatum.id || nodeDatum.name;
    const isSelected = selectedNode === nodeId;
    const isInPath = pathToRoot.has(nodeId);
    const isTerminal = nodeDatum.is_terminal;
    
    // Determine node appearance based on state
    let nodeColor = isTerminal ? "#2196F3" : "#4CAF50";
    let strokeColor = "#fff";
    let strokeWidth = 2;
    
    if (isSelected) {
      strokeColor = "#FF9800";
      strokeWidth = 3;
    } else if (isInPath) {
      strokeColor = "#FF5722";
      strokeWidth = 2.5;
    }
    
    return (
      <g>
        {/* Node circle */}
        <circle
          r={isTerminal ? 4 : 6}
          fill={nodeColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          onClick={() => handleNodeClick(nodeDatum)}
          style={{ cursor: 'pointer' }}
        />
        
        {/* Node label */}
        <text
          fill={isSelected || isInPath ? "#000" : "#333"}
          fontWeight={isSelected ? "bold" : isInPath ? "600" : "normal"}
          strokeWidth="0"
          x={isTerminal ? 10 : -10}
          y={isTerminal ? 5 : -10}
          textAnchor={isTerminal ? "start" : "end"}
          fontSize={isTerminal ? "11" : "9"}
          onClick={() => handleNodeClick(nodeDatum)}
          style={{ cursor: 'pointer' }}
        >
          {nodeDatum.name}
        </text>
        
        {/* Branch length */}
        {nodeDatum.branch_length !== undefined && (
          <text
            fill={isSelected || isInPath ? "#000" : "#666"}
            strokeWidth="0"
            x={isTerminal ? 10 : -10}
            y={isTerminal ? 20 : 5}
            textAnchor={isTerminal ? "start" : "end"}
            fontSize="9"
          >
            {nodeDatum.branch_length.toFixed(4)}
          </text>
        )}
      </g>
    );
  };

  if (!treeData) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p>No phylogenetic tree data available</p>
      </div>
    );
  }
  const parsedTree = parseTreeVisualizationToD3Tree(treeData);

  return (
    <div className="p-4 bg-[#1a2b34] rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Phylogenetic Tree</h3>
      
      {/* Tree Controls */}
      <div className="mb-4 p-3 bg-[#233c48] rounded-lg">
        <h4 className="text-sm font-semibold text-[#13a4ec] mb-3">Tree Controls</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* View Mode */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full px-2 py-1 bg-[#1a2a33] text-white text-xs rounded border border-gray-600 focus:border-[#13a4ec]"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
              <option value="radial">Radial (Experimental)</option>
            </select>
            {viewMode === 'radial' && (
              <p className="text-xs text-gray-400 mt-1">
                Radial view uses diagonal paths for better visual flow
              </p>
            )}
          </div>
          
          {/* Internal Nodes Toggle */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">Display Options</label>
            <label className="flex items-center text-xs text-white">
              <input
                type="checkbox"
                checked={showInternalNodes}
                onChange={(e) => setShowInternalNodes(e.target.checked)}
                className="mr-2"
              />
              Show Internal Nodes
            </label>
          </div>
          
          {/* Selection Info */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">Selected Node</label>
            <div className="text-xs text-white">
              {selectedNode ? (
                <div>
                  <span className="text-[#13a4ec]">{selectedNode}</span>
                  <button
                    onClick={() => {
                      setSelectedNode(null);
                      setPathToRoot(new Set());
                    }}
                    className="ml-2 text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <span className="text-gray-400">Click a node to select</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#2196F3] rounded-full mr-1"></div>
              <span className="text-gray-300">Terminal Sequences</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#4CAF50] rounded-full mr-1"></div>
              <span className="text-gray-300">Internal Nodes</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 border-2 border-[#FF9800] rounded-full mr-1"></div>
              <span className="text-gray-300">Selected Node</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 border-2 border-[#FF5722] rounded-full mr-1"></div>
              <span className="text-gray-300">Path to Root</span>
            </div>
          </div>
        </div>
      </div>
        {/* Metadata */}
      {metadata && (
        <div className="mb-4 p-3 bg-[#233c48] rounded-lg">
          <h4 className="text-sm font-semibold text-[#13a4ec] mb-2">Tree Information</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-300">Method:</span>
              <span className="text-white ml-2">{metadata.method || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-300">Distance Model:</span>
              <span className="text-white ml-2">{metadata.distance_model || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-300">Sequences Used:</span>
              <span className="text-white ml-2">{alignmentData?.sequences_used || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-300">Alignment Length:</span>
              <span className="text-white ml-2">{alignmentData?.alignment_length || 'N/A'}</span>
            </div>
            {treeData?.visualization && (
              <>
                <div>
                  <span className="text-gray-300">Tree Depth:</span>
                  <span className="text-white ml-2">{treeData.visualization.max_depth || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-300">Total Nodes:</span>
                  <span className="text-white ml-2">{treeData.visualization.nodes?.length || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}      {/* Tree Visualization */}
      <div className="bg-white rounded-lg p-4" style={{ height: viewMode === 'radial' ? `${dimensions.height}px` : '500px' }}>        <div ref={treeContainerRef} style={{ width: '100%', height: '100%' }}>
          {getTreeForVisualization() && dimensions.width > 0 ? (
            <Tree
              data={getTreeForVisualization()}
              dimensions={dimensions}
              translate={translate}
              renderCustomNodeElement={renderCustomNode}
              orientation={viewMode === 'vertical' ? 'vertical' : 'horizontal'}
              pathFunc={viewMode === 'radial' ? 'diagonal' : 'elbow'}
              separation={{ 
                siblings: viewMode === 'radial' ? 1 : 1.5, 
                nonSiblings: viewMode === 'radial' ? 1.5 : 2 
              }}
              nodeSize={{ 
                x: viewMode === 'radial' ? 120 : 180, 
                y: viewMode === 'radial' ? 120 : 80 
              }}
              zoom={viewMode === 'radial' ? 0.6 : 0.7}
              enableLegacyTransitions={true}
              transitionDuration={500}
              scaleExtent={{ min: 0.1, max: 2 }}
              zoomable={true}
              draggable={true}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="mb-2">Unable to render phylogenetic tree</p>
                <p className="text-sm">Tree visualization data may be incomplete</p>
              </div>
            </div>
          )}        </div>
      </div>{/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-4 p-3 bg-[#233c48] rounded-lg">
          <h4 className="text-sm font-semibold text-[#13a4ec] mb-2">Selected Node Details</h4>
          <div className="text-xs text-white">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-300">Node ID:</span>
                <span className="ml-2 font-mono">{selectedNode}</span>
              </div>
              <div>
                <span className="text-gray-300">Path Length:</span>
                <span className="ml-2">{pathToRoot.size} nodes</span>
              </div>
            </div>
            {pathToRoot.size > 0 && (
              <div className="mt-2">
                <span className="text-gray-300">Path to Root:</span>
                <div className="mt-1 font-mono text-[#13a4ec] break-all">
                  {Array.from(pathToRoot).join(' → ')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminal Sequences (Leaves) */}
      {treeData?.visualization?.nodes && (
        <div className="mt-4 p-3 bg-[#233c48] rounded-lg">
          <h4 className="text-sm font-semibold text-[#13a4ec] mb-2">Terminal Sequences in Tree</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {treeData.visualization.nodes
              .filter(node => node.is_terminal)
              .map((node, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-[#1a2a33] rounded">
                  <div className="flex flex-col">
                    <span className="text-white text-xs font-mono">{node.name}</span>
                    <span className="text-gray-400 text-xs">Depth: {node.depth}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[#13a4ec] text-xs">
                      Branch: {node.branch_length ? node.branch_length.toFixed(4) : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sequence Information from Alignment Data */}
      {alignmentData?.sequence_info && (
        <div className="mt-4 p-3 bg-[#233c48] rounded-lg">
          <h4 className="text-sm font-semibold text-[#13a4ec] mb-2">Sequence Details</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {alignmentData.sequence_info.map((seq, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-[#1a2a33] rounded">
                <div className="flex flex-col">
                  <span className="text-white text-xs font-mono">{seq.id}</span>
                  <span className="text-gray-400 text-xs">{seq.name}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[#13a4ec] text-xs">{(seq.identity).toFixed(3)}%</span>
                  <span className="text-gray-400 text-xs">{seq.database}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download Section */}
      {treeData?.files && (
        <div className="mt-4 p-3 bg-[#233c48] rounded-lg">
          <h4 className="text-sm font-semibold text-[#13a4ec] mb-2">Download Files</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDownload('newick')}
              className="px-3 py-2 bg-[#13a4ec] text-white rounded text-xs hover:bg-[#0e7bb8] transition-colors"
            >
              Download Tree (Newick)
            </button>
            <button
              onClick={() => handleDownload('nexus')}
              className="px-3 py-2 bg-[#13a4ec] text-white rounded text-xs hover:bg-[#0e7bb8] transition-colors"
            >
              Download Tree (Nexus)
            </button>
            <button
              onClick={() => handleDownload('alignment_fasta')}
              className="px-3 py-2 bg-[#4CAF50] text-white rounded text-xs hover:bg-[#45a049] transition-colors"
            >
              Download Alignment (FASTA)
            </button>
            <button
              onClick={() => handleDownload('alignment_phylip')}
              className="px-3 py-2 bg-[#4CAF50] text-white rounded text-xs hover:bg-[#45a049] transition-colors"
            >
              Download Alignment (PHYLIP)
            </button>
          </div>
        </div>
      )}      {/* Newick Format Display */}
      {treeData.newick && (
        <div className="mt-4 p-3 bg-[#233c48] rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-[#13a4ec]">Newick Format</h4>
            <button
              onClick={() => setShowNewick(!showNewick)}
              className="text-xs text-[#13a4ec] hover:text-white transition-colors"
            >
              {showNewick ? 'Hide' : 'Show'}
            </button>
          </div>
          {showNewick && (
            <div className="bg-black/20 p-2 rounded font-mono text-xs text-white break-all max-h-32 overflow-y-auto">
              {treeData.newick}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhylogeneticTreeResults;
