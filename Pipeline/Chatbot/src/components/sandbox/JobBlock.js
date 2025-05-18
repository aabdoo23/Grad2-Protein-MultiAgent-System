import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import * as NGL from 'ngl';
import ResizableBlock from './JobBlockComponents/ResizableBlock';
import ResultsView from './JobBlockComponents/ResultsView';
import BlockPort from './JobBlockComponents/BlockPort';
import BlockLoopControls from './JobBlockComponents/BlockLoopControls';
import BlockHeader from './JobBlockComponents/BlockHeader';
import BlockActions from './JobBlockComponents/BlockActions';
import BlockConfig from './JobBlockComponents/BlockConfig';
import { BASE_URL } from '../../config/config';

const JobBlock = ({
  block,
  blockType,
  onStartConnection,
  onCompleteConnection,
  onInputPortHover,
  onRunBlock,
  onUpdateParameters,
  blockOutput,
  isConnecting,
  onPositionUpdate,
  onResize,
  onDeleteBlock,
  connections,
  loopConfig,
  setLoopConfig
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const nodeRef = useRef(null);
  const contentRef = useRef(null);
  const viewerRefs = useRef({});
  const [dimensions, setDimensions] = useState({
    width: block.width || 450,
    height: block.height || 350
  });

  const initViewer = (jobId, pdbPath) => {
    if (!pdbPath) return;
    if (!viewerRefs.current[jobId]) {
    const stage = new NGL.Stage(`viewer-${jobId}`, { backgroundColor: '#1a2b34' });
    viewerRefs.current[jobId] = stage;

    const filename = pdbPath.split('\\').pop();
    stage.loadFile(`${BASE_URL}/pdb/${filename}`).then(component => {
      component.addRepresentation('cartoon', {
        color: 'bfactor',
        colorScale: 'RdYlBu',
        colorScaleReverse: true,
        colorDomain: [0, 100],
        roughness: 1.0,
        metalness: 0.0
      });
      component.autoView();
    });
    }
  };

  // Format metric values
  const formatMetric = (value) => {
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  // Apply parameter changes
  const handleApplyParameters = (newParams) => {
    onUpdateParameters(newParams);
    setIsConfigOpen(false);
  };

  // Calculate content height
  const calculateContentHeight = () => {
    if (!contentRef.current) return 250;
    const baseHeight = 250;
    const contentHeight = contentRef.current.scrollHeight;
    const configHeight = isConfigOpen ? 400 : 0;
    const resultsHeight = isResultsOpen ? 600 : 0;
    return Math.max(baseHeight, contentHeight + configHeight + resultsHeight);
  };

  // Update dimensions when config or results state changes
  useEffect(() => {
    const newHeight = calculateContentHeight();
    setDimensions(prev => ({
      ...prev,
      height: newHeight
    }));
    if (onResize) {
      onResize(block.id, { width: dimensions.width, height: newHeight });
    }
  }, [isConfigOpen, isResultsOpen]);

  // Handle position change
  const handleDragStop = (e, data) => {
    if (onPositionUpdate) {
      onPositionUpdate(block.id, { x: data.x, y: data.y });
    }
  };

  // Handle resize
  const handleResize = (newSize) => {
    setDimensions(newSize);
    if (onResize) {
      onResize(block.id, newSize);
    }
  };

  // Check if block has configurable options
  const hasConfigurableOptions = () => {
    return blockType.config !== undefined;
  };

  // Pass the necessary functions and refs to child components
  const resultsViewProps = {
    blockType,
    blockOutput,
    isResultsOpen,
    onToggleResults: () => setIsResultsOpen(!isResultsOpen),
    initViewer,
    formatMetric
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={block.position}
      bounds="parent"
      handle=".drag-handle"
      onStop={handleDragStop}
    >
      <div
        className="job-block absolute"
        onWheel={e => e.stopPropagation()}
        ref={nodeRef}
      >
        <ResizableBlock
          width={dimensions.width}
          height={dimensions.height}
          onResize={handleResize}
        >
          <div
            className="rounded-lg p-2 pt-0 pb-1 shadow-xl transition-all duration-200"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: blockType.color,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <BlockHeader
              blockType={blockType}
              status={block.status}
              onDeleteBlock={() => onDeleteBlock(block.id)}
            />

            <div
              ref={contentRef}
              className="p-3 bg-black/20 h-[calc(100%-48px)] overflow-auto rounded-b-lg"
            >
              {/* Input ports */}
              <div className="mb-4">
                {blockType.inputs.map((input) => (
                  <BlockPort
                    key={`input-${input}`}
                    type={input}
                    isInput={true}
                    isConnecting={isConnecting}
                    onPortClick={() => onCompleteConnection(block.id, input)}
                    onPortHover={(type, isHovering) => onInputPortHover(block.id, type, isHovering)}
                    isMultiDownload={blockType.id === 'multi_download'}
                    connectionCount={connections[block.id] ? Object.keys(connections[block.id]).length : 0}
                  />
                ))}
              </div>

              {/* Output ports */}
              <div className="mt-4">
                {blockType.outputs.map((output) => (
                  <BlockPort
                    key={`output-${output}`}
                    type={output}
                    isInput={false}
                    onPortClick={() => onStartConnection(block.id, output)}
                  />
                ))}
              </div>

              <BlockActions
                hasConfig={hasConfigurableOptions()}
                isConfigOpen={isConfigOpen}
                onToggleConfig={() => setIsConfigOpen(!isConfigOpen)}
                onRunBlock={() => onRunBlock(block.id)}
                isRunning={block.status === 'running'}
              />

              {/* Config panel */}
              <BlockConfig
                blockType={blockType}
                isConfigOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                onApply={handleApplyParameters}
                initialParams={blockType.config || {}}
              />

              {/* Loop controls */}
              {loopConfig.isEnabled && (
                <BlockLoopControls
                  loopConfig={loopConfig}
                  setLoopConfig={setLoopConfig}
                  blockId={block.id}
                />
              )}

              {/* Results view */}
              <ResultsView {...resultsViewProps} />

              {/* Download success indicator */}
              {blockOutput?.downloadInfo && (
                <div className="mt-4 p-3 bg-black/30 rounded-lg">
                  {blockOutput.downloadInfo.saved ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">
                        Saved to: {blockOutput.downloadInfo.path}/{blockOutput.downloadInfo.filename}
                      </span>
                    </div>
                  ) : blockOutput.downloadInfo.downloaded ? (
                    <div className="flex items-center gap-2 text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Downloaded successfully</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </ResizableBlock>
      </div>
    </Draggable>
  );
};

export default JobBlock; 