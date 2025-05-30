import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';

import JobBlock from './JobBlock';
import useWorkspaceStore from '../../store/workspaceStore';

const getPortType = (handleId) => {
  if (!handleId) return 'any';
  if (handleId === 'input') return 'any';
  return handleId.split('_')[0]; 
};

const nodeTypes = {
  jobBlock: JobBlock,
};

const defaultEdgeOptions = {
  style: {
    stroke: '#e9c46a',
    strokeWidth: 4,
  },
  animated: true,
  zIndex: 1000,
};

const edgeStyles = {
  default: {
    stroke: '#13a4ec',
    strokeWidth: 4,
  },
  animated: {
    stroke: '#13a4ec',
    strokeWidth: 4,
    strokeDasharray: '5,5',
  },
};

const WorkspaceSurface = ({ 
  blocks, 
  blockTypes, 
  connections, 
  addBlock, 
  connectBlocks, 
  runBlock,
  updateBlockParameters,
  blockOutputs,
  updateBlock,
  onDeleteBlock,
  deleteConnection,
  loopConfig,
  setLoopConfig,
  formatMetric,
  initViewer,
  onClearBlockOutput
}) => {
  const {
    updateViewport,
    setSelectedNodes,
    setSelectedEdges,
  } = useWorkspaceStore();

  const findBlockType = (typeId) => {
    const foundType = blockTypes.find(bt => {
      return bt.id === typeId;
    });
    return foundType || {
      id: 'unknown',
      name: 'Unknown Block',
      color: '#4B5563',
      inputs: [],
      outputs: [],
      config: null,
    };
  };

  const createNodeFromBlock = (block) => {
    return {
      id: block.id,
      type: 'jobBlock',
      position: block.position || { x: 0, y: 0 },
      data: {
        ...block,
        blockType: findBlockType(block.blockTypeId || block.type),
        onRunBlock: () => runBlock(block.id),
        onUpdateParameters: (params) => updateBlockParameters(block.id, params),
        onDeleteBlock: () => onDeleteBlock(block.id),
        updateBlock: (updates) => updateBlock(block.id, updates),
        blockOutput: blockOutputs[block.id],
        loopConfig,
        setLoopConfig,
        formatMetric,
        initViewer,
        onClearOutput: () => onClearBlockOutput(block.id)
      },
    };
  };

  const initialNodes = blocks.map(createNodeFromBlock);

  // Generate edges from connections data with enhanced styling
  const initialEdges = React.useMemo(() => {
    const edges = [];
    Object.entries(connections).forEach(([targetId, targetConnections]) => {
      Object.entries(targetConnections).forEach(([targetHandle, conns]) => {
        if (conns) {
          const connectionArray = Array.isArray(conns) ? conns : [conns]; // Ensure it's an array
          connectionArray.forEach((connection, index) => {
            if (connection && connection.source) { // Check if connection and source exist
              edges.push({
                id: `e-${connection.source}-${targetId}-${targetHandle}-${index}`,
                source: connection.source,
                target: targetId,
                sourceHandle: connection.sourceHandle,
                targetHandle: targetHandle,
                style: edgeStyles.default,
                animated: true,
                zIndex: 1000,
                markerEnd: {
                  type: 'arrowclosed',
                  color: '#13a4ec',
                },
              });
            }
          });
        }
      });
    });
    return edges;
  }, [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when blocks or connections change
  useEffect(() => {
    const newNodes = blocks.map(createNodeFromBlock);
    setNodes(newNodes);

    const newEdges = [];
    Object.entries(connections).forEach(([targetId, targetConnections]) => {
      Object.entries(targetConnections).forEach(([targetHandle, conns]) => {
        if (conns) {
          const connectionArray = Array.isArray(conns) ? conns : [conns];
          connectionArray.forEach((connection, index) => {
            if (connection && connection.source) {
              newEdges.push({
                id: `e-${connection.source}-${targetId}-${targetHandle}-${index}`,
                source: connection.source,
                target: targetId,
                sourceHandle: connection.sourceHandle,
                targetHandle: targetHandle,
              });
            }
          });
        }
      });
    });
    setEdges(newEdges);
  }, [blocks, connections, blockOutputs, blockTypes, runBlock, updateBlockParameters, onDeleteBlock, loopConfig, setLoopConfig, setNodes, setEdges]);

  const onNodeDragStop = useCallback((event, node) => {
    updateBlock(node.id, { position: node.position });
  }, [updateBlock]);

  const onConnect = useCallback((params) => {
    // isValidConnection will be checked by ReactFlow before this is called if provided
    connectBlocks(params);
    // setEdges((eds) => addEdge(params, eds)); // This might be redundant if isValidConnection works correctly
  }, [connectBlocks, setEdges]);

  const onEdgesDelete = useCallback((deletedEdges) => {
    deletedEdges.forEach(edge => {
      deleteConnection(edge.source, edge.target, edge.targetHandle);
    });
  }, [deleteConnection]);

  const onEdgeClick = useCallback((event, edge) => {
    // Optional: Add a confirmation dialog here if desired
    // For now, directly delete the connection
    deleteConnection(edge.source, edge.target, edge.targetHandle);
  }, [deleteConnection]);

  const onNodesDelete = useCallback((nodesToDelete) => {
    nodesToDelete.forEach(node => onDeleteBlock(node.id));
  }, [onDeleteBlock]);

  const onMove = useCallback((event, viewport) => {
    updateViewport(viewport);
  }, [updateViewport]);

  const onSelectionChange = useCallback(({ nodes, edges }) => {
    setSelectedNodes(nodes);
    setSelectedEdges(edges);
  }, [setSelectedNodes, setSelectedEdges]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = event.target.getBoundingClientRect();
      const blockType = JSON.parse(event.dataTransfer.getData('application/reactflow'));

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newBlock = {
        id: `block-${Date.now()}`,
        blockTypeId: blockType.id, // This should be the block type ID (e.g., 'sequence_iterator')
        type: blockType.id, // Keep this for backwards compatibility
        position,
        parameters: {},
        status: 'idle',
      };

      addBlock(newBlock);
    },
    [addBlock]
  );

  const isValidConnection = useCallback(
    (connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) {
        return false;
      }

      if (targetNode.data.blockType.id !== 'multi_download') {
        const existingConnectionsToHandle = edges.filter(
          (edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle
        );
        if (existingConnectionsToHandle.length > 0) {
          console.log('Validation: Target handle already has a connection.');
          return false;
        }
      }

      const sourcePortType = getPortType(connection.sourceHandle);
      const targetPortType = getPortType(connection.targetHandle);
      
      // console.log(`Validating connection: ${sourceNode.data.blockType.id}(${connection.sourceHandle}:${sourcePortType}) -> ${targetNode.data.blockType.id}(${connection.targetHandle}:${targetPortType})`);

      if (sourcePortType !== 'any' && targetPortType !== 'any' && sourcePortType !== targetPortType) {
        // console.log('Validation: Port types do not match.', sourcePortType, targetPortType);
        return false;
      }

      return true;
    },
    [nodes, edges]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onEdgeClick={onEdgeClick}
        onMove={onMove}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        isValidConnection={isValidConnection}
        // fitView
        attributionPosition="bottom-right"
        minZoom={0.25}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        elementsSelectable={true}
        nodesDraggable={true}
        nodesConnectable={true}
        selectNodesOnDrag={false}
      >
        <Background/>
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default WorkspaceSurface; 