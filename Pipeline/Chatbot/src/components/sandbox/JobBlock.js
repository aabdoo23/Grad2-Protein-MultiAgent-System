import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import BlockHeader from './JobBlockComponents/BlockHeader';
import BlockPort from './JobBlockComponents/BlockPort';
import BlockConfig from './JobBlockComponents/BlockConfig';
import ResultsView from './JobBlockComponents/ResultsView';
import BlockActions from './JobBlockComponents/BlockActions';
import FileUploadBlock from './JobBlockComponents/FileUploadBlock';
import BlastDatabaseBuilder from './JobBlockComponents/BlastDatabaseBuilder';
import ResizableBlock from './JobBlockComponents/ResizableBlock';
import { uploadService } from '../../services/api';

const JobBlock = ({
  id,
  data,
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
      const parameters = {
        filePath: result.filePath,
        outputType: outputType,
        model_type: 'file_upload'
      };

      // Add sequences if it's a sequence file
      if (outputType === 'sequence' && result.sequences) {
        parameters.sequences = result.sequences;
      }

      data.onUpdateParameters(parameters);

      // Use onRunBlock from data prop
      data.onRunBlock();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Handle BLAST database builder parameters update
  const handleBlastDbParametersUpdate = (params) => {
    if (data.onUpdateParameters) {
      data.onUpdateParameters(params);
    }
  };

  // Render block content based on block type
  const renderBlockContent = () => {
    switch (safeBlockType.id) {
      case 'file_upload':
        return (
          <div className="nodrag">
            <FileUploadBlock
              onFileUpload={handleFileUpload}
              blockType={safeBlockType}
            />
          </div>
        );
      case 'blast_db_builder':
        return (
          <div className="nodrag">
            <BlastDatabaseBuilder
              onUpdateParameters={handleBlastDbParametersUpdate}
            />
          </div>
        );
      case 'sequence_iterator':
        return (
          <div className="nodrag flex flex-col items-center justify-center gap-4 p-4">
            <button
              onClick={() => data.onRunBlock({ loadData: true })}
              disabled={data.status === 'running'}
              className="w-full px-4 py-2 bg-[#13a4ec] text-white rounded-lg text-sm hover:bg-[#0f8fd1] transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {data.status === 'running' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Load Data
                </>
              )}
            </button>
            {data.parameters?.loadedSequences && (
              <div className="text-sm text-gray-300">
                Loaded {data.parameters.loadedSequences.length} sequences
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ResizableBlock
      width={data.width || 450}
      height={data.height || 350}
      onResize={handleResize}
      blockId={id}
    >
      <div
        className="job-block-inner cursor-default rounded-lg shadow-xl flex flex-col h-full overflow-hidden"
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
        <div className="nodrag nowheel nopan flex flex-1 min-h-0 bg-black/20">
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
            className="flex-1 p-3 mb-4 bg-black/20 overflow-auto custom-scrollbar rounded-b-lg"
          >
            {renderBlockContent()}
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
            {data.status === 'completed' && (
              <ResultsView
                blockType={safeBlockType}
                blockOutput={data.blockOutput}
                blockInstanceId={id}
                isResultsOpen={isResultsOpen}
                onToggleResults={() => setIsResultsOpen(!isResultsOpen)}
                initViewer={data.initViewer}
                formatMetric={data.formatMetric}
              />
            )}
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