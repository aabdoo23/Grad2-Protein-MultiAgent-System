import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import JobBlock from './JobBlock';
import useWorkspaceStore from '../../store/workspaceStore';

const nodeTypes = {
  jobBlock: JobBlock,
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
  initViewer
}) => {
  const {
    updateViewport,
    setSelectedNodes,
    setSelectedEdges,
    layoutBlocks,
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
        initViewer
      },
    };
  };

  const initialNodes = blocks.map(createNodeFromBlock);

  // Generate edges from connections data
  const initialEdges = React.useMemo(() => {
    const edges = [];
    Object.entries(connections).forEach(([targetId, targetConnections]) => {
      Object.entries(targetConnections).forEach(([targetHandle, connection]) => {
        if (connection) {
          edges.push({
            id: `e-${connection.source}-${targetId}-${targetHandle}`,
            source: connection.source,
            target: targetId,
            sourceHandle: connection.sourceHandle,
            targetHandle: targetHandle,
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
      Object.entries(targetConnections).forEach(([targetHandle, connection]) => {
        if (connection) {
          newEdges.push({
            id: `e-${connection.source}-${targetId}-${targetHandle}`,
            source: connection.source,
            target: targetId,
            sourceHandle: connection.sourceHandle,
            targetHandle: targetHandle,
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
    connectBlocks(params);
    setEdges((eds) => addEdge(params, eds));
  }, [connectBlocks, setEdges]);

  const onEdgesDelete = useCallback((deletedEdges) => {
    deletedEdges.forEach(edge => {
      deleteConnection(edge.source, edge.target, edge.targetHandle);
    });
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
        onMove={onMove}
        onSelectionChange={onSelectionChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.5}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background />
        <Controls />
        <MiniMap />
        {/* <Panel position="top-right">
          <button
            onClick={layoutBlocks}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Layout Blocks
          </button>
        </Panel> */}
      </ReactFlow>
    </div>
  );
};

export default WorkspaceSurface; 