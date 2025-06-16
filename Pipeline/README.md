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

# Citings:
- ## P2Rank

### 

If you use P2Rank, please cite relevant papers: 


* [Software article](https://doi.org/10.1186/s13321-018-0285-8) about P2Rank pocket prediction tool  
 Krivak R, Hoksza D. ***P2Rank: machine learning based tool for rapid and accurate prediction of ligand binding sites from protein structure.*** Journal of Cheminformatics. 2018 Aug.  
~~~bibtex
@article{p2rank,
    title={{P2Rank: machine learning based tool for rapid and accurate prediction of ligand binding sites from protein structure}},
    author={Kriv{\'a}k, Radoslav and Hoksza, David},
    journal={Journal of cheminformatics},
    volume={10},
    number={1},
    pages={39},
    year={2018},
    publisher={Nature Publishing Group},
    doi={10.1186/s13321-018-0285-8}
}
~~~

* [Latest web-server article](https://doi.org/10.1093/nar/gkaf421) about updates in P2Rank and [prankweb.cz](https://prankweb.cz)
 Polak L, Skoda P, Riedlova K, Krivak R, Novotny M, Hoksza D. ***PrankWeb 4: a modular web server for protein–ligand binding site prediction and downstream analysis.*** Nucleic Acids Research, 2025 May.
~~~bibtex
@article{prankweb4,
    author = {Polák, Lukáš and Škoda, Petr and Riedlová, Kamila and Krivák, Radoslav and Novotný, Marian and Hoksza, David},
    title = {PrankWeb 4: a modular web server for protein–ligand binding site prediction and downstream analysis},
    journal = {Nucleic Acids Research},
    pages = {gkaf421},
    year = {2025},
    month = {05},
    abstract = {Knowledge of protein–ligand binding sites (LBSs) is crucial for advancing our understanding of biology and developing practical applications in fields such as medicine or biotechnology. PrankWeb is a web server that allows users to predict LBSs from a given three-dimensional structure. It provides access to P2Rank, a state-of-the-art machine learning tool for binding site prediction. Here, we present a new version of PrankWeb enabling the development of both client- and server-side modules acting as postprocessing tasks on the predicted pockets. Furthermore, each module can be associated with a visualization module that acts on the results provided by both client- and server-side modules. This newly developed system was utilized to implement the ability to dock user-provided molecules into the predicted pockets using AutoDock Vina (server-side module) and to interactively visualize the predicted poses (visualization module). In addition to introducing a modular architecture, we revamped PrankWeb’s interface to better support the modules and enhance user interaction between the 1D and 3D viewers. We introduced a new, faster P2Rank backend or user-friendly exports, including ChimeraX visualization.},
    issn = {1362-4962},
    doi = {10.1093/nar/gkaf421},
    url = {https://doi.org/10.1093/nar/gkaf421},
    eprint = {https://academic.oup.com/nar/advance-article-pdf/doi/10.1093/nar/gkaf421/63227728/gkaf421.pdf},
}
~~~


* [Web-server article](https://doi.org/10.1093/nar/gkac389) about updates in the web interface [prankweb.cz](https://prankweb.cz)  
 Jakubec D, Skoda P, Krivak R, Novotny M, Hoksza D. ***PrankWeb 3: accelerated ligand-binding site predictions for experimental and modelled protein structures.*** Nucleic Acids Research, Volume 50, Issue W1, 5 July 2022, Pages W593–W597  
~~~bibtex
@article{prankweb3,
    title = "{PrankWeb 3: accelerated ligand-binding site predictions for experimental and modelled protein structures}",
    author = {Jakubec, David and Skoda, Petr and Krivak, Radoslav and Novotny, Marian and Hoksza, David},
    journal = {Nucleic Acids Research},
    volume = {50},
    number = {W1},
    pages = {W593-W597},
    year = {2022},
    month = {05},
    abstract = "{Knowledge of protein–ligand binding sites (LBSs) enables research ranging from protein function annotation to structure-based drug design. To this end, we have previously developed a stand-alone tool, P2Rank, and the web server PrankWeb (https://prankweb.cz/) for fast and accurate LBS prediction. Here, we present significant enhancements to PrankWeb. First, a new, more accurate evolutionary conservation estimation pipeline based on the UniRef50 sequence database and the HMMER3 package is introduced. Second, PrankWeb now allows users to enter UniProt ID to carry out LBS predictions in situations where no experimental structure is available by utilizing the AlphaFold model database. Additionally, a range of minor improvements has been implemented. These include the ability to deploy PrankWeb and P2Rank as Docker containers, support for the mmCIF file format, improved public REST API access, or the ability to batch download the LBS predictions for the whole PDB archive and parts of the AlphaFold database.}",
    issn = {0305-1048},
    doi = {10.1093/nar/gkac389},
}
~~~

* [Web-server article](https://doi.org/10.1093/nar/gkz424) introducing the web interface at [prankweb.cz](https://prankweb.cz)  
 Jendele L, Krivak R, Skoda P, Novotny M, Hoksza D. ***PrankWeb: a web server for ligand binding site prediction and visualization.*** Nucleic Acids Research, Volume 47, Issue W1, 02 July 2019, Pages W345-W349 
~~~bibtex
@article{prankweb,
    title="{{P}rank{W}eb: a web server for ligand binding site prediction and visualization}",
    author="Jendele, L.  and Krivak, R.  and Skoda, P.  and Novotny, M.  and Hoksza, D. ",
    journal="Nucleic Acids Res.",
    year="2019",
    volume="47",
    number="W1",
    pages="W345-W349",
    month="Jul",
    doi={10.1093/nar/gkz424}
}
~~~

* [Conference paper](https://doi.org/10.1007/978-3-319-21233-3_4) introducing P2Rank prediction algorithm  
 Krivak R, Hoksza D. ***P2RANK: Knowledge-Based Ligand Binding Site Prediction Using Aggregated Local Features.*** International Conference on Algorithms for Computational Biology 2015 Aug 4 (pp. 41-52). Springer
~~~bibtex
@inproceedings{p2rank-alcob,
    title={{P2RANK: Knowledge-Based Ligand Binding Site Prediction Using Aggregated Local Features}},
    author={Kriv{\'a}k, Radoslav and Hoksza, David},
    booktitle={International Conference on Algorithms for Computational Biology},
    pages={41--52},
    year={2015},
    organization={Springer},
    doi={10.1007/978-3-319-21233-3_4}
}
~~~

* [Research article](https://doi.org/10.1186/s13321-015-0059-5) about PRANK rescoring algorithm (now included in P2Rank)  
 Krivak R, Hoksza D. ***Improving protein-ligand binding site prediction accuracy by classification of inner pocket points using local features.*** Journal of Cheminformatics. 2015 Dec.
~~~bibtex
@article{prank,
    author={Kriv{\'a}k, Radoslav and Hoksza, David},
    title={Improving protein-ligand binding site prediction accuracy by classification of inner pocket points using local features},
    journal={Journal of Cheminformatics},
    year={2015},
    month={Apr},
    day={01},
    volume={7},
    number={1},
    pages={12},
    abstract={Protein-ligand binding site prediction from a 3D protein structure plays a pivotal role in rational drug design and can be helpful in drug side-effects prediction or elucidation of protein function. Embedded within the binding site detection problem is the problem of pocket ranking -- how to score and sort candidate pockets so that the best scored predictions correspond to true ligand binding sites. Although there exist multiple pocket detection algorithms, they mostly employ a fairly simple ranking function leading to sub-optimal prediction results.},
    issn={1758-2946},
    doi={10.1186/s13321-015-0059-5}
}
~~~

- ## Autodock vina
* [J. Eberhardt, D. Santos-Martins, A. F. Tillack, and S. Forli. (2021). AutoDock Vina 1.2.0: New Docking Methods, Expanded Force Field, and Python Bindings. Journal of Chemical Information and Modeling.](https://pubs.acs.org/doi/10.1021/acs.jcim.1c00203) 
* [O. Trott and A. J. Olson. (2010). AutoDock Vina: improving the speed and accuracy of docking with a new scoring function, efficient optimization, and multithreading. Journal of computational chemistry, 31(2), 455-461.](https://onlinelibrary.wiley.com/doi/10.1002/jcc.21334)

- ## BlastP
Camacho, C., Coulouris, G., Avagyan, V., Ma, N., Papadopoulos, J., Bealer, K., and Madden, T.L. 2009. BLAST+: architecture and applications. BMC Bioinformatics, 10, 421.


- ## Clustalo
Sievers F, Wilm A, Dineen D, Gibson TJ, Karplus K, Li W, Lopez R, McWilliam H, Remmert M, Söding J, Thompson JD, Higgins DG. Fast, scalable generation of high-quality protein multiple sequence alignments using Clustal Omega. Mol Syst Biol. 2011 Oct 11;7:539. doi: 10.1038/msb.2011.75. PMID: 21988835; PMCID: PMC3261699.

- ## Colabfold
Mirdita, M., Schütze, K., Moriwaki, Y. et al. ColabFold: making protein folding accessible to all. Nat Methods 19, 679–682 (2022). https://doi.org/10.1038/s41592-022-01488-1

~~~bibtex
@article{jumper2021alphafold,
    title = "Highly accurate protein structure prediction with {AlphaFold}",
    author   = "Jumper, John and Evans, Richard and Pritzel, Alexander and Green,
                Tim and Figurnov, Michael and Ronneberger, Olaf and
                Tunyasuvunakool, Kathryn and Bates, Russ and {\v Z}{\'\i}dek,
                Augustin and Potapenko, Anna and Bridgland, Alex and Meyer,
                Clemens and Kohl, Simon A A and Ballard, Andrew J and Cowie,
                Andrew and Romera-Paredes, Bernardino and Nikolov, Stanislav and
                Jain, Rishub and Adler, Jonas and Back, Trevor and Petersen, Stig
                and Reiman, David and Clancy, Ellen and Zielinski, Michal and
                Steinegger, Martin and Pacholska, Michalina and Berghammer, Tamas
                and Bodenstein, Sebastian and Silver, David and Vinyals, Oriol
                and Senior, Andrew W and Kavukcuoglu, Koray and Kohli, Pushmeet
                and Hassabis, Demis",
    journal  = "Nature",
    volume   =  596,
    number   =  7873,
    pages    = "583--589",
    month    =  aug,
    year     =  2021,
    language = "en",
    doi = {10.1038/s41586-021-03819-2},
}
~~~
~~~
@ARTICLE{mirdita2022colabfold,
    title   = "ColabFold: making protein folding accessible to all",
    author  = "Mirdita, Milot and Sch{\"u}tze, Konstantin and Moriwaki, Yoshitaka and Heo, Lim and Ovchinnikov, Sergey and Steinegger, Martin",
    journal = "Nature Methods",
    volume  = 19,
    number  = 6,
    pages   = "679--682",
    month   = jun,
    year    = 2022,
    language = "en",
    doi     = {10.1038/s41592-022-01488-1},
}
~~~
~~~
@ARTICLE{kallenborn2025gpu,
    title   = "GPU-accelerated homology search with MMseqs2",
    author  = "Kallenborn, Felix and Chacon, Alejandro and Hundt, Christian and Sirelkhatim, Hassan and Didi, Kieran and Cha, Sooyoung and Dallago, Christian and Mirdita, Milot and Schmidt, Bertil and Steinegger, Martin",
    journal = "bioRxiv",
    year    = 2025,
    month   = jan,
    day     = 20,
    language = "en",
    doi     = {10.1101/2024.11.13.623350},
}
~~~

- ## Foldseek
van Kempen, M., Kim, S.S., Tumescheit, C. et al. Fast and accurate protein structure search with Foldseek. Nat Biotechnol 42, 243–246 (2024). https://doi.org/10.1038/s41587-023-01773-0

- ## Ramplot
Cite: Kumar, Mayank & Rathore, R. S. (2025). RamPlot: A webserver to draw 2D, 3D, and assorted Ramachandran (φ, ψ) maps. Journal of Applied Crystallography, 58(3), 630-636. DOI :10.1107/S1600576725001669

- ## Usalign
Zhang, C., Shine, M., Pyle, A.M., & Zhang, Y. (2022). US-align: Universal Structure Alignment of Proteins, Nucleic Acids and Macromolecular Complexes. Nature Methods, 19(2), 195-204. 

- ## Alphafold2
Jumper, J. et al. “Highly accurate protein structure prediction with AlphaFold.” Nature, 596, pages 583–589 (2021). DOI: 10.1038/s41586-021-03819-2

- ## ESMFold
~~~
@article{lin2022language,
  title={Language models of protein sequences at the scale of evolution enable accurate structure prediction},
  author={Lin, Zeming and Akin, Halil and Rao, Roshan and Hie, Brian and Zhu, Zhongkai and Lu, Wenting and Smetanin, Nikita and dos Santos Costa, Allan and Fazel-Zarandi, Maryam and Sercu, Tom and Candido, Sal and others},
  journal={bioRxiv},
  year={2022},
  publisher={Cold Spring Harbor Laboratory}
}
~~~

- ## Openfold
~~~
@article {Ahdritz2022.11.20.517210,
	author = {Ahdritz, Gustaf and Bouatta, Nazim and Floristean, Christina and Kadyan, Sachin and Xia, Qinghui and Gerecke, William and O{\textquoteright}Donnell, Timothy J and Berenberg, Daniel and Fisk, Ian and Zanichelli, Niccolò and Zhang, Bo and Nowaczynski, Arkadiusz and Wang, Bei and Stepniewska-Dziubinska, Marta M and Zhang, Shang and Ojewole, Adegoke and Guney, Murat Efe and Biderman, Stella and Watkins, Andrew M and Ra, Stephen and Lorenzo, Pablo Ribalta and Nivon, Lucas and Weitzner, Brian and Ban, Yih-En Andrew and Sorger, Peter K and Mostaque, Emad and Zhang, Zhao and Bonneau, Richard and AlQuraishi, Mohammed},
	title = {{O}pen{F}old: {R}etraining {A}lpha{F}old2 yields new insights into its learning mechanisms and capacity for generalization},
	elocation-id = {2022.11.20.517210},
	year = {2022},
	doi = {10.1101/2022.11.20.517210},
	publisher = {Cold Spring Harbor Laboratory},
	URL = {https://www.biorxiv.org/content/10.1101/2022.11.20.517210},
	eprint = {https://www.biorxiv.org/content/early/2022/11/22/2022.11.20.517210.full.pdf},
	journal = {bioRxiv}
}
~~~