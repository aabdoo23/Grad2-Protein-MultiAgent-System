import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { blastService } from '../../../services/api';

const BlastDatabaseBuilder = ({ onUpdateParameters }) => {
  const [pfamIds, setPfamIds] = useState('');
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
  const [validIds, setValidIds] = useState([]);
  const [invalidIds, setInvalidIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
            sequence_types: selectedTypesList
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
    fetchSequenceCounts(value);
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
      sequence_types: selectedTypesList
    });
  };
  const getTimeFormatted = (count) => {
    const time = Math.round(count/20);
    if (time < 60) {
      return `${time} seconds`;
    } else if (time < 3600) {
      return `${Math.round(time/60)} minutes`;
    } else {
      return `${Math.round(time/3600)} hours`;
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Pfam IDs (comma-separated)
        </label>
        <input
          type="text"
          value={pfamIds}
          onChange={handlePfamIdsChange}
          placeholder="e.g., PF00001, PF00002"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <p className="mt-2 text-sm text-gray-400">Loading sequence counts...</p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>

      {validIds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-200">Sequence Types</h4>
          <div className="space-y-2">
            {Object.entries(sequenceCounts).map(([type, count]) => (
              <label key={type} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTypes[type]}
                  onChange={() => handleTypeChange(type)}
                  className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-600 bg-gray-700"
                />
                <span className="text-sm text-gray-300">
                  {type.charAt(0).toUpperCase() + type.slice(1)} ({count.toLocaleString()} sequences) (~{getTimeFormatted(count)})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {invalidIds.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-red-400">Invalid Pfam IDs:</h4>
          <ul className="mt-1 text-sm text-red-300">
            {invalidIds.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BlastDatabaseBuilder; 