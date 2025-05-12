import React, { useRef, useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import JobBlock from './JobBlock';
import ConnectionLine from './ConnectionLine';

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
  loopConfig,
  setLoopConfig
}) => {
  const surfaceRef = useRef(null);
  const [connecting, setConnecting] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);
  const [blockPositions, setBlockPositions] = useState({});
  const [blockDimensions, setBlockDimensions] = useState({});

  // Update block positions when blocks change
  useEffect(() => {
    const newPositions = {};
    const newDimensions = {};
    blocks.forEach(block => {
      newPositions[block.id] = block.position;
      newDimensions[block.id] = {
        width: block.width || 200,
        height: block.height || 200
      };
    });
    setBlockPositions(newPositions);
    setBlockDimensions(newDimensions);
  }, [blocks]);

  // Handle dropping a block onto the workspace
  const [, drop] = useDrop({
    accept: 'BLOCK_TYPE',
    drop: (item, monitor) => {
      const offset = monitor.getSourceClientOffset();
      const surfaceRect = surfaceRef.current.getBoundingClientRect();
      
      const position = {
        x: offset.x - surfaceRect.left,
        y: offset.y - surfaceRect.top
      };
      
      addBlock(item.blockType, position);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  // Start connecting blocks (from an output port)
  const handleStartConnection = (blockId, outputType) => {
    setConnecting({
      sourceBlockId: blockId,
      outputType,
      cursorPosition: { x: 0, y: 0 }
    });
  };

  // Update the connection line while dragging
  const handleMouseMove = (e) => {
    if (connecting) {
      const rect = surfaceRef.current.getBoundingClientRect();
      setConnecting({
        ...connecting,
        cursorPosition: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
      });
    }
  };

  // Set hover target when over an input port
  const handleInputPortHover = (blockId, inputType, isHovering) => {
    if (connecting && isHovering) {
      setHoverTarget({ blockId, inputType });
    } else if (hoverTarget && hoverTarget.blockId === blockId && hoverTarget.inputType === inputType) {
      setHoverTarget(null);
    }
  };

  // Complete the connection when clicking on an input port
  const handleCompleteConnection = (targetBlockId, inputType) => {
    if (connecting) {
      // Validate the connection: make sure output type matches input type
      const sourceBlock = blocks.find(b => b.id === connecting.sourceBlockId);
      const targetBlock = blocks.find(b => b.id === targetBlockId);
      
      if (!sourceBlock || !targetBlock) return;
      
      const sourceBlockType = getBlockTypeById(sourceBlock.type);
      const targetBlockType = getBlockTypeById(targetBlock.type);
      
      if (!sourceBlockType || !targetBlockType) return;
      
      // For multi-download block, we allow any output type to connect to any input
      if (targetBlockType.id === 'multi_download') {
        connectBlocks(
          connecting.sourceBlockId,
          targetBlockId,
          connecting.outputType,
          inputType
        );
        setConnecting(null);
        return;
      }
      
      // For other blocks, make sure the output and input types match
      if (connecting.outputType !== inputType && connecting.outputType !== '*' && inputType !== '*') {
        console.warn(`Type mismatch: trying to connect ${connecting.outputType} to ${inputType}`);
        setConnecting(null);
        return;
      }
      
      // All good, create the connection
      connectBlocks(
        connecting.sourceBlockId,
        targetBlockId,
        connecting.outputType,
        inputType
      );
      setConnecting(null);
    }
  };

  // Cancel the connection on mouse up anywhere (except on input ports)
  const handleMouseUp = (e) => {
    if (connecting && !hoverTarget) {
      setConnecting(null);
    }
  };

  // Get block of a specific type
  const getBlockTypeById = (typeId) => {
    return blockTypes.find(bt => bt.id === typeId);
  };

  // Get source and target positions for connection lines
  const getConnectionPoints = (sourceBlockId, targetBlockId, outputType, inputType) => {
    const sourceBlock = blocks.find(b => b.id === sourceBlockId);
    const targetBlock = blocks.find(b => b.id === targetBlockId);
    
    if (!sourceBlock || !targetBlock) {
      return { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    }
    
    const sourceBlockType = getBlockTypeById(sourceBlock.type);
    const targetBlockType = getBlockTypeById(targetBlock.type);
    
    if (!sourceBlockType || !targetBlockType) {
      return { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    }
    
    // Calculate output port position (right side of source block)
    const outputIndex = sourceBlockType.outputs.indexOf(outputType);
    const sourceY = blockPositions[sourceBlockId]?.y + 60 + (outputIndex * 24) || 0;
    
    // For multi_download block, add a small offset to each connection to the same input
    // This helps visualize multiple connections to the same input point
    let targetY = 0;
    
    if (targetBlockType.id === 'multi_download') {
      // Get the base input position
      const inputIndex = targetBlockType.inputs.indexOf(inputType.split('_')[0]);
      const baseY = blockPositions[targetBlockId]?.y + 60 + (inputIndex * 24) || 0;
      
      // Get all connections to this target block
      const targetConnections = connections[targetBlockId] || {};
      
      // Find the index of this specific connection
      const connectionKeys = Object.keys(targetConnections);
      const currentIndex = connectionKeys.indexOf(inputType);
      
      // Apply a small offset based on the connection index
      targetY = baseY + (currentIndex * 4);
    } else {
      // For regular blocks, use the normal input port position
      const inputIndex = targetBlockType.inputs.indexOf(inputType);
      targetY = blockPositions[targetBlockId]?.y + 60 + (inputIndex * 24) || 0;
    }
    
    return {
      start: { 
        x: blockPositions[sourceBlockId]?.x + (blockDimensions[sourceBlockId]?.width || 200) || 0, 
        y: sourceY 
      },
      end: { 
        x: blockPositions[targetBlockId]?.x || 0, 
        y: targetY
      }
    };
  };

  // Handle block position update
  const handleBlockPositionUpdate = (blockId, position) => {
    setBlockPositions(prev => ({
      ...prev,
      [blockId]: position
    }));
  };

  // Handle block resize
  const handleBlockResize = (blockId, dimensions) => {
    setBlockDimensions(prev => ({
      ...prev,
      [blockId]: dimensions
    }));
    if (updateBlock) {
      updateBlock(blockId, { width: dimensions.width, height: dimensions.height });
    }
  };

  // DEBUG: Log connections when they change
  useEffect(() => {
    console.log('Current connections:', connections);
  }, [connections]);

  return (
    <div 
      ref={(el) => {
        drop(el);
        surfaceRef.current = el;
      }}
      className="h-full w-full bg-[#0a1218] p-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ position: 'relative', minHeight: '100%', minWidth: '100%' }}
    >
      {/* Connection Lines - Render these first so they appear below blocks */}
      {Object.entries(connections).map(([targetBlockId, inputConnections]) => 
        Object.entries(inputConnections).map(([inputType, connection]) => {
          const points = getConnectionPoints(
            connection.blockId,
            targetBlockId,
            connection.outputType,
            inputType
          );
          
          return (
            <ConnectionLine
              key={`${connection.blockId}-${targetBlockId}-${inputType}`}
              start={points.start}
              end={points.end}
              color={getBlockTypeById(blocks.find(b => b.id === connection.blockId)?.type)?.color || '#ffffff'}
            />
          );
        })
      )}
      
      {/* Dragging Connection Line */}
      {connecting && (
        <ConnectionLine
          start={{
            x: blockPositions[connecting.sourceBlockId]?.x + 200 || 0,
            y: blockPositions[connecting.sourceBlockId]?.y + 60 + 
              (getBlockTypeById(blocks.find(b => b.id === connecting.sourceBlockId)?.type)?.outputs.indexOf(connecting.outputType) * 24 || 0)
          }}
          end={
            hoverTarget ? 
            getConnectionPoints(
              connecting.sourceBlockId, 
              hoverTarget.blockId, 
              connecting.outputType, 
              hoverTarget.inputType
            ).end :
            connecting.cursorPosition
          }
          color={getBlockTypeById(blocks.find(b => b.id === connecting.sourceBlockId)?.type)?.color || '#ffffff'}
          dashed={true}
        />
      )}
      
      {/* Blocks */}
      {blocks.map(block => (
        <JobBlock
          key={block.id}
          block={block}
          blockType={getBlockTypeById(block.type)}
          onStartConnection={handleStartConnection}
          onCompleteConnection={handleCompleteConnection}
          onInputPortHover={handleInputPortHover}
          onRunBlock={() => runBlock(block.id)}
          onUpdateParameters={(parameters) => updateBlockParameters(block.id, parameters)}
          blockOutput={blockOutputs[block.id]}
          isConnecting={connecting !== null}
          onPositionUpdate={handleBlockPositionUpdate}
          onResize={handleBlockResize}
          onDeleteBlock={onDeleteBlock}
          connections={connections}
          loopConfig={loopConfig}
          setLoopConfig={setLoopConfig}
        />
      ))}
    </div>
  );
};

export default WorkspaceSurface; 