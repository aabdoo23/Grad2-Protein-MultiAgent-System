export const blockTypes = [
    {
      id: 'file_upload',
      name: 'File Upload',
      type: 'I/O',
      description: 'Upload PDB, SDF, or MOL2 files for structure or molecule analysis',
      color: '#653239',
      inputs: [],
      outputs: ['structure', 'molecule', 'sequence', 'sequences_list'],
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
      type: 'I/O',
      description: 'Download output from multiple blocks once they are completed',
      color: '#522B29',
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
      inputs: ['sequences_list'],
      outputs: ['sequence'],
      config:{}
    },
    // Structure Prediction Blocks
    {
      id: 'esmfold_predict',
      name: 'ESMFold Predict',
      type: '3D Structure Prediction',
      description: 'Predict structure using ESMFold (Fastest, ~10 sec)',
      color: '#D8973C',
      inputs: ['sequence'],
      outputs: ['structure']
    },
    {
      id: 'openfold_predict',
      name: 'OpenFold Predict',
      type: '3D Structure Prediction',
      description: 'Predict structure using OpenFold (Fast, ~30 sec)',
      color: '#BE5E3C',
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
      type: '3D Structure Prediction',
      description: 'Predict structure using AlphaFold2 (Accurate, ~6 min)',
      color: '#CB7B3C',
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
      color: '#0E3938',
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
      color: '#1C4C49',
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
      color: '#28666E',
      inputs: ['structure'],
      outputs: ['results']
    },
    {
      id: 'blast_db_builder',
      name: 'BLAST Database Builder',
      type: 'BLAST Search',
      description: 'Build a BLAST database from FASTA file or Pfam IDs',
      color: '#38726C',
      inputs: [],
      outputs: ['database', 'fasta'],
      config: {
        fasta_file: "",
        pfam_ids: [],
        db_name: ""
      }
    },
    {
      id: 'perform_docking',
      name: 'Molecular Docking',
      type: 'Docking',
      description: 'Perform molecular docking between a protein and ligand using AutoDock Vina',
      color: '#033F63',
      inputs: ['structure', 'molecule'],
      outputs: ['results'],
      config: {
        center_x: 0,
        center_y: 0,
        center_z: 0,
        size_x: 20,
        size_y: 20,
        size_z: 20,
        exhaustiveness: 16,
        num_modes: 10,
        cpu: 4
      }
    }
  ];
