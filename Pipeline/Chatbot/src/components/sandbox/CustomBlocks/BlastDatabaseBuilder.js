import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { debounce } from 'lodash';
import { blastService, uploadService } from '../../../services/api';

const BlastDatabaseBuilder = ({ onUpdateParameters, inputData, connections }) => {
  const [pfamIds, setPfamIds] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [inputMethod, setInputMethod] = useState('pfam'); // 'pfam', 'file', or 'connected'
  const [sequenceCounts, setSequenceCounts] = useState({
    unreviewed: 0,
    reviewed: 0,
    uniprot: 0
  });
  const [selectedTypes, setSelectedTypes] = useState({
    unreviewed: true,
    reviewed: true,
    uniprot: true
  });
  const [validIds, setValidIds] = useState([]);  const [invalidIds, setInvalidIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if there's a connected sequences_list input
  const hasConnectedSequences = connections?.sequences_list && inputData?.sequences_list;
  const connectedSequencesCount = hasConnectedSequences ? inputData.sequences_list.length : 0;

  // Auto-switch to connected mode when sequences are connected
  useEffect(() => {
    if (hasConnectedSequences && inputMethod !== 'connected') {
      setInputMethod('connected');
      setError(null);
      setUploadedFile(null);
      setPfamIds('');
      
      // Update parameters to use connected sequences
      onUpdateParameters({
        input_method: 'connected',
        sequences_data: inputData.sequences_list
      });
    }
  }, [hasConnectedSequences, inputData, inputMethod, onUpdateParameters]);
  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    const acceptedExtensions = ['fasta', 'fa', 'fna', 'ffn', 'faa', 'frn'];
    
    if (!acceptedExtensions.includes(extension)) {
      setError('Invalid file type. Please upload a FASTA file (.fasta, .fa, .fna, .ffn, .faa, .frn)');
      return;
    }    setError(null);
    setUploadedFile(file);
      try {
      console.log('Uploading file via drag and drop:', file.name);
      
      // Upload the file to the server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('outputType', 'sequence'); // FASTA files are sequence files
      
      console.log('FormData created, making upload request...');
      const result = await uploadService.uploadFile(formData);
      console.log('Upload result:', result);
      
      // Check if the upload was actually successful
      if (!result || !result.success) {
        throw new Error(result?.error || 'Upload failed - no success flag');
      }
        console.log('Upload successful, updating parameters...');
      // Update parameters with file path
      try {
        onUpdateParameters({
          fasta_file: result.filePath,
          input_method: 'file'
        });
        console.log('Parameters updated successfully');
      } catch (paramError) {
        console.error('Error updating parameters:', paramError);
        setError(`Parameter update failed: ${paramError.message}`);
        return;
      }
      
    } catch (error) {
      console.error('File upload error:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError(`File upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      setUploadedFile(null);
    }
  }, [onUpdateParameters]);  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'chemical/x-fasta': ['.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn']
    },
    maxFiles: 1
  });

  // Debounced function to fetch sequence counts
  const fetchSequenceCounts = useCallback(
    debounce(async (ids) => {
      if (!ids.trim()) {
        setSequenceCounts({ unreviewed: 0, reviewed: 0, uniprot: 0 });
        setValidIds([]);
        setInvalidIds([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await blastService.getPfamData(ids.split(',').map(id => id.trim()));
        if (response.success) {
          setSequenceCounts(response.counts);
          setValidIds(response.valid_ids);
          setInvalidIds(response.invalid_ids);
            // Update parameters with valid IDs and selected types
          const selectedTypesList = Object.entries(selectedTypes)
            .filter(([_, selected]) => selected)
            .map(([type]) => type);
            
          onUpdateParameters({
            pfam_ids: response.valid_ids,
            sequence_types: selectedTypesList,
            input_method: 'pfam'
          });
        }
      } catch (err) {
        setError('Error fetching sequence counts. Please check your Pfam IDs.');
        console.error('Error fetching sequence counts:', err);
      } finally {
        setIsLoading(false);
      }
    }, 1000),
    [selectedTypes, onUpdateParameters]
  );
  // Handle Pfam ID input changes
  const handlePfamIdsChange = (e) => {
    const value = e.target.value;
    setPfamIds(value);
    setInputMethod('pfam');
    setUploadedFile(null); // Clear uploaded file when switching to Pfam IDs
    fetchSequenceCounts(value);
  };
  // Handle input method change
  const handleInputMethodChange = (method) => {
    setInputMethod(method);
    if (method === 'pfam') {
      setUploadedFile(null);
      setError(null);
    } else if (method === 'file') {
      setPfamIds('');
      setSequenceCounts({ unreviewed: 0, reviewed: 0, uniprot: 0 });
      setValidIds([]);
      setInvalidIds([]);
    } else if (method === 'connected') {
      setPfamIds('');
      setUploadedFile(null);
      setSequenceCounts({ unreviewed: 0, reviewed: 0, uniprot: 0 });
      setValidIds([]);
      setInvalidIds([]);
      setError(null);
      
      // Update parameters for connected input
      if (hasConnectedSequences) {
        onUpdateParameters({
          input_method: 'connected',
          sequences_data: inputData.sequences_list
        });
      }
    }
  };

  // Handle sequence type checkbox changes
  const handleTypeChange = (type) => {
    const newSelectedTypes = {
      ...selectedTypes,
      [type]: !selectedTypes[type]
    };
    setSelectedTypes(newSelectedTypes);
    
    // Update parameters with new selection
    const selectedTypesList = Object.entries(newSelectedTypes)
      .filter(([_, selected]) => selected)
      .map(([type]) => type);
        onUpdateParameters({
      pfam_ids: validIds,
      sequence_types: selectedTypesList,
      input_method: 'pfam'
    });
  };  const getTimeFormatted = (count) => {
    const time = Math.round(count/20);
    if (time < 60) {
      return `${time} seconds`;
    } else if (time < 3600) {
      return `${Math.round(time/60)} minutes`;
    } else {
      return `${Math.round(time/3600)} hours`;
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Info message about new workflow */}
      {!hasConnectedSequences && (
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-400 text-sm font-medium">New: Connect sequences from File Upload</p>
              <p className="text-blue-300/80 text-xs mt-1">
                You can now upload a FASTA file to a File Upload block and connect its Sequences List output to this block's input
              </p>
            </div>
          </div>
        </div>
      )}{/* Input Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-3">
          Choose Database Source
        </label>
        <div className="flex flex-col space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="inputMethod"
              value="connected"
              checked={inputMethod === 'connected'}
              onChange={() => handleInputMethodChange('connected')}
              disabled={!hasConnectedSequences}
              className="form-radio h-4 w-4 text-blue-500 border-gray-600 bg-gray-700 disabled:opacity-50"
            />
            <span className={`text-sm ${hasConnectedSequences ? 'text-gray-300' : 'text-gray-500'}`}>
              Use Connected Sequences {hasConnectedSequences ? `(${connectedSequencesCount} sequences)` : '(No connection)'}
            </span>
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="inputMethod"
                value="pfam"
                checked={inputMethod === 'pfam'}
                onChange={() => handleInputMethodChange('pfam')}
                className="form-radio h-4 w-4 text-blue-500 border-gray-600 bg-gray-700"
              />
              <span className="text-sm text-gray-300">Use Pfam IDs</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="inputMethod"
                value="file"
                checked={inputMethod === 'file'}
                onChange={() => handleInputMethodChange('file')}
                className="form-radio h-4 w-4 text-blue-500 border-gray-600 bg-gray-700"
              />
              <span className="text-sm text-gray-300">Upload FASTA File</span>
            </label>
          </div>
        </div>
      </div>      {/* Connected Sequences Display */}
      {inputMethod === 'connected' && hasConnectedSequences && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-200 mb-2">Connected Sequences</h4>
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              Sequences will be used to build the BLAST database
            </div>
          </div>
        </div>
      )}

      {/* Warning for connected mode without connection */}
      {inputMethod === 'connected' && !hasConnectedSequences && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-yellow-400 text-sm font-medium">No sequences connected</p>
              <p className="text-yellow-300/80 text-xs mt-1">
                Connect a File Upload block with Sequences List output to use this option
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pfam IDs Input */}
      {inputMethod === 'pfam' && (
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Pfam Family IDs (comma-separated)
          </label>
          <input
            type="text"
            value={pfamIds}
            onChange={handlePfamIdsChange}
            placeholder="e.g., PF00001, PF00002, PF00003"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Enter Pfam family identifiers to download sequences from UniProt
          </p>
          {isLoading && (
            <p className="mt-2 text-sm text-gray-400 flex items-center">
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading sequence counts...
            </p>
          )}

          {validIds.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-200">Select Sequence Types</h4>
              <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                {Object.entries(sequenceCounts).map(([type, count]) => (
                  <label key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedTypes[type]}
                        onChange={() => handleTypeChange(type)}
                        className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-600 bg-gray-700"
                      />
                      <span className="text-sm text-gray-300 capitalize">
                        {type === 'uniprot' ? 'All UniProt' : type}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">
                        {count.toLocaleString()} sequences
                      </span>
                      <div className="text-xs text-gray-500">
                        ~{getTimeFormatted(count)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {invalidIds.length > 0 && (
            <div className="mt-4 bg-red-900/20 border border-red-600/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-400 mb-2">Invalid Pfam IDs:</h4>
              <div className="flex flex-wrap gap-1">
                {invalidIds.map((id) => (
                  <span key={id} className="px-2 py-1 bg-red-800/30 text-red-300 rounded text-xs">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Upload Input */}
      {inputMethod === 'file' && (
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Upload FASTA File
          </label>
          <div
            {...getRootProps()}
            className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors duration-200
              ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-500'}`}
          >
            <input {...getInputProps()} />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-300 text-sm text-center">
              {isDragActive ? (
                "Drop the FASTA file here..."
              ) : (
                <>
                  Drag and drop your FASTA file here, or click to select
                  <br />
                  <span className="text-gray-500 text-xs">
                    Supported formats: .fasta, .fa, .fna, .ffn, .faa, .frn
                  </span>
                </>
              )}
            </p>
          </div>

          {uploadedFile && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-gray-300 text-sm">{uploadedFile.name}</span>
                </div>
                <span className="text-gray-500 text-xs">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          )}
          
          <p className="mt-2 text-xs text-gray-400">
            Upload a FASTA file containing protein sequences to build a custom BLAST database
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>  );
};

export default BlastDatabaseBuilder;