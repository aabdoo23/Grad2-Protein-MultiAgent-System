import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import BlockHeader from './JobBlockComponents/BlockHeader';
import BlockPort from './JobBlockComponents/BlockPort';
import BlockConfig from './JobBlockComponents/BlockConfig';
import ResultsView from './JobBlockComponents/ResultsView';
import BlockActions from './JobBlockComponents/BlockActions';
import FileUploadBlock from './JobBlockComponents/FileUploadBlock';
import ResizableBlock from './JobBlockComponents/ResizableBlock';
import { BASE_URL } from '../../config/config';

const JobBlock = ({
  id,
  data,
  selected,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  // Default block type if none is provided
  const defaultBlockType = {
    id: 'unknown',
    name: 'Unknown Block',
    color: '#4B5563',
    inputs: [],
    outputs: [],
    config: null,
  };

  // Access blockType from the data prop
  const safeBlockType = data.blockType || defaultBlockType;

  const handleResize = ({ width, height }) => {
    if (data.updateBlock) {
      data.updateBlock({ width, height });
    } else {
      console.warn('updateBlock function not available in JobBlock data prop for resize');
    }
  };

  // Handle file upload
  const handleFileUpload = async (formData, outputType) => {
    try {
      const response = await fetch(`${BASE_URL}/upload-file`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Use onUpdateParameters from data prop
      data.onUpdateParameters({ // Pass id implicitly via data or explicitly if needed
        filePath: result.filePath,
        outputType: outputType
      });

      // Use onRunBlock from data prop
      data.onRunBlock(); // Pass id implicitly via data or explicitly if needed
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // The main scrollable area within the block
  const scrollableContentRef = React.useRef(null);

  return (
    <ResizableBlock 
      width={data.width || 450} 
      height={data.height || 350} 
      onResize={handleResize}
      blockId={id}
    >
      <div
        className="job-block-inner cursor-default rounded-lg p-2 pt-0 shadow-xl transition-all duration-200 flex flex-col h-full"
        style={{
          backgroundColor: safeBlockType.color,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <BlockHeader
          blockType={safeBlockType}
          blockInstanceId={id}
          status={data.status}
          onDeleteBlock={() => data.onDeleteBlock()}
        />

        <div 
          ref={scrollableContentRef}
          className="nodrag flex-grow p-3 bg-black/20 overflow-auto rounded-b-lg custom-scrollbar"
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Input ports */}
          <div className="mb-4">
            {safeBlockType.inputs.map((input) => (
              <div key={`input-${input}`} className="relative flex items-center my-1">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input}
                  style={{ background: '#fff', width: 10, height: 10, border: '2px solid #666', zIndex: 11 }}
                />
                <BlockPort
                  type={input}
                  isInput={true}
                  isMultiDownload={safeBlockType.id === 'multi_download'}
                  connectionCount={Array.isArray(data.connections?.[input]) 
                    ? data.connections[input].length 
                    : (data.connections?.[input] ? 1 : 0)}
                />
              </div>
            ))}
          </div>

          {/* File Upload Block */}
          {safeBlockType.id === 'file_upload' && (
            <div className="nodrag">
              <FileUploadBlock
                onFileUpload={handleFileUpload}
                blockType={safeBlockType}
              />
            </div>
          )}

          {/* Output ports */}
          <div className="mt-4">
            {safeBlockType.outputs.map((output) => (
              <div key={`output-${output}`} className="relative flex items-center justify-end my-1">
                <BlockPort type={output} isInput={false} />
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output}
                  style={{ background: '#fff', width: 10, height: 10, border: '2px solid #666', zIndex: 11 }}
                />
              </div>
            ))}
          </div>

          <BlockActions
            hasConfig={!!safeBlockType.config}
            isConfigOpen={isConfigOpen}
            onToggleConfig={() => setIsConfigOpen(!isConfigOpen)}
            onRunBlock={() => data.onRunBlock()}
            isRunning={data.status === 'running'}
          />

          {/* Config panel */}
          {safeBlockType.config && (
            <BlockConfig
              blockType={safeBlockType}
              isConfigOpen={isConfigOpen}
              onClose={() => setIsConfigOpen(false)}
              onApply={(params) => {
                data.onUpdateParameters(params);
                setIsConfigOpen(false);
              }}
              initialParams={data.parameters || {}}
            />
          )}

          {/* Results view */}
          <ResultsView
            blockType={safeBlockType}
            blockOutput={data.blockOutput}
            blockInstanceId={id}
            isResultsOpen={isResultsOpen}
            onToggleResults={() => setIsResultsOpen(!isResultsOpen)}
            initViewer={data.initViewer}
            formatMetric={data.formatMetric}
          />
        </div>
      </div>
    </ResizableBlock>
  );
};

export default JobBlock; 