export const blockTypes = [
    {
      id: 'file_upload',
      name: 'File Upload',
      type: 'Input',
      description: 'Upload PDB, SDF, or MOL2 files for structure or molecule analysis',
      color: '#4a90e2',
      inputs: [],
      outputs: ['structure', 'molecule', 'sequence'],
      config: {
        acceptedFileTypes: {
          structure: ['.pdb'],
          molecule: ['.sdf', '.mol2'],
          sequence: ['.fasta', '.fa']
        }
      }
    },
    {
      id: 'multi_download',
      name: 'Multi Download',
      type: 'Download',
      description: 'Download output from multiple blocks once they are completed',
      color: '#9b2226',
      inputs: ['input'],
      outputs: []
    },
    {
      id: 'generate_protein',
      name: 'Generate Protein',
      type: 'Generate Protein',
      description: 'Generate a protein sequence with specific properties',
      color: '#005f73',
      inputs: [],
      outputs: ['sequence']
    },
    {
      id: 'sequence_iterator',
      name: 'Sequence Iterator',
      type: 'Iterate',
      description: 'Iterate through sequences from FASTA file or pasted sequences',
      color: '#073b4c',
      inputs: ['fasta'],
      outputs: ['sequence'],
      config:{}
    },
    // Structure Prediction Blocks
    {
      id: 'openfold_predict',
      name: 'OpenFold Predict',
      type: '3d Structure Prediction',
      description: 'Predict structure using OpenFold (Fast, ~30 sec)',
      color: '#f4a261',
      inputs: ['sequence'],
      outputs: ['structure'],
      config: {
        selected_models: [1, 2, 3, 4, 5],
        relax_prediction: false
      }
    },
    {
      id: 'alphafold2_predict',
      name: 'AlphaFold2 Predict',
      type: '3d Structure Prediction',
      description: 'Predict structure using AlphaFold2 (Accurate, ~6 min)',
      color: '#e76f51',
      inputs: ['sequence'],
      outputs: ['structure'],
      config: {
        e_value: 0.0001,
        databases: ["small_bfd"],
        algorithm: "mmseqs2",
        iterations: 1,
        relax_prediction: false,
        structure_model_preset: "monomer",
        structure_models_to_relax: "all",
        num_predictions_per_model: 1,
        max_msa_sequences: 512,
        template_searcher: "hhsearch"
      }
    },
    {
      id: 'esmfold_predict',
      name: 'ESMFold Predict',
      type: '3d Structure Prediction',
      description: 'Predict structure using ESMFold (Fastest, ~10 sec)',
      color: '#e9c46a',
      inputs: ['sequence'],
      outputs: ['structure']
    },
    // Sequence Similarity Search Blocks
    {
      id: 'colabfold_search',
      name: 'ColabFold MSA Search',
      type: 'Multiple Sequence Alignment',
      description: 'Search using ColabFold MSA (Fast, modern, ~20 sec)',
      color: '#264653',
      inputs: ['sequence'],
      outputs: ['results'],
      config: {
        e_value: 0.0001,
        iterations: 1,
        databases: ["Uniref30_2302", "PDB70_220313", "colabfold_envdb_202108"],
        output_alignment_formats: ["fasta"]
      }
    },
    {
      id: 'ncbi_blast_search',
      name: 'NCBI BLAST Search',
      type: 'BLAST Search',
      description: 'Search using NCBI BLAST (Standard, ~6 min)',
      color: '#2a9d8f',
      inputs: ['sequence'],
      outputs: ['results'],
      config: {
        e_value: 0.0001,
        database: "nr"
      }
    },
    {
      id: 'local_blast_search',
      name: 'Local BLAST Search',
      type: 'BLAST Search',
      description: 'Search using Local BLAST (Custom database, ~1 min)',
      color: '#457b9d',
      inputs: ['sequence', 'database'],
      outputs: ['results'],
      config: {
        e_value: 0.0001,
        interpro_ids: []
      }
    },
    {
      id: 'search_structure',
      name: 'Search Structure',
      type: '3D Structure Search',
      description: 'Search for similar protein structures using FoldSeek',
      color: '#2a9d8f',
      inputs: ['structure'],
      outputs: ['results']
    },
    {
      id: 'blast_db_builder',
      name: 'BLAST Database Builder',
      type: 'Database',
      description: 'Build a BLAST database from FASTA file or Pfam IDs',
      color: '#457b9d',
      inputs: [],
      outputs: ['database', 'fasta'],
      config: {
        fasta_file: "",
        pfam_ids: [],
        db_name: ""
      }
    }
  ];
