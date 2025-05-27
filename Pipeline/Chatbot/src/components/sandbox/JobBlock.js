import React, { useState, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import BlockHeader from './JobBlockComponents/BlockHeader';
import BlockPort from './JobBlockComponents/BlockPort';
import BlockConfig from './JobBlockComponents/BlockConfig';
import ResultsView from './JobBlockComponents/ResultsView';
import BlockActions from './JobBlockComponents/BlockActions';
import FileUploadBlock from './JobBlockComponents/FileUploadBlock';
import ResizableBlock from './JobBlockComponents/ResizableBlock';
import { BASE_URL } from '../../config/config';
import { uploadService } from '../../services/api';

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
      const result = await uploadService.uploadFile(formData);

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
  const scrollableContentRef = useRef(null);

  return (
    <ResizableBlock
      width={data.width || 450}
      height={data.height || 350}
      onResize={handleResize}
      blockId={id}
    >
      <div
        className="nodrag nowheel nopan job-block-inner cursor-default rounded-lg shadow-xl flex flex-col h-full overflow-hidden"
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

        {/* Container for ports and content area */}
        <div className="flex flex-1 min-h-0 bg-black/10">
          {/* Input Ports Section */}
          <div className="flex flex-col justify-center items-start p-2 space-y-2">
            {safeBlockType.inputs.map((input) => (
              <div key={`input-${input}`} className="relative flex items-center">
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

          {/* Scrollable Content Area */}
          <div 
            // ref={scrollableContentRef}
            className="flex-1 p-3 mb-4 bg-black/20 overflow-auto custom-scrollbar rounded-b-lg"
          >
            {safeBlockType.id === 'file_upload' && (
              <div className="nodrag">
                <FileUploadBlock
                  onFileUpload={handleFileUpload}
                  blockType={safeBlockType}
                />
              </div>
            )}
            <BlockActions
              hasConfig={!!safeBlockType.config}
              isConfigOpen={isConfigOpen}
              onToggleConfig={() => setIsConfigOpen(!isConfigOpen)}
              onRunBlock={() => data.onRunBlock()}
              isRunning={data.status === 'running'}
            />
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

          {/* Output Ports Section */}
          <div className="flex flex-col justify-center items-end p-2 space-y-2">
            {safeBlockType.outputs.map((output) => (
              <div key={`output-${output}`} className="relative flex items-center">
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
        </div>
      </div>
    </ResizableBlock>
  );
};

export default JobBlock; 