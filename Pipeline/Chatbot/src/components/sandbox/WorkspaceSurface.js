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
  const containerRef = useRef(null);       // outer container for events
  const contentRef = useRef(null);         // inner transformed content
  const [connecting, setConnecting] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);
  const [blockPositions, setBlockPositions] = useState({});
  const [blockDimensions, setBlockDimensions] = useState({});

  // zoom & pan state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Update block positions and dimensions when blocks change
  useEffect(() => {
    const newPositions = {};
    const newDimensions = {};
    blocks.forEach(block => {
      newPositions[block.id] = block.position;
      newDimensions[block.id] = {
        width: block.width || 300,
        height: block.height || 250
      };
    });
    setBlockPositions(newPositions);
    setBlockDimensions(newDimensions);
  }, [blocks]);

  // Enable drop on content container
  const [, drop] = useDrop({
    accept: 'BLOCK_TYPE',
    drop: (item, monitor) => {
      const client = monitor.getClientOffset();
      const rect = contentRef.current.getBoundingClientRect();
      // convert screen coords to content coords
      const x = (client.x - rect.left - offset.x) / scale;
      const y = (client.y - rect.top - offset.y) / scale;
      addBlock(item.blockType, { x, y });
    },
    collect: monitor => ({ isOver: !!monitor.isOver() })
  });

  // Handle wheel zoom only when not over a block
  const handleWheel = e => {
    if (e.target.closest('.job-block')) return;  // inside block: skip
    e.preventDefault();
    const rect = contentRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left - offset.x) / scale;
    const cy = (e.clientY - rect.top - offset.y) / scale;
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(scale * delta, 0.5), 2);
    setScale(newScale);
    setOffset(prev => ({
      x: prev.x - cx * (delta - 1) * scale,
      y: prev.y - cy * (delta - 1) * scale
    }));
  };

  // Pan with right mouse button
  const handleMouseDown = e => {
    if (e.button === 2 && !e.target.closest('.job-block')) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      document.body.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = e => {
    if (isPanning.current) {
      setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
    if (connecting) {
      const rect = contentRef.current.getBoundingClientRect();
      setConnecting({
        ...connecting,
        cursorPosition: {
          x: (e.clientX - rect.left - offset.x) / scale,
          y: (e.clientY - rect.top - offset.y) / scale
        }
      });
    }
  };

  const handleMouseUp = e => {
    if (e.button === 2 && isPanning.current) {
      isPanning.current = false;
      document.body.style.cursor = 'default';
    }
    if (connecting && !hoverTarget) {
      setConnecting(null);
    }
  };

  // Prevent default context menu on container
  const handleContextMenu = e => {
    if (containerRef.current.contains(e.target)) {
      e.preventDefault();
    }
  };

  // Start connecting blocks (from an output port)
  const handleStartConnection = (blockId, outputType) => {
    setConnecting({
      sourceBlockId: blockId,
      outputType,
      cursorPosition: { x: 0, y: 0 }
    });
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
    let targetY = 0;
    
    if (targetBlockType.id === 'multi_download') {
      const inputIndex = targetBlockType.inputs.indexOf(inputType.split('_')[0]);
      const baseY = blockPositions[targetBlockId]?.y + 60 + (inputIndex * 24) || 0;
      const targetConnections = connections[targetBlockId] || {};
      const connectionKeys = Object.keys(targetConnections);
      const currentIndex = connectionKeys.indexOf(inputType);
      targetY = baseY + (currentIndex * 4);
    } else {
      const inputIndex = targetBlockType.inputs.indexOf(inputType);
      targetY = blockPositions[targetBlockId]?.y + 60 + (inputIndex * 24) || 0;
    }
    
    return {
      start: { 
        x: blockPositions[sourceBlockId]?.x + (blockDimensions[sourceBlockId]?.width || 250) || 0, 
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

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-[#0a1218] p-4 overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{ position: 'relative' }}
    >
      <div
        ref={el => { drop(el); contentRef.current = el; }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          minWidth: '200%',
          minHeight: '200%'
        }}
      >
        {/* Connection Lines */}
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
              x: blockPositions[connecting.sourceBlockId]?.x + 250 || 0,
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
            setDimensions={setBlockDimensions}
            onDeleteBlock={onDeleteBlock}
            connections={connections}
            loopConfig={loopConfig}
            setLoopConfig={setLoopConfig}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkspaceSurface; 