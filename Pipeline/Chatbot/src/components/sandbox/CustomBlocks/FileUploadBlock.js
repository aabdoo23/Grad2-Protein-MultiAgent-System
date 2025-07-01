import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUploadBlock = ({ onFileUpload, blockType }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Get file extension
    const extension = file.name.split('.').pop().toLowerCase();
    
    // Determine output type based on file extension
    let outputType = null;
    if (blockType.config.acceptedFileTypes.structure.includes(`.${extension}`)) {
      outputType = 'structure';
    } else if (blockType.config.acceptedFileTypes.molecule.includes(`.${extension}`)) {
      outputType = 'molecule';
    } else if (blockType.config.acceptedFileTypes.sequence.includes(`.${extension}`)) {
      outputType = 'sequence';
    }

    if (!outputType) {
      setError('Invalid file type. Please upload a PDB, SDF, MOL2, or FASTA file.');
      return;
    }

    setError(null);
    setUploadedFile(file);

    // Create FormData and send to backend
    const formData = new FormData();
    formData.append('file', file);
    formData.append('outputType', outputType);

    onFileUpload(formData, outputType);
  }, [blockType.config.acceptedFileTypes, onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'chemical/x-pdb': ['.pdb'],
      'chemical/x-mdl-molfile': ['.sdf'],
      'chemical/x-mol2': ['.mol2'],
      'chemical/x-fasta': ['.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn']
    },
    maxFiles: 1
  });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div
        {...getRootProps()}
        className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors duration-200
          ${isDragActive ? 'border-[#13a4ec] bg-[#13a4ec]/10' : 'border-[#344854] hover:border-[#13a4ec]'}`}
      >
        <input {...getInputProps()} />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-white/80 text-sm text-center">
          {isDragActive ? (
            "Drop the file here..."
          ) : (
            <>
              Drag and drop a file here, or click to select
              <br />
              <span className="text-white/60 text-xs">
                Supported formats: PDB, SDF, MOL2, FASTA
              </span>
            </>
          )}
        </p>
      </div>

      {error && (
        <div className="mt-2 text-red-500 text-sm">
          {error}
        </div>
      )}

      {uploadedFile && (
        <div className="mt-4 p-3 bg-[#1a2c35] rounded-lg w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-white/80 text-sm break-words">{uploadedFile.name}</span>
            </div>
            <span className="text-white/60 text-xs ml-2 flex-shrink-0">
              {(uploadedFile.size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadBlock; 