import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import dagre from 'dagre';

const useWorkspaceStore = create(
  immer((set, get) => ({
    // State
    blocks: [],
    connections: {}, // Changed to an object of objects
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodes: [],
    selectedEdges: [],

    // Actions
    addBlock: (block) => {
      set((state) => {
        const newBlock = {
          ...block,
          type: block.blockTypeId || block.type,
          blockTypeId: block.blockTypeId || block.type,
        };
        state.blocks.push(newBlock);
        state.connections[newBlock.id] = {}; // Initialize connections for the new block
      });
    },

    updateBlock: (id, updates) => set((state) => {
      const block = state.blocks.find(b => b.id === id);
      if (block) {
        Object.assign(block, updates);
      }
    }),

    deleteBlock: (id) => set((state) => {
      state.blocks = state.blocks.filter(b => b.id !== id);
      delete state.connections[id]; // Remove connections for the deleted block
      // Also remove any edges connected to this node
      state.connections = Object.fromEntries(
        Object.entries(state.connections).map(([key, connections]) => [
          key,
          Object.fromEntries(
            Object.entries(connections).filter(([port, conn]) => conn.source !== id && conn.target !== id)
          ),
        ])
      );
    }),

    connectBlocks: (connection) => set((state) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      const sourceBlock = state.blocks.find(b => b.id === source);
      const targetBlock = state.blocks.find(b => b.id === target);

      if (!sourceBlock || !targetBlock) return;

      if (sourceHandle && targetHandle) {
        if (!state.connections[target]) {
          state.connections[target] = {};
        }
        state.connections[target][targetHandle] = {
          source,
          sourceHandle,
        };
      }
      // Use JSON.parse(JSON.stringify(...)) for reliable logging of immer draft state
      try {
        console.log('connectBlocks store: Updated connections:', JSON.parse(JSON.stringify(state.connections)));
      } catch (e) {
        console.error('Error logging connections state:', e);
        // Fallback or simplified logging if stringify fails (e.g., circular refs, though unlikely for this structure)
        console.log('connectBlocks store: Could not stringify connections. Target involved:', target);
      }
    }),

    deleteConnection: (source, target, targetHandle) => set((state) => {
      if (state.connections[target] && state.connections[target][targetHandle]) {
        delete state.connections[target][targetHandle];
      }
    }),

    updateViewport: (viewport) => set((state) => {
      state.viewport = viewport;
    }),

    setSelectedNodes: (nodes) => set((state) => {
      state.selectedNodes = nodes;
    }),

    setSelectedEdges: (edges) => set((state) => {
      state.selectedEdges = edges;
    }),

    layoutBlocks: () => {
      const { blocks, connections } = get();
      const g = new dagre.graphlib.Graph();
      g.setGraph({
        rankdir: 'LR',
        nodesep: 100,
        ranksep: 100,
        marginx: 50,
        marginy: 50,
      });
      g.setDefaultEdgeLabel(() => ({}));

      blocks.forEach(block => {
        g.setNode(block.id, {
          width: block.width || 300,
          height: block.height || 200,
        });
      });

      Object.entries(connections).forEach(([target, targetConnections]) => {
        Object.entries(targetConnections).forEach(([targetHandle, connection]) => {
          if (connection) {
            g.setEdge(connection.source, target);
          }
        });
      });

      dagre.layout(g);

      set((state) => {
        blocks.forEach(block => {
          const node = g.node(block.id);
          if (node) {
            block.position = { x: node.x, y: node.y };
          }
        });
      });
    },
  }))
);

export default useWorkspaceStore;