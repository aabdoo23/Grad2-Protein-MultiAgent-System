// Block palette utilities and helpers
export const getBlockStats = (blockTypes) => {
  const stats = {
    total: blockTypes.length,
    byType: {},
    totalInputs: 0,
    totalOutputs: 0,
  };

  blockTypes.forEach(block => {
    // Count by type
    if (!stats.byType[block.type]) {
      stats.byType[block.type] = 0;
    }
    stats.byType[block.type]++;
    
    // Count inputs/outputs
    stats.totalInputs += block.inputs.length;
    stats.totalOutputs += block.outputs.length;
  });

  return stats;
};

export const sortBlocksByPopularity = (blocks, usageStats = {}) => {
  return [...blocks].sort((a, b) => {
    const aUsage = usageStats[a.id] || 0;
    const bUsage = usageStats[b.id] || 0;
    
    if (aUsage !== bUsage) {
      return bUsage - aUsage; // Most used first
    }
    
    // Fallback to alphabetical
    return a.name.localeCompare(b.name);
  });
};

export const filterBlocksByCompatibility = (blocks, selectedBlockType) => {
  if (!selectedBlockType) return blocks;
  
  return blocks.filter(block => {
    // Check if any outputs of selectedBlockType match any inputs of this block
    const hasCompatibleInput = selectedBlockType.outputs.some(output =>
      block.inputs.includes(output)
    );
    
    // Check if any outputs of this block match any inputs of selectedBlockType
    const hasCompatibleOutput = block.outputs.some(output =>
      selectedBlockType.inputs.includes(output)
    );
    
    return hasCompatibleInput || hasCompatibleOutput;
  });
};

export const getRecommendedBlocks = (currentBlocks, blockTypes) => {
  if (currentBlocks.length === 0) {
    // If no blocks, recommend I/O and basic blocks
    return blockTypes.filter(block => 
      block.type === 'I/O' || block.type === 'Generate Protein'
    ).slice(0, 3);
  }
  
  // Get the last added block
  const lastBlock = currentBlocks[currentBlocks.length - 1];
  const lastBlockType = blockTypes.find(bt => bt.id === lastBlock.type);
  
  if (!lastBlockType) return [];
  
  // Find blocks that can connect to the last block's outputs
  const recommended = blockTypes.filter(blockType => {
    return lastBlockType.outputs.some(output =>
      blockType.inputs.includes(output)
    );
  });
  
  return recommended.slice(0, 5);
};

export const validateBlockChain = (blocks, connections, blockTypes) => {
  const issues = [];
  
  blocks.forEach(block => {
    const blockType = blockTypes.find(bt => bt.id === block.type);
    if (!blockType) return;
    
    // Check for required inputs
    const connectedInputs = connections
      .filter(conn => conn.target === block.id)
      .map(conn => conn.targetHandle);
    
    const missingInputs = blockType.inputs.filter(input => 
      !connectedInputs.includes(input)
    );
    
    if (missingInputs.length > 0) {
      issues.push({
        blockId: block.id,
        type: 'missing_inputs',
        inputs: missingInputs,
        message: `Block "${block.data.label}" is missing required inputs: ${missingInputs.join(', ')}`
      });
    }
  });
  
  return issues;
};

export const exportPalette = (blockTypes) => {
  const paletteData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    blocks: blockTypes.map(block => ({
      ...block,
      // Add any additional metadata
      exported: true
    }))
  };
  
  return JSON.stringify(paletteData, null, 2);
};

export const importPalette = (jsonData) => {
  try {
    const paletteData = JSON.parse(jsonData);
    
    if (!paletteData.blocks || !Array.isArray(paletteData.blocks)) {
      throw new Error('Invalid palette format');
    }
    
    return paletteData.blocks;
  } catch (error) {
    throw new Error(`Failed to import palette: ${error.message}`);
  }
};
