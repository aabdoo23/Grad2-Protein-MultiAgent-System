export const blockConfigSchema = {
  sequence_iterator: {
    sequences: {
      type: 'textarea',
      label: 'Enter sequences (one per line)',
      placeholder: 'Enter sequences here, one per line...',
      rows: 8
    }
  },
  openfold_predict: {
    selected_models: {
      type: 'checkboxGroup',
      label: 'Selected Models',
      options: [
        { value: 1, label: 'Model 1' },
        { value: 2, label: 'Model 2' },
        { value: 3, label: 'Model 3' },
        { value: 4, label: 'Model 4' },
        { value: 5, label: 'Model 5' }
      ],
      defaultValue: [1, 2, 3, 4, 5]
    }
  },
  alphafold2_predict: {
    e_value: {
      type: 'number',
      label: 'E-value',
      min: 0,
      max: 1,
      step: 0.0001,
      defaultValue: 0.0001
    },
    algorithm: {
      type: 'select',
      label: 'Algorithm',
      options: [
        { value: 'mmseqs2', label: 'MMSeqs2' },
        { value: 'jackhmmer', label: 'JackHMMer' }
      ],
      defaultValue: 'mmseqs2'
    },
    structure_model_preset: {
      type: 'select',
      label: 'Structure Model Preset',
      options: [
        { value: 'monomer', label: 'Monomer' },
        { value: 'multimer', label: 'Multimer' }
      ],
      defaultValue: 'monomer'
    }
  },
  colabfold_search: {
    e_value: {
      type: 'number',
      label: 'E-value',
      min: 0,
      max: 1,
      step: 0.0001,
      defaultValue: 0.0001
    },
    iterations: {
      type: 'number',
      label: 'Iterations',
      min: 1,
      max: 10,
      step: 1,
      defaultValue: 1
    },
    databases: {
      type: 'checkboxGroup',
      label: 'Databases',
      options: [
        { value: 'Uniref30_2302', label: 'UniRef30 (2023-02)' },
        { value: 'PDB70_220313', label: 'PDB70 (2022-03-13)' },
        { value: 'colabfold_envdb_202108', label: 'ColabFold EnvDB (2021-08)' }
      ],
      defaultValue: ['Uniref30_2302', 'PDB70_220313', 'colabfold_envdb_202108']
    }
  },
  ncbi_blast_search: {
    e_value: {
      type: 'number',
      label: 'E-value',
      min: 0,
      max: 1,
      step: 0.0001,
      defaultValue: 0.0001
    },
    database: {
      type: 'select',
      label: 'Database',
      options: [
        { value: 'nr', label: 'Non-redundant protein sequences (nr)' },
        { value: 'refseq_protein', label: 'Reference proteins (refseq_protein)' },
        { value: 'swissprot', label: 'Swiss-Prot protein sequences (swissprot)' }
      ],
      defaultValue: 'nr'
    }
  },
  local_blast_search: {
    fasta_file: {
      type: 'text',
      label: 'FASTA File Path',
      placeholder: 'Enter path to FASTA file',
      defaultValue: ''
    },
    db_name: {
      type: 'text',
      label: 'Database Name',
      placeholder: 'Enter database name',
      defaultValue: ''
    },
    interpro_ids: {
      type: 'tagInput',
      label: 'InterPro IDs',
      placeholder: 'Enter InterPro IDs and press Enter',
      defaultValue: []
    }
  }
}; 