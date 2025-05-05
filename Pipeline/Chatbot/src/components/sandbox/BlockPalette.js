import React from 'react';
import { useDrag } from 'react-dnd';

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
      className="p-2 mb-3 rounded cursor-move"
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: blockType.color,
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
      }}
    >
      <h4 className="text-white font-bold text-sm mb-1">{blockType.name}</h4>
      <p className="text-white text-xs">{blockType.description}</p>
      <div className="mt-2 text-xs">
        {blockType.inputs.length > 0 ? (
          <div className="text-white opacity-80">
            Inputs: {blockType.inputs.join(', ')}
          </div>
        ) : (
          <div className="text-white opacity-80">No inputs required</div>
        )}
        {blockType.outputs.length > 0 && (
          <div className="text-white opacity-80">
            Outputs: {blockType.outputs.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};

const BlockPalette = ({ blockTypes }) => {
  return (
    <div className="space-y-2">
      {blockTypes.map((blockType) => (
        <BlockType key={blockType.id} blockType={blockType} />
      ))}
    </div>
  );
};

export default BlockPalette; 