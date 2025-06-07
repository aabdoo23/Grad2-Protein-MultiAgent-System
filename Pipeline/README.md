# Protein Automation Pipeline

This system provides a comprehensive suite of tools for protein analysis, designed to be used by bioinformaticians. It automates various tasks in protein research, from sequence generation to structure prediction, similarity searching, and functional analysis. The pipeline is orchestrated by a `PipelineController` that manages job execution and data flow between different tools.

## Core Components

### 1. Flask Application (`app.py`)

*   **Functionality**: Serves as the backend API for the system. It handles user requests, manages sessions, orchestrates job execution via the `PipelineController`, and serves static files (PDB, docking results). It also provides endpoints for file uploads, downloads, and status checks for various bioinformatics tasks.
*   **Input**: HTTP requests for various endpoints (e.g., `/chat`, `/confirm-job`, `/upload-file`, `/download-pdb`).
*   **Output**: JSON responses, file downloads, or status updates.
*   **Relevance**: Provides the primary interface for users to interact with the pipeline, submit jobs, and retrieve results. It's crucial for integrating the various bioinformatics tools into a cohesive web-based application.

### 2. Pipeline Controller (`Pipeline/util/flow/pipeline_controller.py`)

*   **Functionality**: Manages the execution of bioinformatics tasks (jobs). It processes user input (natural language or structured requests), creates job objects, and executes them using the appropriate tools. It handles dependencies between jobs, ensuring that the output of one job can be used as input for the next.
*   **Input**: User commands (text-based), job definitions (function name, parameters).
*   **Output**: Job results (dictionaries containing success status, data like PDB file paths, sequences, metrics, etc.), explanations of the pipeline's actions.
*   **Relevance**: The central orchestrator of the automation pipeline. It allows users to define complex workflows by chaining different bioinformatics tools together.

## Bioinformatics Tools

The `PipelineController` integrates and manages the following bioinformatics tools:

### 1. File Upload Handler
   - **Underlying Logic**: Managed by the `/upload-file` endpoint in `app.py` and processed by `PipelineController`'s `execute_job` method when `job.function_name == 'file_upload'`.
   - **Functionality**: Allows users to upload files (PDB for structures, SDF/MOL2 for molecules, FASTA for sequences). Uploaded files are stored temporarily and can be used as input for other pipeline tools. Sequence files (FASTA) are parsed to extract individual sequences.
   - **Input**:
        *   `file`: The file to be uploaded.
        *   `outputType`: Specifies the type of the uploaded file ('structure', 'molecule', or 'sequence').
   - **Output**:
        *   `success`: Boolean indicating success.
        *   `filePath`: Path to the uploaded file.
        *   `outputType`: The type of the file.
        *   `sequence` (if `outputType` is 'sequence' and only one sequence is in the file): The protein sequence string.
        *   `sequences_list` (if `outputType` is 'sequence' and multiple sequences are in the file): A list of protein sequence strings.
   - **Relevance**: Essential for providing custom data (protein structures, ligands, or sequences) to the pipeline, enabling analysis of user-specific targets.

### 2. Protein Generation (`ProteinGenerator`)
   - **Underlying Logic**: Implemented in `Tools.DeNovo.protein_generator.ProteinGenerator`.
   - **Functionality**: Generates novel protein sequences based on a user-provided prompt or criteria. This is likely a de novo protein design tool.
   - **Input**:
        *   `prompt`: A text prompt describing the desired characteristics of the protein to be generated.
   - **Output**:
        *   `success`: Boolean indicating success.
        *   `sequence`: The generated protein sequence.
        *   `info`: Additional information about the generation process.
   - **Relevance**: Enables the exploration of novel protein sequences with desired properties, a key aspect of protein engineering and synthetic biology.

### 3. Structure Prediction
   - **Underlying Logic**: Uses one of three predictors:
        *   `ESM_Predictor` (`Tools.TDStructure.Prediction.esm_predictor.ESM_Predictor`) for ESMFold.
        *   `AlphaFold2_Predictor` (`Tools.TDStructure.Prediction.af2_predictor.AlphaFold2_Predictor`) for AlphaFold2.
        *   `OpenFold_Predictor` (`Tools.TDStructure.Prediction.openfold_predictor.OpenFold_Predictor`) for OpenFold.
   - **Functionality**: Predicts the 3D structure of a protein from its amino acid sequence using advanced deep learning models.
   - **Input**:
        *   `sequence`: The amino acid sequence of the protein.
        *   `model_type`: Specifies which prediction model to use (`esmfold_predict`, `alphafold2_predict`, `openfold_predict`).
        *   Additional parameters specific to AlphaFold2 or OpenFold (e.g., `params` in `af2_predictor.predict_structure` and `openfold_predictor.predict_structure`).
   - **Output**:
        *   `success`: Boolean indicating success.
        *   `pdb_file`: Path to the predicted PDB file.
        *   `metrics`: Quality metrics of the prediction (e.g., pLDDT scores).
        *   `error` (if not successful): Error message.
   - **Relevance**: A cornerstone of modern bioinformatics. Predicting protein structure is crucial for understanding function, designing drugs, and engineering proteins. Automating this step significantly speeds up research.

### 4. Structure Search (`FoldseekSearcher`)
   - **Underlying Logic**: Implemented in `Tools.Search.FoldSeek.foldseek_searcher.FoldseekSearcher`. Uses FoldSeek for fast and sensitive 3D structure alignment and search.
   - **Functionality**: Searches a database of protein structures for structures similar to a given query PDB file.
   - **Input**:
        *   `pdb_file`: Path to the query PDB file.
   - **Output**:
        *   `success`: Boolean indicating success.
        *   `results`: A list of similar structures found, including their identifiers and alignment scores.
        *   `pdb_file`: The original query PDB file path.
        *   `error` (if not successful): Error message.
   - **Relevance**: Allows bioinformaticians to find structurally similar proteins, which can imply functional similarity or evolutionary relationships, even in the absence of sequence similarity.

### 5. Structure Evaluation (`StructureEvaluator`)
   - **Underlying Logic**: Implemented in `Tools.TDStructure.Evaluation.structure_evaluator.StructureEvaluator`. Likely uses tools like USalign for structural alignment and comparison.
   - **Functionality**: Evaluates the structural similarity between two PDB files, providing metrics like TM-score, RMSD, etc.
   - **Input**:
        *   `pdb_file1`: Path to the first PDB file.
        *   `pdb_file2`: Path to the second PDB file.
   - **Output**:
        *   `success`: Boolean indicating success.
        *   Metrics from the structural comparison (e.g., TM-score, RMSD, alignment details).
        *   `error` (if not successful): Error message.
   - **Relevance**: Essential for comparing different structural models (e.g., predicted vs. experimental, or two different predictions) and quantifying their similarity or differences.

### 6. Sequence Similarity Search
   - **Underlying Logic**: Uses one of three searchers:
        *   `NCBI_BLAST_Searcher` (`Tools.Search.BLAST.ncbi_blast_searcher.NCBI_BLAST_Searcher`) for NCBI BLAST.
        *   `ColabFold_MSA_Searcher` (`Tools.Search.BLAST.colabfold_msa_search.ColabFold_MSA_Searcher`) for ColabFold's MSA generation pipeline.
        *   `LocalBlastSearcher` (`Tools.Search.BLAST.local_blast.LocalBlastSearcher`) for running BLAST against local databases.
   - **Functionality**: Searches sequence databases for sequences similar to a query sequence.
   - **Input**:
        *   `sequence`: The query protein sequence.
        *   `model_type`: Specifies the search tool (`ncbi_blast_search`, `colabfold_search`, `local_blast_search`).
        *   `params` (for NCBI BLAST): Additional BLAST parameters.
        *   `database` (for Local BLAST): Information about the local BLAST database, including its `path`.
        *   `e_value` (for Local BLAST): E-value threshold.
        *   `interpro_ids` (for Local BLAST): List of InterPro IDs to filter results.
   - **Output**:
        *   `success`: Boolean indicating success.
        *   For NCBI BLAST: `rid` (request ID for checking results later), `status`.
        *   For ColabFold MSA: MSA results (often in A3M format or similar).
        *   For Local BLAST: Direct search results, including alignments and scores.
        *   `error` (if not successful): Error message.
   - **Relevance**: A fundamental bioinformatics task for finding homologous proteins, inferring function, and building multiple sequence alignments for further analysis (e.g., phylogenetic studies, structure prediction).

### 7. Binding Site Prediction (`PrankTool`)
   - **Underlying Logic**: Implemented in `Tools.Docking.P2Rank.prank_tool.PrankTool`. Uses P2Rank to predict ligand binding sites on protein structures.
   - **Functionality**: Identifies and characterizes potential ligand binding pockets on the surface of a protein structure.
   - **Input**:
        *   `pdb_file`: Path to the protein PDB file.
        *   `output_dir` (optional): Directory to save P2Rank output files.
   - **Output**:
        *   `success`: Boolean indicating success.
        *   `pdb_filename`: Name of the input PDB file.
        *   `result_path`: Path to the P2Rank output directory.
        *   `predictions_csv`: Path to the CSV file containing binding site predictions.
        *   `binding_sites`: A list of predicted binding sites with their properties (e.g., score, residues, center coordinates).
        *   `summary`: Summary statistics of the prediction (e.g., total sites found).
        *   `top_site`: Detailed information about the highest-scoring binding site.
        *   `message`: A summary message.
        *   `error` (if not successful): Error message.
   - **Relevance**: Crucial for drug discovery and functional annotation. Identifying binding sites helps in understanding protein-ligand interactions and guiding docking studies.

### 8. Molecular Docking (`DockingTool`)
   - **Underlying Logic**: Implemented in `Tools.Docking.docking_tool.DockingTool`. Likely uses AutoDock Vina or a similar docking program.
   - **Functionality**: Predicts the binding mode and affinity of a ligand to a protein receptor. It can use binding site information from P2Rank or user-defined coordinates.
   - **Input**:
        *   `pdb_file` (protein_file): Path to the protein PDB file.
        *   `molecule_file` (ligand_file): Path to the ligand file (e.g., SDF, MOL2).
        *   `center_x`, `center_y`, `center_z`: Coordinates of the center of the docking box.
        *   `size_x`, `size_y`, `size_z` (optional, defaults to 20): Dimensions of the docking box.
        *   `exhaustiveness` (optional, default 16): Computational effort for the search.
        *   `num_modes` (optional, default 10): Number of binding modes to generate.
        *   `cpu` (optional, default 4): Number of CPUs to use.
        *   `top_site` (optional): Output from P2Rank, can be used if `auto_center` is true and explicit center coordinates are not provided.
        *   `auto_center` (optional, default false): If true and `top_site` is available, uses its center for docking. If no center is provided, it attempts to run P2Rank automatically to find a binding site.
   - **Output**:
        *   `success`: Boolean indicating success.
        *   Docking results, including paths to output PDBQT files for docked poses, binding affinities (scores), and potentially other metrics.
        *   `error` (if not successful): Error message.
   - **Relevance**: A key tool in computer-aided drug design for predicting how small molecules bind to proteins, helping to prioritize candidates for further experimental testing.

### 9. BLAST Database Building (`BlastDatabaseBuilder`)
   - **Underlying Logic**: Implemented in `Tools.Search.BLAST.database_builder.BlastDatabaseBuilder`. Uses NCBI's `makeblastdb` command-line tool.
   - **Functionality**: Builds custom BLAST databases from FASTA files or by fetching sequences associated with Pfam IDs.
   - **Input**:
        *   `fasta_file` (optional): Path to a FASTA file containing sequences.
        *   `pfam_ids` (optional): A list of Pfam IDs.
        *   `sequence_types` (optional, default `['unreviewed', 'reviewed', 'uniprot']`): Types of sequences to fetch from UniProt if using Pfam IDs.
        *   `db_name` (optional): Desired name for the database.
   - **Output**:
        *   `success`: Boolean indicating success.
        *   `db_path`: Path to the created BLAST database files.
        *   `db_name`: Name of the created database.
        *   `fasta_path` (if applicable): Path to the FASTA file used or generated.
        *   `error` (if not successful): Error message.
   - **Relevance**: Allows bioinformaticians to perform BLAST searches against custom sequence datasets (e.g., specific genomes, proteomes, or curated sequence collections), which is essential for targeted research.

## Workflow and Automation

The `PipelineController` enables the automation of complex bioinformatics workflows by:

1.  **Parsing User Input**: It uses a `TextProcessor` to understand natural language commands and identify the desired tools and their parameters.
2.  **Job Creation**: For each identified tool/function, it creates a `Job` object managed by a `JobManager`.
3.  **Dependency Management**: The controller can define dependencies between jobs (e.g., the output of `GENERATE_PROTEIN` is used as input for `PREDICT_STRUCTURE`). The `_get_dependency_type` and `_chain_job_parameters` methods handle this logic.
    *   `PREDICT_STRUCTURE` depends on `GENERATE_PROTEIN` (or a file upload providing a sequence).
    *   `SEARCH_STRUCTURE` depends on `PREDICT_STRUCTURE` (or a file upload providing a structure).
    *   `EVALUATE_STRUCTURE` depends on `PREDICT_STRUCTURE` (or file uploads providing structures).
    *   `SEARCH_SIMILARITY` depends on `GENERATE_PROTEIN` (or a file upload providing a sequence).
    *   `PREDICT_BINDING_SITES` depends on `PREDICT_STRUCTURE` (or a file upload providing a structure).
    *   `PERFORM_DOCKING` depends on `PREDICT_STRUCTURE` (for protein) and a file upload (for ligand), and can optionally use output from `PREDICT_BINDING_SITES`.
4.  **Job Execution**: Jobs are executed sequentially or in parallel (handled by `app.py` using threading for background execution). The `execute_job` method in `PipelineController` calls the appropriate tool's method.
5.  **Result Handling**: Results from each job are stored and can be passed to subsequent dependent jobs or returned to the user.

This system is highly relevant for bioinformaticians as it:
*   **Automates Repetitive Tasks**: Reduces manual effort in running various bioinformatics tools.
*   **Integrates Multiple Tools**: Provides a single platform to access a wide range of functionalities.
*   **Facilitates Complex Analyses**: Allows for the creation of multi-step analysis pipelines.
*   **Improves Reproducibility**: Standardizes the execution of bioinformatics tasks.
*   **User-Friendly Interface**: The Flask app and chatbot interface (implied by `ConversationMemory` and `TextProcessor`) make these tools more accessible.

## Future Directions
- Implement new tools on command
- Add visualization for external results