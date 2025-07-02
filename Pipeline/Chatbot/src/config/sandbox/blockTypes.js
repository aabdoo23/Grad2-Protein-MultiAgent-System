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
    outputs: ['sequence'],
    config: {
      prompt: ""
    }
  },
  {
    id: 'sequence_iterator',
    name: 'Sequence Iterator',
    type: 'Iterate',
    description: 'Iterate through sequences from FASTA file or pasted sequences',
    color: '#073b4c',
    inputs: ['sequences_list'],
    outputs: ['sequence'],
    config: {}
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
    outputs: ['msa_results'],
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
    outputs: ['blast_results'],
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
    outputs: ['blast_results'],
    config: {
      e_value: 0.0001
    }
  },
  {
    id: 'search_structure',
    name: 'Search Structure',
    type: '3D Structure Search',
    description: 'Search for similar protein structures using FoldSeek',
    color: '#28666E',
    inputs: ['structure'],
    outputs: ['foldseek_results']
  },  {
    id: 'blast_db_builder',
    name: 'BLAST Database Builder',
    type: 'BLAST Search',
    description: 'Build a BLAST database from connected sequences, FASTA file, or Pfam IDs',
    color: '#38726C',
    inputs: ['sequences_list'],
    outputs: ['database', 'fasta'],
    config: {
      fasta_file: "",
      pfam_ids: [],
      db_name: ""
    }
  },{
    id: 'perform_docking',
    name: 'Molecular Docking',
    type: 'Docking',
    description: 'Perform molecular docking between a protein and ligand using AutoDock Vina',
    color: '#033F63',
    inputs: ['structure', 'molecule', 'binding_sites'],
    outputs: ['docking_results'], 
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
  },  {
    id: 'predict_binding_sites',
    name: 'Predict Binding Sites',
    type: 'Docking',
    description: 'Predict protein binding sites using P2Rank (Fast, ~30 sec)',
    color: '#022E4A',
    inputs: ['structure'],
    outputs: ['binding_sites']
  },
  
  {
    id: 'blast_analysis',
    name: 'BLAST Analysis',
    type: 'Analysis',
    description: 'Interactive analysis of sequence search results with scatter plots and hit tables',
    color: '#1D4D3D',
    inputs: ['blast_results'],
    outputs: [],
    config: {}
  },
   {
    id: 'foldseek_analysis',
    name: 'FoldSeek Analysis',
    type: 'Analysis',
    description: 'Interactive analysis of structural search results with scatter plots and hit tables',
    color: '#205543',
    inputs: ['foldseek_results'],
    outputs: [],
    config: {}
  },
  {
    id: 'msa_analysis',
    name: 'MSA Analysis',
    type: 'Analysis',
    description: 'Interactive analysis of Multiple Sequence Alignment results',
    color: '#235D4A',
    inputs: ['msa_results'],
    outputs: [],
    config: {}
  },
  {
    id: 'taxonomy_analysis',
    name: 'Taxonomy Analysis',
    type: 'Analysis',
    description: 'Interactive analysis of taxonomic distribution from BLAST results',
    color: '#286049',
    inputs: ['blast_results'],
    outputs: [],
    config: {}
  },
  {
    id: 'build_phylogenetic_tree',
    name: 'Phylogenetic Tree',
    type: 'Analysis',
    description: 'Build phylogenetic tree from BLAST/MSA results',
    color: '#2D6348',
    inputs: ['blast_results'],
    outputs: ['tree'],
    config: {
      tree_method: 'neighbor_joining',
      distance_model: 'identity',
      max_sequences: 50,
      min_sequence_length: 50,
      remove_gaps: true
    }
  },  {
    id: 'analyze_ramachandran',
    name: 'Ramachandran Plot',
    type: 'Analysis',
    description: 'Generate Ramachandran plot analysis for protein backbone conformations',
    color: '#376946',
    inputs: ['structure'],
    outputs: ['ramachandran_plot']
  },
  {
    id: 'evaluate_structure',
    name: 'Structure Comparison',
    type: 'Analysis',
    description: 'Compare two protein structures using USAlign to calculate TM-score, RMSD, and sequence identity',
    color: '#3C6C45',
    inputs: ['structure', 'structure'],
    outputs: ['structure_comparison']
  },
  
  
];
