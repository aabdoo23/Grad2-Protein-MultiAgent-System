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
    selectedEdges: [],    // Actions
    addBlock: (block) => {
      set((state) => {
        const newBlock = {
          ...block,
          type: block.blockTypeId || block.type,
          blockTypeId: block.blockTypeId || block.type,
          // Set default preserveOnReset value based on block type
          preserveOnReset: ['file_upload', 'blast_db_builder'].includes(block.blockTypeId || block.type),
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
        Object.entries(state.connections).map(([targetBlockId, targetBlockConnections]) => [
          targetBlockId,
          Object.fromEntries(
            Object.entries(targetBlockConnections).map(([port, connOrArray]) => {
              if (Array.isArray(connOrArray)) {
                // Filter out connections from the deleted block
                const filteredConns = connOrArray.filter(c => c.source !== id);
                return filteredConns.length > 0 ? [port, filteredConns] : null;
              } else {
                // If it's an object, check if its source is the deleted block
                return connOrArray.source !== id ? [port, connOrArray] : null;
              }
            }).filter(Boolean) // Remove null entries (ports that became empty)
          )
        ]).map(([targetBlockId, conns]) => Object.keys(conns).length > 0 ? [targetBlockId, conns] : null).filter(Boolean)
      );
    }),

    connectBlocks: (connection) => set((state) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      const sourceBlock = state.blocks.find(b => b.id === source);
      const targetBlock = state.blocks.find(b => b.id === target);

      if (!sourceBlock || !targetBlock) {
        console.warn('ConnectBlocks: Source or target block not found', connection);
        return;
      }

      if (!state.connections[target]) {
        state.connections[target] = {};
      }

      if (targetBlock.type === 'multi_download') {
        if (!Array.isArray(state.connections[target][targetHandle])) {
          state.connections[target][targetHandle] = []; // Initialize or reset to array
        }
        // Add new connection if it doesn't already exist (optional, prevents duplicates)
        if (!state.connections[target][targetHandle].some(c => c.source === source && c.sourceHandle === sourceHandle)) {
            state.connections[target][targetHandle].push({ source, sourceHandle });
        }
      } else {
        // For non-multi_download blocks, overwrite or set the single connection
        state.connections[target][targetHandle] = { source, sourceHandle };
      }
      
      try {
        console.log('connectBlocks store: Updated connections:', JSON.parse(JSON.stringify(state.connections)));
      } catch (e) {
        console.error('Error logging connections state:', e);
      }
    }),

    deleteConnection: (source, target, targetHandle) => set((state) => {
      if (!state.connections[target] || !state.connections[target][targetHandle]) return;

      const targetBlock = get().blocks.find(b => b.id === target);

      if (targetBlock && targetBlock.type === 'multi_download') {
        if (Array.isArray(state.connections[target][targetHandle])) {
          state.connections[target][targetHandle] = state.connections[target][targetHandle].filter(
            conn => conn.source !== source // Simple removal for now, could be more specific if needed
          );
          if (state.connections[target][targetHandle].length === 0) {
            delete state.connections[target][targetHandle];
          }
        }
      } else {
        // For non-multi_download blocks, it's a single object or was incorrectly an array
        // This ensures we just delete the handle if the source matches
        const conn = state.connections[target][targetHandle];
        if(typeof conn === 'object' && conn !== null && !Array.isArray(conn) && conn.source === source){
            delete state.connections[target][targetHandle];
        }
      }

      if (Object.keys(state.connections[target]).length === 0) {
        delete state.connections[target];
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
    },    clearWorkspace: () => set((state) => {
      console.warn('🚨 clearWorkspace called! Clearing all blocks and connections.');
      state.blocks = [];
      state.connections = {};
      state.selectedNodes = [];
      state.selectedEdges = [];
      // Optionally reset viewport, or leave it as is
      // state.viewport = { x: 0, y: 0, zoom: 1 }; 
      console.log('Workspace cleared in store');
    }),
  }))
);

export default useWorkspaceStore;