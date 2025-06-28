const documentation = [
    {
        id: 'file_upload',
        name: 'File Upload',
        category: 'I/O',
        description: 'Upload PDB, SDF, MOL2, or FASTA files for structure, molecule, or sequence analysis',
        toolsUsed: ['Built-in file handling', 'Python file I/O', 'BioPython SeqIO (for FASTA parsing)'],

        frontendUsage: {
            userInterface: 'Drag and drop zone or file browser button for selecting files',
            userInputs: [
                {
                    name: 'File Selection',
                    type: 'File Upload',
                    description: 'User clicks the upload area or drags files directly into the block',
                    required: true
                },
                {
                    name: 'Output Type Selection',
                    type: 'Dropdown/Radio buttons',
                    description: 'User selects what type of data the file contains (structure, molecule, or sequence)',
                    required: true,
                    options: ['structure', 'molecule', 'sequence']
                }
            ],
            configParams: {
                acceptedFileTypes: {
                    description: 'Defines which file extensions are accepted for each data type',
                    significance: 'Ensures only compatible files are uploaded and properly categorized',
                    structure: {
                        description: 'Only .pdb files accepted for 3D protein structures',
                        value: ['.pdb']
                    },
                    molecule: {
                        description: 'Ligand files in standard chemical formats',
                        value: ['.sdf', '.mol2']
                    },
                    sequence: {
                        description: 'Text-based sequence files containing amino acid sequences',
                        value: ['.fasta', '.fa']
                    }
                }
            },
            screenshots: {
                blockInterface: 'Screenshot placeholder: File upload block with drag-and-drop zone',
                resultsSample: 'Screenshot placeholder: Successful upload confirmation with file details'
            }
        },

        inputFormat: {
            description: 'File upload via web interface',
            formats: [
                'Structure files: .pdb (Protein Data Bank format)',
                'Molecule files: .sdf (Structure Data Format), .mol2 (Tripos MOL2 format)',
                'Sequence files: .fasta, .fa (FASTA format)'
            ]
        },
        outputFormat: {
            description: 'Processed file data',
            structure: {
                success: 'boolean',
                file_path: 'string (path to uploaded file)',
                file_type: 'string (structure/molecule/sequence)'
            },
            examples: {
                sequence: {
                    success: true,
                    sequences_list: ['MKTAYIAKQRQISFVKSHFSRQDILDLWIYHTQGYFP', 'ACDEFGHIKLMNPQRSTVWY']
                }
            }
        },
        exampleUsage: 'Upload a PDB file containing a protein structure, or upload a FASTA file with protein sequences for downstream analysis.',
        limitations: ['File size limits may apply', 'Only standard file formats are supported'],
        citations: []
    }, {
        id: 'generate_protein',
        name: 'Generate Protein',
        category: 'Generate Protein',
        description: 'Generate a novel protein sequence with specific properties using AI-based protein design',
        toolsUsed: ['Custom ProteinGenerator class', 'AI-based protein design models'],

        frontendUsage: {
            userInterface: 'Text input field for entering generation prompt',
            userInputs: [
                {
                    name: 'Generation Prompt',
                    type: 'Text Input (multiline)',
                    description: 'User enters a natural language description of desired protein properties',
                    required: true,
                    placeholder: 'e.g., "Generate a thermostable enzyme with beta-sheet structure"'
                }
            ],
            configParams: 'No configuration parameters available for this block',
            screenshots: {
                blockInterface: 'https://i.ibb.co/LXBkG3dP/Screenshot-2025-06-18-193104.png',
                resultsSample: 'Screenshot placeholder: Generated protein sequence output with details'
            }
        },

        inputFormat: {
            description: 'Text prompt describing desired protein properties',
            formats: [
                'prompt: string - Natural language description of desired protein characteristics'
            ]
        },
        outputFormat: {
            description: 'Generated protein sequence',
            structure: {
                success: 'boolean',
                sequence: 'string (amino acid sequence in single-letter code)',
                info: 'string (generation details)'
            },
            example: {
                success: true,
                sequence: 'MKTAYIAKQRQISFVKSHFSRQDILDLWIYHTQGYFP',
                info: 'Protein generated based on prompt: thermostable enzyme'
            }
        },
        exampleUsage: 'Generate a protein with "thermostable enzyme properties" or "membrane binding domain"',
        limitations: ['Currently uses placeholder generation logic', 'May require specific model training for optimal results'],
        citations: []
    }, {
        id: 'sequence_iterator',
        name: 'Sequence Iterator',
        category: 'Iterate',
        description: 'Iterate through multiple sequences from FASTA files or sequence lists, processing each sequence individually',
        toolsUsed: ['Python iteration logic', 'BioPython SeqIO'],

        frontendUsage: {
            userInterface: 'Simple block with sequence list input - automatically processes multiple sequences in order',
            userInputs: [
                {
                    name: 'Sequence List',
                    type: 'Connection from file upload or previous block',
                    description: 'Array of protein sequences to iterate through',
                    required: true,
                    format: 'Array of amino acid sequences in single-letter code'
                }
            ],
            configParams: 'No configuration parameters - automatic sequential processing',
            screenshots: {
                blockInterface: 'https://i.ibb.co/hFW7cqvK/Screenshot-2025-06-18-185744.png',
                resultsSample: 'Screenshot placeholder: Individual sequence output with iteration progress'
            }
        },

        inputFormat: {
            description: 'List of protein sequences',
            formats: [
                'sequences_list: array of strings - List of amino acid sequences'
            ]
        },
        outputFormat: {
            description: 'Individual sequences processed one at a time',
            structure: {
                sequence: 'string (single amino acid sequence)'
            }
        },
        exampleUsage: 'Process multiple sequences from a FASTA file through the same analysis pipeline',
        limitations: ['Sequences are processed sequentially', 'Memory usage increases with large sequence lists'],
        citations: []
    }, {
        id: 'esmfold_predict',
        name: 'ESMFold Predict',
        category: '3D Structure Prediction',
        description: 'Predict 3D protein structure using ESMFold (Meta AI) - fastest method with ~10 second prediction time',
        toolsUsed: ['NVIDIA Cloud Functions', 'ESMFold API', 'Meta AI ESMFold model'],

        frontendUsage: {
            userInterface: 'Simple block with sequence input connection - no configuration panel needed',
            userInputs: [
                {
                    name: 'Protein Sequence',
                    type: 'Connection from previous block',
                    description: 'Amino acid sequence from Generate Protein block or File Upload',
                    required: true,
                    format: 'Single-letter amino acid code (e.g., MKTAYIAKQRQISFVKSHFSRQDILDLWIYHTQGYFP)'
                }
            ],
            configParams: 'No user-configurable parameters - uses optimal defaults for speed',
            screenshots: {
                blockInterface: 'https://i.ibb.co/3yLGt2Qh/Screenshot-2025-06-18-185756.png',
                resultsSample: 'Screenshot placeholder: Generated PDB structure with confidence scores'
            }
        },

        inputFormat: {
            description: 'Protein amino acid sequence',
            formats: [
                'sequence: string - Amino acid sequence using standard single-letter codes (A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y)'
            ]
        },
        outputFormat: {
            description: 'Predicted 3D structure in PDB format with confidence scores',
            structure: {
                success: 'boolean',
                structure: 'string (PDB format structure)',
                pdb_file: 'string (path to saved PDB file)',
                metrics: 'object (containing Average pLDDT confidence score)'
            },
            example: {
                success: true,
                pdb_file: '/static/pdb_files/protein_20250618_021417.pdb',
                metrics: { 'Average pLDDT': 85.2 }
            }
        },
        exampleUsage: 'Quick structure prediction for protein sequences up to ~400 residues for initial analysis',
        limitations: ['Requires NVIDIA Cloud Functions API key', 'May have sequence length limits', 'Network dependency'],
        citations: [
            'Lin, Z., Akin, H., Rao, R., Hie, B., Zhu, Z., Lu, W., ... & Rives, A. (2023). Evolutionary-scale prediction of atomic-level protein structure with a language model. Science, 379(6637), 1123-1130.'
        ]
    }, {
        id: 'openfold_predict',
        name: 'OpenFold Predict',
        category: '3D Structure Prediction',
        description: 'Predict 3D protein structure using OpenFold - fast method with ~30 second prediction time and customizable model parameters',
        toolsUsed: ['NVIDIA Cloud Functions', 'OpenFold API', 'OpenFold deep learning models'],

        frontendUsage: {
            userInterface: 'Block with sequence input and expandable configuration panel',
            userInputs: [
                {
                    name: 'Protein Sequence',
                    type: 'Connection from previous block',
                    description: 'Amino acid sequence from Generate Protein block or File Upload',
                    required: true
                }
            ],
            configParams: {
                selected_models: {
                    description: 'Which OpenFold model parameter sets to use for prediction',
                    significance: 'Multiple models provide ensemble predictions for better confidence assessment',
                    type: 'Multi-select checkboxes',
                    defaultValue: [1, 2, 3, 4, 5],
                    options: [1, 2, 3, 4, 5],
                    userGuidance: 'Select multiple models for ensemble prediction (recommended) or single model for faster results'
                },
                relax_prediction: {
                    description: 'Whether to run structural relaxation using AMBER force field',
                    significance: 'Relaxation improves structure quality but increases computation time significantly',
                    type: 'Toggle switch',
                    defaultValue: false,
                    userGuidance: 'Enable for final production structures, disable for initial screening'
                }
            },
            screenshots: {
                blockInterface: 'https://i.ibb.co/LDy7zMJ7/Screenshot-2025-06-18-185805.png',
                resultsSample: 'Screenshot placeholder: Predicted structure with ensemble confidence metrics'
            }
        },

        inputFormat: {
            description: 'Protein sequence with optional model parameters',
            formats: [
                'sequence: string - Amino acid sequence',
                'selected_models: array - Model parameter sets to use [1,2,3,4,5] (default: all)',
                'relax_prediction: boolean - Run structural relaxation (default: false)'
            ]
        },
        outputFormat: {
            description: 'Predicted structure with confidence metrics',
            structure: {
                success: 'boolean',
                structure: 'string (PDB format)',
                pdb_file: 'string (path to saved PDB file)',
                metrics: 'object (Average pLDDT, Model Parameter Set)'
            }
        },
        exampleUsage: 'Structure prediction with multiple model variants for improved accuracy assessment',
        limitations: ['Requires NVIDIA Cloud Functions API key', 'Longer computation time than ESMFold', 'Network dependency'],
        citations: [
            'Ahdritz, G., Bouatta, N., Floristean, C., Kadyan, S., Xia, Q., et al. (2022). OpenFold: Retraining AlphaFold2 yields new insights into its learning mechanisms. bioRxiv.'
        ]
    }, {
        id: 'alphafold2_predict',
        name: 'AlphaFold2 Predict',
        category: '3D Structure Prediction',
        description: 'Predict 3D protein structure using AlphaFold2 - most accurate method with ~6 minute prediction time and extensive customization options',
        toolsUsed: ['NVIDIA Cloud Functions', 'AlphaFold2 API', 'DeepMind AlphaFold2 model', 'MSA search algorithms'],

        frontendUsage: {
            userInterface: 'Complex block with advanced configuration panel containing multiple tabs/sections',
            userInputs: [
                {
                    name: 'Protein Sequence',
                    type: 'Connection from previous block',
                    description: 'Amino acid sequence from Generate Protein block or File Upload',
                    required: true
                }
            ],
            configParams: {
                e_value: {
                    description: 'E-value threshold for MSA sequence filtering',
                    significance: 'Lower values = more stringent filtering, fewer but higher quality sequences in MSA',
                    type: 'Number input',
                    defaultValue: 0.0001,
                    range: '1e-10 to 1.0',
                    userGuidance: 'Use 0.0001 for standard searches, lower for highly conserved proteins'
                },
                databases: {
                    description: 'Sequence databases used for Multiple Sequence Alignment',
                    significance: 'Database choice significantly impacts structure prediction quality',
                    type: 'Multi-select checkboxes',
                    defaultValue: ['small_bfd'],
                    options: ['uniref90', 'mgnify', 'small_bfd'],
                    userGuidance: 'small_bfd for speed, add uniref90+mgnify for maximum accuracy'
                },
                algorithm: {
                    description: 'Algorithm for MSA generation',
                    significance: 'mmseqs2 is faster, jackhmmer is more sensitive (AlphaFold2 training standard)',
                    type: 'Radio buttons',
                    defaultValue: 'mmseqs2',
                    options: ['mmseqs2', 'jackhmmer'],
                    userGuidance: 'Use mmseqs2 for speed, jackhmmer for research-quality results'
                },
                iterations: {
                    description: 'Number of MSA search iterations',
                    significance: 'More iterations find distantly related sequences but increase computation time',
                    type: 'Number input',
                    defaultValue: 1,
                    range: '1 to 5',
                    userGuidance: 'Use 1 for most cases, 3-5 for novel or divergent sequences'
                },
                relax_prediction: {
                    description: 'Run AMBER structural relaxation',
                    significance: 'Improves structure quality but significantly increases time',
                    type: 'Toggle switch',
                    defaultValue: false,
                    userGuidance: 'Enable for final production structures only'
                },
                structure_model_preset: {
                    description: 'AlphaFold2 model configuration',
                    significance: 'Monomer for single chains, multimer for protein complexes',
                    type: 'Radio buttons',
                    defaultValue: 'monomer',
                    options: ['monomer', 'multimer'],
                    userGuidance: 'Use monomer unless predicting protein-protein interactions'
                },
                num_predictions_per_model: {
                    description: 'Number of predictions per model variant',
                    significance: 'Multiple predictions provide confidence estimates',
                    type: 'Number input',
                    defaultValue: 1,
                    range: '1 to 5',
                    userGuidance: 'Use 1 for screening, 5 for critical applications'
                },
                max_msa_sequences: {
                    description: 'Maximum sequences in final MSA',
                    significance: 'More sequences improve accuracy but increase memory/time requirements',
                    type: 'Number input',
                    defaultValue: 512,
                    range: '128 to 5120',
                    userGuidance: '512 for standard use, increase for critical predictions'
                },
                template_searcher: {
                    description: 'Method for finding structural templates',
                    significance: 'hhsearch for monomers, hmmsearch for multimers',
                    type: 'Radio buttons',
                    defaultValue: 'hhsearch',
                    options: ['hhsearch', 'hmmsearch'],
                    userGuidance: 'Use hhsearch unless using multimer preset'
                }
            },
            screenshots: {
                blockInterface: 'Screenshot placeholder: AlphaFold2 block with advanced configuration icon',
                resultsSample: 'Screenshot placeholder: High-quality predicted structure with detailed confidence metrics'
            }
        },

        inputFormat: {
            description: 'Protein sequence with comprehensive parameters',
            formats: [
                'sequence: string - Amino acid sequence',
                'e_value: float - E-value for MSA filtering (default: 0.0001)',
                'databases: array - MSA databases ["uniref90", "mgnify", "small_bfd"]',
                'algorithm: string - MSA algorithm ("mmseqs2" or "jackhmmer")',
                'iterations: int - MSA iterations (default: 1)',
                'relax_prediction: boolean - Run AMBER relaxation (default: false)',
                'structure_model_preset: string - "monomer" or "multimer"',
                'num_predictions_per_model: int - Predictions per model (default: 1)',
                'max_msa_sequences: int - Max MSA sequences (default: 512)',
                'template_searcher: string - "hhsearch" or "hmmsearch"'
            ]
        },
        outputFormat: {
            description: 'High-accuracy predicted structure with detailed metrics',
            structure: {
                success: 'boolean',
                structure: 'string (PDB format)',
                pdb_file: 'string (path to saved PDB file)',
                metrics: 'object (confidence scores, model rankings)'
            }
        }, exampleUsage: 'High-accuracy structure prediction for critical applications requiring best possible structural models',
        limitations: ['Requires NVIDIA Cloud Functions API key', 'Longest computation time (~6 minutes)', 'Complex parameter tuning', 'Network bandwidth requirements for large MSAs'],
        citations: [
            'Jumper, J., Evans, R., Pritzel, A., Green, T., Figurnov, M., et al. (2021). Highly accurate protein structure prediction with AlphaFold. Nature, 596(7873), 583-589.'
        ]
    },

    {
        id: 'colabfold_search',
        name: 'ColabFold MSA Search',
        category: 'Multiple Sequence Alignment',
        description: 'Search for homologous sequences using ColabFold MSA - fast and modern approach with ~20 second search time',
        toolsUsed: ['NVIDIA Cloud Functions', 'ColabFold API', 'MMseqs2', 'Multiple sequence databases'],
        inputFormat: {
            description: 'Protein sequence with search parameters',
            formats: [
                'sequence: string - Query amino acid sequence',
                'e_value: float - E-value threshold (default: 0.0001)',
                'iterations: int - Search iterations (default: 1)',
                'databases: array - Databases to search ["Uniref30_2302", "PDB70_220313", "colabfold_envdb_202108"]',
                'output_alignment_formats: array - Output formats ["fasta"]'
            ]
        },
        outputFormat: {
            description: 'Multiple sequence alignment results with homologous sequences',
            structure: {
                success: 'boolean',
                results: 'object (normalized MSA results)',
                alignments: 'object (database-specific alignments)',
                msa: 'object (sequences array with identity scores)'
            }
        },
        exampleUsage: 'Fast homology search for phylogenetic analysis or structure prediction input',
        limitations: ['Requires NVIDIA Cloud Functions API key', 'Database coverage may vary', 'Network dependency'], citations: [
            'Mirdita, M., Schütze, K., Moriwaki, Y., Steinegger, M., Söding, J., & Levy Karin, E. (2022). ColabFold: making protein folding accessible to all. Nature methods, 19(6), 679-682.',
            'Jumper, J., Evans, R., Pritzel, A., et al. (2021). Highly accurate protein structure prediction with AlphaFold. Nature, 596(7873), 583-589.',
            'Kallenborn, H., Steinegger, M., Rost, B., & Mirdita, M. (2025). GPU-accelerated homology search with MMseqs2. bioRxiv.'
        ]
    },

    {
        id: 'ncbi_blast_search',
        name: 'NCBI BLAST Search',
        category: 'BLAST Search',
        description: 'Search for homologous sequences using NCBI BLAST - standard method with comprehensive database coverage (~6 minutes)',
        toolsUsed: ['NCBI BLAST API', 'BLASTP algorithm', 'nr (non-redundant) database', 'BeautifulSoup HTML parsing'],
        inputFormat: {
            description: 'Protein sequence with BLAST parameters',
            formats: [
                'sequence: string - Query amino acid sequence',
                'e_value: float - E-value threshold (default: 0.0001)',
                'database: string - Target database (default: "nr")'
            ]
        },
        outputFormat: {
            description: 'BLAST search results with sequence alignments',
            structure: {
                success: 'boolean',
                results: 'object (normalized BLAST results)',
                alignments: 'object (hit details with scores and alignments)',
                msa: 'object (aligned sequences for phylogenetic analysis)'
            }
        },
        exampleUsage: 'Comprehensive homology search using the standard NCBI nr database for thorough sequence analysis',
        limitations: ['Longer search time', 'Dependent on NCBI server availability', 'Rate limiting may apply'],
        citations: [
            'Camacho, C., Coulouris, G., Avagyan, V., Ma, N., Papadopoulos, J., Bealer, K., & Madden, T. L. (2009). BLAST+: architecture and applications. BMC bioinformatics, 10(1), 1-9.'
        ]
    },

    {
        id: 'local_blast_search',
        name: 'Local BLAST Search',
        category: 'BLAST Search',
        description: 'Search using local BLAST databases - custom database search with ~1 minute search time',
        toolsUsed: ['Local BLASTP executable', 'Custom BLAST databases', 'Pandas for result processing'],
        inputFormat: {
            description: 'Protein sequence with local database parameters',
            formats: [
                'sequence: string - Query amino acid sequence',
                'database: string - Path to local BLAST database',
                'e_value: float - E-value threshold (default: 0.0001)',
                'interpro_ids: array - InterPro IDs for filtering (optional)'
            ]
        },
        outputFormat: {
            description: 'Local BLAST results with alignment details',
            structure: {
                success: 'boolean',
                results: 'object (formatted BLAST results)',
                alignments: 'object (local database hits)',
                msa: 'object (sequences from local database matches)'
            }
        },
        exampleUsage: 'Search against specialized or custom protein databases for targeted analysis',
        limitations: ['Requires local BLAST installation', 'Database must be pre-built', 'Limited to available local databases'],
        citations: [
            'Camacho, C., Coulouris, G., Avagyan, V., Ma, N., Papadopoulos, J., Bealer, K., & Madden, T. L. (2009). BLAST+: architecture and applications. BMC bioinformatics, 10(1), 1-9.'
        ]
    },

    {
        id: 'search_structure',
        name: 'Search Structure',
        category: '3D Structure Search',
        description: 'Search for similar protein structures using FoldSeek - fast 3D structure alignment and similarity search',
        toolsUsed: ['FoldSeek web API', 'FoldSeek algorithm', 'Structural databases (AlphaFold DB, PDB)'],
        inputFormat: {
            description: 'Protein structure in PDB format',
            formats: [
                'structure: string - Path to PDB file containing 3D structure'
            ]
        },
        outputFormat: {
            description: 'Structurally similar proteins with alignment details',
            structure: {
                success: 'boolean',
                results: 'object (processed structure search results)',
                databases: 'object (hits from different structural databases)',
                top_hits: 'array (best structural matches with scores)'
            }
        },
        exampleUsage: 'Find structurally similar proteins even without sequence similarity for functional annotation',
        limitations: ['Requires internet connection', 'Dependent on FoldSeek server availability', 'Structure quality affects results'],
        citations: [
            'van Kempen, M., Kim, S. S., Tumescheit, C., et al. (2024). Fast and accurate protein structure search with Foldseek. Nature Biotechnology, 42(2), 243-246.'
        ]
    },

    {
        id: 'blast_db_builder',
        name: 'BLAST Database Builder',
        category: 'BLAST Search',
        description: 'Build custom BLAST databases from FASTA files or Pfam family IDs for targeted sequence searches',
        toolsUsed: ['NCBI makeblastdb', 'InterPro API', 'UniProt API', 'Pfam database queries'],
        inputFormat: {
            description: 'FASTA file or Pfam IDs for database construction',
            formats: [
                'fasta_file: string - Path to FASTA file with sequences (optional)',
                'pfam_ids: array - List of Pfam family IDs ["PF00001", "PF00002"] (optional)',
                'db_name: string - Name for the resulting database (optional)'
            ]
        },
        outputFormat: {
            description: 'Built BLAST database files and metadata',
            structure: {
                success: 'boolean',
                database: 'string (path to built database)',
                fasta: 'string (path to source FASTA file)',
                sequences_count: 'int (number of sequences in database)',
                database_files: 'array (list of generated database files)'
            }
        },
        exampleUsage: 'Create a specialized database from kinase sequences (PF00069) for targeted BLAST searches',
        limitations: ['Requires local BLAST+ installation', 'Pfam API rate limits', 'Large downloads may be time-consuming'],
        citations: [
            'Camacho, C., Coulouris, G., Avagyan, V., Ma, N., Papadopoulos, J., Bealer, K., & Madden, T. L. (2009). BLAST+: architecture and applications. BMC bioinformatics, 10(1), 1-9.'
        ]
    },

    {
        id: 'predict_binding_sites',
        name: 'Predict Binding Sites',
        category: 'Docking',
        description: 'Predict ligand binding sites on protein surfaces using P2Rank - fast cavity detection (~30 seconds)',
        toolsUsed: ['P2Rank', 'Machine learning-based pocket prediction', 'Geometric cavity detection'],
        inputFormat: {
            description: 'Protein structure in PDB format',
            formats: [
                'structure: string - Path to PDB file containing protein 3D structure'
            ]
        },
        outputFormat: {
            description: 'Predicted binding sites with scores and coordinates',
            structure: {
                success: 'boolean',
                binding_sites: 'array (binding site predictions with coordinates and scores)',
                pockets_file: 'string (path to detailed pocket predictions)',
                visualization_files: 'array (PyMOL and ChimeraX compatible files)'
            }
        }, exampleUsage: 'Identify potential drug binding sites on a protein structure before molecular docking studies, or analyze cavity druggability for pharmaceutical research',
        limitations: ['Requires local P2Rank installation', 'Accuracy depends on structure quality and resolution', 'May miss cryptic or allosteric sites', 'Performance varies with protein size and complexity'], citations: [
            'Krivák, R., & Hoksza, D. (2018). P2Rank: machine learning based tool for rapid and accurate prediction of ligand binding sites from protein structure. Journal of cheminformatics, 10(1), 1-16.',
            'Polák, L., Škoda, P., Riedlová, K., Krivák, R., Novotný, M., & Hoksza, D. (2025). PrankWeb 4: a modular web server for protein–ligand binding site prediction and downstream analysis. Nucleic Acids Research.',
            'Jakubec, D., Škoda, P., Krivák, R., Novotný, M., & Hoksza, D. (2022). PrankWeb 3: accelerated ligand-binding site predictions for experimental and modelled protein structures. Nucleic Acids Research, 50(W1), W593-W597.'
        ]
    },

    {
        id: 'perform_docking',
        name: 'Molecular Docking',
        category: 'Docking',
        description: 'Perform molecular docking between proteins and ligands using AutoDock Vina with customizable parameters',
        toolsUsed: ['AutoDock Vina', 'MGLTools', 'RDKit', 'Meeko', 'PDBQT file preparation'],

        frontendUsage: {
            userInterface: 'Multi-input block with three connection points and comprehensive configuration panel',
            userInputs: [
                {
                    name: 'Protein Structure',
                    type: 'Connection from structure prediction or file upload',
                    description: 'PDB file containing the target protein structure',
                    required: true
                },
                {
                    name: 'Ligand Molecule',
                    type: 'Connection from file upload',
                    description: 'SDF or MOL2 file containing the ligand to dock',
                    required: true
                },
                {
                    name: 'Binding Sites',
                    type: 'Connection from binding site prediction (optional)',
                    description: 'Predicted binding sites from P2Rank block',
                    required: false
                }
            ],
            configParams: {
                center_x: {
                    description: 'X-coordinate of docking box center',
                    significance: 'Defines where to search for binding poses - critical for accuracy',
                    type: 'Number input',
                    defaultValue: 0,
                    range: '-100 to 100 Å',
                    userGuidance: 'Use binding site coordinates or protein center-of-mass'
                },
                center_y: {
                    description: 'Y-coordinate of docking box center',
                    significance: 'Defines where to search for binding poses - critical for accuracy',
                    type: 'Number input',
                    defaultValue: 0,
                    range: '-100 to 100 Å',
                    userGuidance: 'Use binding site coordinates or protein center-of-mass'
                },
                center_z: {
                    description: 'Z-coordinate of docking box center',
                    significance: 'Defines where to search for binding poses - critical for accuracy',
                    type: 'Number input',
                    defaultValue: 0,
                    range: '-100 to 100 Å',
                    userGuidance: 'Use binding site coordinates or protein center-of-mass'
                },
                size_x: {
                    description: 'Size of docking box in X dimension',
                    significance: 'Larger boxes cover more area but increase computation time',
                    type: 'Number input',
                    defaultValue: 20,
                    range: '10 to 50 Å',
                    userGuidance: '20Å for small molecules, 30-40Å for larger ligands'
                },
                size_y: {
                    description: 'Size of docking box in Y dimension',
                    significance: 'Larger boxes cover more area but increase computation time',
                    type: 'Number input',
                    defaultValue: 20,
                    range: '10 to 50 Å',
                    userGuidance: '20Å for small molecules, 30-40Å for larger ligands'
                },
                size_z: {
                    description: 'Size of docking box in Z dimension',
                    significance: 'Larger boxes cover more area but increase computation time',
                    type: 'Number input',
                    defaultValue: 20,
                    range: '10 to 50 Å',
                    userGuidance: '20Å for small molecules, 30-40Å for larger ligands'
                },
                exhaustiveness: {
                    description: 'Search thoroughness parameter',
                    significance: 'Higher values find better poses but take much longer',
                    type: 'Number input',
                    defaultValue: 16,
                    range: '1 to 32',
                    userGuidance: '8 for quick screening, 16 for standard, 32 for critical applications'
                },
                num_modes: {
                    description: 'Number of binding poses to generate',
                    significance: 'More modes provide alternative binding configurations',
                    type: 'Number input',
                    defaultValue: 10,
                    range: '1 to 20',
                    userGuidance: '10 for standard use, increase for flexible ligands'
                },
                cpu: {
                    description: 'Number of CPU cores to use',
                    significance: 'More cores reduce computation time linearly',
                    type: 'Number input',
                    defaultValue: 4,
                    range: '1 to 16',
                    userGuidance: 'Match to available system cores for optimal performance'
                }
            },
            screenshots: {
                blockInterface: 'Screenshot placeholder: Docking block with three input connections and configuration gear',
                resultsSample: 'Screenshot placeholder: Docking results showing multiple poses with binding affinity scores'
            }
        },

        inputFormat: {
            description: 'Protein structure, ligand molecule, and docking parameters',
            formats: [
                'structure: string - Path to protein PDB file',
                'molecule: string - Path to ligand file (SDF, MOL2)',
                'binding_sites: object - Binding site coordinates (optional)',
                'center_x, center_y, center_z: float - Docking box center coordinates',
                'size_x, size_y, size_z: float - Docking box dimensions (default: 20Å)',
                'exhaustiveness: int - Search exhaustiveness (default: 16)',
                'num_modes: int - Number of binding modes (default: 10)',
                'cpu: int - Number of CPU cores (default: 4)'
            ]
        },
        outputFormat: {
            description: 'Docking results with binding poses and scores',
            structure: {
                success: 'boolean',
                results: 'object (docking results with binding poses)',
                best_pose: 'object (top-ranked binding pose)',
                binding_affinity: 'float (predicted binding affinity in kcal/mol)',
                poses_file: 'string (path to SDF file with all poses)'
            }
        },
        exampleUsage: 'Dock potential drug compounds against a protein target to predict binding modes and affinities',
        limitations: ['Requires AutoDock Vina installation', 'Rigid protein assumption', 'Scoring function limitations'],
        citations: [
            'Eberhardt, J., Santos-Martins, D., Tillack, A. F., & Forli, S. (2021). AutoDock Vina 1.2.0: New docking methods, expanded force field, and Python bindings. Journal of chemical information and modeling, 61(8), 3891-3898.',
            'Trott, O., & Olson, A. J. (2010). AutoDock Vina: improving the speed and accuracy of docking with a new scoring function, efficient optimization, and multithreading. Journal of computational chemistry, 31(2), 455-461.'
        ]
    },

    {
        id: 'build_phylogenetic_tree',
        name: 'Phylogenetic Tree',
        category: 'Phylogenetic Analysis',
        description: 'Build phylogenetic trees from BLAST/MSA results using various distance methods and tree construction algorithms',
        toolsUsed: ['BioPython Phylo', 'Distance calculators', 'Tree construction algorithms', 'Multiple sequence alignments', 'Clustal Omega (for MSA refinement)'],

        frontendUsage: {
            userInterface: 'Single-input block with tree construction configuration panel',
            userInputs: [
                {
                    name: 'MSA Results',
                    type: 'Connection from BLAST or MSA search blocks',
                    description: 'Multiple sequence alignment data from sequence similarity searches',
                    required: true
                }
            ],
            configParams: {
                tree_method: {
                    description: 'Algorithm for tree construction',
                    significance: 'Different methods have different assumptions about evolutionary processes',
                    type: 'Radio buttons',
                    defaultValue: 'neighbor_joining',
                    options: ['neighbor_joining', 'upgma'],
                    userGuidance: 'Neighbor-joining for most cases, UPGMA assumes constant evolutionary rate'
                },
                distance_model: {
                    description: 'Method for calculating evolutionary distances',
                    significance: 'Different models account for different types of sequence changes',
                    type: 'Radio buttons',
                    defaultValue: 'identity',
                    options: ['identity', 'blosum62'],
                    userGuidance: 'Identity for simple comparisons, BLOSUM62 for amino acid substitutions'
                },
                max_sequences: {
                    description: 'Maximum number of sequences to include in tree',
                    significance: 'Too many sequences make trees unreadable, too few lose information',
                    type: 'Number input',
                    defaultValue: 50,
                    range: '3 to 200',
                    userGuidance: '50 for standard trees, increase for comprehensive phylogenies'
                },
                min_sequence_length: {
                    description: 'Minimum sequence length to include',
                    significance: 'Short sequences provide unreliable phylogenetic signal',
                    type: 'Number input',
                    defaultValue: 50,
                    range: '20 to 500',
                    userGuidance: '50 for proteins, adjust based on domain/motif analysis'
                },
                remove_gaps: {
                    description: 'Remove alignment gaps before tree construction',
                    significance: 'Gaps can mislead distance calculations but may contain phylogenetic information',
                    type: 'Toggle switch',
                    defaultValue: true,
                    userGuidance: 'Enable for most cases, disable for gap-pattern analysis'
                }
            },
            screenshots: {
                blockInterface: 'Screenshot placeholder: Phylogenetic tree block connected to MSA results',
                resultsSample: 'Screenshot placeholder: Generated phylogenetic tree with branch lengths and bootstrap values'
            }
        },

        inputFormat: {
            description: 'MSA results from BLAST searches with tree parameters',
            formats: [
                'results: object - MSA results from BLAST/ColabFold searches',
                'tree_method: string - Tree construction method ("neighbor_joining", "upgma")',
                'distance_model: string - Distance calculation model ("identity", "blosum62")',
                'max_sequences: int - Maximum sequences to include (default: 50)',
                'min_sequence_length: int - Minimum sequence length (default: 50)',
                'remove_gaps: boolean - Remove gap positions (default: true)'
            ]
        },
        outputFormat: {
            description: 'Phylogenetic tree in multiple formats with visualization data',
            structure: {
                success: 'boolean',
                tree: 'object (phylogenetic tree structure)',
                newick_format: 'string (tree in Newick format)',
                tree_file: 'string (path to saved tree file)',
                visualization_data: 'object (data for tree visualization)',
                sequence_count: 'int (number of sequences in tree)'
            }
        },
        exampleUsage: 'Build evolutionary relationships from BLAST search results to understand protein family evolution',
        limitations: ['Requires quality MSA input', 'Large trees may be computationally intensive', 'Distance methods may not reflect true phylogeny'], citations: [
            'Cock, P. J., Antao, T., Chang, J. T., Chapman, B. A., Cox, C. J., et al. (2009). Biopython: freely available Python tools for computational molecular biology and bioinformatics. Bioinformatics, 25(11), 1422-1423.',
            'Sievers, F., Wilm, A., Dineen, D., Gibson, T. J., Karplus, K., Li, W., et al. (2011). Fast, scalable generation of high-quality protein multiple sequence alignments using Clustal Omega. Molecular systems biology, 7(1), 539.'
        ]
    },

    {
        id: 'analyze_ramachandran',
        name: 'Ramachandran Plot',
        category: 'Structure Analysis',
        description: 'Generate Ramachandran plot analysis for protein backbone dihedral angles (φ, ψ) to assess structure quality',
        toolsUsed: ['BioPython PDB parser', 'Matplotlib', 'RamPlot', 'Dihedral angle calculations'],
        inputFormat: {
            description: 'Protein structure in PDB format',
            formats: [
                'structure: string - Path to PDB file containing protein 3D structure'
            ]
        },
        outputFormat: {
            description: 'Ramachandran plot with backbone angle analysis',
            structure: {
                success: 'boolean',
                ramachandran_plot: 'string (path to plot image)',
                angles_data: 'array (phi-psi angles for each residue)',
                quality_assessment: 'object (percentage in favored/allowed regions)',
                outliers: 'array (residues with unusual backbone angles)'
            }
        }, exampleUsage: 'Validate the quality of a predicted protein structure by analyzing backbone conformations and identifying regions with unusual phi-psi angles',
        limitations: ['Only analyzes backbone angles', 'Requires complete backbone atoms (N, CA, C)', 'May not detect side-chain clashes or other structural issues', 'Glycine and proline have different allowed regions'], citations: [
            'Kumar, M., & Rathore, R. S. (2025). RamPlot: A webserver to draw 2D, 3D, and assorted Ramachandran (φ, ψ) maps. Journal of Applied Crystallography, 58(3), 630-636.'
        ]
    },

    {
        id: 'evaluate_structure',
        name: 'Structure Evaluation',
        category: 'Structure Analysis',
        description: 'Evaluate structural similarity between two protein structures using USalign - provides TM-score, RMSD, and alignment metrics',
        toolsUsed: ['USalign', 'Structural superposition algorithms', 'TM-score calculation', 'RMSD computation'],
        inputFormat: {
            description: 'Two protein structures in PDB format for comparison',
            formats: [
                '**structure1**: string - Path to first PDB file (reference structure)',
                '**structure2**: string - Path to second PDB file (query structure)'
            ]
        },        outputFormat: {
            description: 'Comprehensive structural similarity analysis with metrics, interpretations, and quality assessment',
            structure: {
                success: 'boolean',
                metrics: {
                    tm_score: 'float (TM-score: 0-1, >0.5 indicates similar fold)',
                    rmsd: 'float (Root Mean Square Deviation in Angstroms)',
                    aligned_length: 'int (number of aligned residues)',
                    seq_id: 'float (sequence identity of aligned regions)'
                },
                interpretations: {
                    tm_score: 'string (human-readable TM-score interpretation)',
                    rmsd: 'string (human-readable RMSD interpretation)', 
                    seq_id: 'string (human-readable sequence identity interpretation)'
                },
                summary: 'string (overall comparison summary)',
                quality_assessment: {
                    structural_similarity: 'string (High/Medium/Low)',
                    geometric_accuracy: 'string (High/Medium/Low)',
                    sequence_conservation: 'string (High/Medium/Low)'
                }
            },
            example: {
                success: true,
                metrics: {
                    tm_score: 0.87,
                    rmsd: 1.23,
                    aligned_length: 142,
                    seq_id: 0.34
                },
                interpretations: {
                    tm_score: "Very similar structures",
                    rmsd: "Very good alignment",
                    seq_id: "Moderately similar sequences"
                },
                summary: "Structural comparison complete: very similar structures with very good alignment (1.23Å RMSD, 0.870 TM-score)",
                quality_assessment: {
                    structural_similarity: "High",
                    geometric_accuracy: "High", 
                    sequence_conservation: "Medium"
                }
            }
        },
        exampleUsage: 'Compare a predicted protein structure with an experimental structure to assess prediction quality, or compare different conformations of the same protein',
        limitations: ['Requires USalign installation', 'Both structures must have sufficient overlap', 'Performance depends on structure quality', 'May not detect domain rearrangements well'],
        citations: [
            'Zhang, C., Shine, M., Pyle, A. M., & Zhang, Y. (2022). US-align: Universal Structure Alignment of Proteins, Nucleic Acids and Macromolecular Complexes. Nature Methods, 19(2), 195-204.'
        ]
    }, {
        id: 'blast_analysis',
        name: 'BLAST Analysis',
        category: 'Analysis',
        description: 'Interactive analysis of sequence search results with scatter plots and hit tables for exploring homology relationships',
        toolsUsed: ['Matplotlib', 'Plotly', 'Pandas', 'Interactive data visualization', 'Statistical analysis'],

        frontendUsage: {
            userInterface: 'Analysis block with interactive visualization panel displaying scatter plots and data tables',
            userInputs: [
                {
                    name: 'BLAST Results',
                    type: 'Connection from BLAST search blocks',
                    description: 'BLAST search results from NCBI or local BLAST searches',
                    required: true
                }
            ],
            configParams: 'No configuration parameters - automatic analysis with interactive controls',
            screenshots: {
                blockInterface: 'Screenshot placeholder: BLAST Analysis block with results connection',
                resultsSample: 'Screenshot placeholder: Interactive scatter plot showing E-value vs bit score with hit table'
            }
        },

        inputFormat: {
            description: 'BLAST search results with hit information',
            formats: [
                'blast_results: object - BLAST results with alignments, scores, and hit details'
            ]
        },
        outputFormat: {
            description: 'Interactive analysis dashboard with visualizations',
            structure: {
                success: 'boolean',
                analysis_type: 'string ("blast_analysis")',
                visualizations: 'object (scatter plots, histograms, summary statistics)',
                hit_table: 'array (formatted hit data for interactive table)',
                summary_stats: 'object (total hits, best scores, coverage statistics)'
            }
        },
        exampleUsage: 'Analyze BLAST search results to identify the best homologous sequences and understand score distributions',
        limitations: ['Requires BLAST results input', 'Visualization complexity increases with large result sets'],
        citations: [
            'Camacho, C., Coulouris, G., Avagyan, V., Ma, N., Papadopoulos, J., Bealer, K., & Madden, T. L. (2009). BLAST+: architecture and applications. BMC bioinformatics, 10(1), 1-9.'
        ]
    },

    {
        id: 'foldseek_analysis',
        name: 'FoldSeek Analysis',
        category: 'Analysis',
        description: 'Interactive analysis of structural search results with scatter plots and hit tables for exploring structural relationships',
        toolsUsed: ['Matplotlib', 'Plotly', 'Pandas', 'Interactive data visualization', '3D structure analysis'],

        frontendUsage: {
            userInterface: 'Analysis block with interactive visualization panel displaying structural similarity plots and hit tables',
            userInputs: [
                {
                    name: 'FoldSeek Results',
                    type: 'Connection from structure search blocks',
                    description: 'FoldSeek structural search results with similarity scores',
                    required: true
                }
            ],
            configParams: 'No configuration parameters - automatic analysis with interactive controls',
            screenshots: {
                blockInterface: 'Screenshot placeholder: FoldSeek Analysis block with structure search connection',
                resultsSample: 'Screenshot placeholder: Interactive plots showing TM-score vs RMSD with structural hit table'
            }
        },

        inputFormat: {
            description: 'FoldSeek structural search results',
            formats: [
                'foldseek_results: object - Structural search results with TM-scores, alignments, and hit details'
            ]
        },
        outputFormat: {
            description: 'Interactive structural analysis dashboard',
            structure: {
                success: 'boolean',
                analysis_type: 'string ("foldseek_analysis")',
                visualizations: 'object (TM-score plots, RMSD distributions, structural alignments)',
                hit_table: 'array (formatted structural hit data)',
                summary_stats: 'object (best TM-scores, coverage statistics, database distribution)'
            }
        },
        exampleUsage: 'Analyze FoldSeek results to identify structurally similar proteins and understand fold conservation patterns',
        limitations: ['Requires FoldSeek results input', 'Complex visualizations may be slow with large datasets'],
        citations: [
            'van Kempen, M., Kim, S. S., Tumescheit, C., et al. (2024). Fast and accurate protein structure search with Foldseek. Nature Biotechnology, 42(2), 243-246.'
        ]
    },

    {
        id: 'msa_analysis',
        name: 'MSA Analysis',
        category: 'Analysis',
        description: 'Interactive analysis of Multiple Sequence Alignment results with conservation plots, sequence logos, and alignment quality metrics',
        toolsUsed: ['BioPython', 'Matplotlib', 'Plotly', 'Logomaker', 'Sequence conservation analysis'],

        frontendUsage: {
            userInterface: 'Analysis block with comprehensive MSA visualization including conservation plots and sequence logos',
            userInputs: [
                {
                    name: 'MSA Results',
                    type: 'Connection from MSA search blocks',
                    description: 'Multiple sequence alignment results from ColabFold or other MSA tools',
                    required: true
                }
            ],
            configParams: 'No configuration parameters - automatic analysis with comprehensive visualizations',
            screenshots: {
                blockInterface: 'Screenshot placeholder: MSA Analysis block with MSA results connection',
                resultsSample: 'Screenshot placeholder: Conservation plots, sequence logos, and alignment statistics'
            }
        },

        inputFormat: {
            description: 'Multiple sequence alignment results',
            formats: [
                'msa_results: object - MSA data with aligned sequences, conservation scores, and alignment metadata'
            ]
        },
        outputFormat: {
            description: 'Comprehensive MSA analysis with conservation metrics',
            structure: {
                success: 'boolean',
                analysis_type: 'string ("msa_analysis")',
                visualizations: 'object (conservation plots, sequence logos, gap analysis)',
                conservation_scores: 'array (per-position conservation values)',
                alignment_quality: 'object (coverage, identity, gaps statistics)',
                sequence_count: 'int (number of sequences in alignment)'
            }
        },
        exampleUsage: 'Analyze MSA results to identify conserved regions, functional motifs, and alignment quality for downstream analysis',
        limitations: ['Requires quality MSA input', 'Large alignments may impact visualization performance'],
        citations: [
            'Cock, P. J., Antao, T., Chang, J. T., Chapman, B. A., Cox, C. J., et al. (2009). Biopython: freely available Python tools for computational molecular biology and bioinformatics. Bioinformatics, 25(11), 1422-1423.'
        ]
    },

    {
        id: 'taxonomy_analysis',
        name: 'Taxonomy Analysis',
        category: 'Analysis',
        description: 'Interactive analysis of taxonomic distribution from BLAST results showing species distribution and phylogenetic diversity',
        toolsUsed: ['NCBI Taxonomy API', 'Matplotlib', 'Plotly', 'Pandas', 'Taxonomic classification', 'Tree visualization'],

        frontendUsage: {
            userInterface: 'Analysis block with taxonomic visualization including pie charts, tree plots, and species distribution tables',
            userInputs: [
                {
                    name: 'BLAST Results',
                    type: 'Connection from BLAST search blocks',
                    description: 'BLAST results containing taxonomic information from database hits',
                    required: true
                }
            ],
            configParams: 'No configuration parameters - automatic taxonomic analysis with interactive plots',
            screenshots: {
                blockInterface: 'Screenshot placeholder: Taxonomy Analysis block with BLAST results connection',
                resultsSample: 'Screenshot placeholder: Taxonomic pie charts, species distribution, and phylogenetic tree visualization'
            }
        },

        inputFormat: {
            description: 'BLAST results with taxonomic annotations',
            formats: [
                'blast_results: object - BLAST results containing species information and taxonomic identifiers'
            ]
        },
        outputFormat: {
            description: 'Comprehensive taxonomic analysis with distribution plots',
            structure: {
                success: 'boolean',
                analysis_type: 'string ("taxonomy_analysis")',
                visualizations: 'object (taxonomic pie charts, distribution plots, phylogenetic trees)',
                species_distribution: 'object (species counts and percentages)',
                taxonomic_tree: 'object (hierarchical taxonomic classification)',
                diversity_metrics: 'object (Shannon diversity, species richness)'
            }
        },
        exampleUsage: 'Analyze BLAST results to understand the evolutionary distribution and taxonomic diversity of homologous sequences',
        limitations: ['Requires BLAST results with taxonomic information', 'Dependent on database annotation quality', 'May require internet access for taxonomy resolution'],
        citations: [
            'Federhen, S. (2012). The NCBI Taxonomy database. Nucleic acids research, 40(D1), D136-D143.',
            'Camacho, C., Coulouris, G., Avagyan, V., Ma, N., Papadopoulos, J., Bealer, K., & Madden, T. L. (2009). BLAST+: architecture and applications. BMC bioinformatics, 10(1), 1-9.'
        ]
    },

    {
        id: 'multi_download',
        name: 'Multi Download',
        category: 'I/O',
        description: 'Download output files from multiple completed pipeline blocks in a single ZIP archive with organized reports and data',
        toolsUsed: ['Custom DownloadHandler class', 'ZIP file compression', 'Report generation utilities', 'File formatting tools'],
        inputFormat: {
            description: 'References to completed pipeline blocks',
            formats: [
                'input: array - List of completed block outputs to include in download'
            ]
        },
        outputFormat: {
            description: 'Compressed ZIP archive containing organized results',
            structure: {
                success: 'boolean',
                download_url: 'string (URL to download ZIP archive)',
                included_files: 'array (list of files included in archive)',
                archive_structure: 'object (organized folder structure)',
                archive_size: 'int (size in bytes)'
            },
            example: {
                success: true,
                download_url: '/download/results_20250618_123456.zip',
                archive_structure: {
                    'report/': ['summary_report.txt', 'detailed_report.html'],
                    'msa/': ['sequences.fasta', 'alignments.txt'],
                    'structures/': ['protein_predicted.pdb'],
                    'docking/': ['docking_results.sdf', 'binding_scores.csv']
                }
            }
        },
        exampleUsage: 'Download all results from a complete pipeline run including structures, MSA data, docking results, and formatted reports',
        limitations: ['File size limits may apply', 'Temporary storage limitations', 'Download link expiration'],
        citations: []
    }
];

const categories = ['All', 'I/O', 'Generate Protein', 'Iterate', '3D Structure Prediction', 'Multiple Sequence Alignment', 'BLAST Search', '3D Structure Search', 'Docking', 'Analysis', 'Phylogenetic Analysis', 'Structure Analysis'];
export { documentation, categories };