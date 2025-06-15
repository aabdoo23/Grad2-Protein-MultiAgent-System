from typing import Dict, Any
from util.chatbot.text_processor import TextProcessor, PipelineFunction
from Tools.DeNovo.protein_generator import ProteinGenerator
from Tools.TDStructure.Prediction.esm_predictor import ESM_Predictor
from Tools.TDStructure.Prediction.af2_predictor import AlphaFold2_Predictor
from Tools.TDStructure.Prediction.openfold_predictor import OpenFold_Predictor
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.ncbi_blast_searcher import NCBI_BLAST_Searcher
from Tools.Search.BLAST.colabfold_msa_search import ColabFold_MSA_Searcher
from Tools.Search.BLAST.local_blast import LocalBlastSearcher
from Tools.Search.Phylogeny.phylogenetic_tree_builder import PhylogeneticTreeBuilder
from Tools.Docking.docking_tool import DockingTool
from Tools.Docking.P2Rank.prank_tool import PrankTool
from Tools.TDStructure.Analysis.ramachandran_analyzer import RamachandranAnalyzer
from util.flow.job_manager import Job
from Tools.Search.BLAST.database_builder import BlastDatabaseBuilder
import os

class PipelineController:
    def __init__(self, conversation_memory, job_manager):
        # Instantiate all components
        self.text_processor = TextProcessor()
        self.protein_generator = ProteinGenerator()
        self.esm_predictor = ESM_Predictor()
        self.af2_predictor = AlphaFold2_Predictor()
        self.openfold_predictor = OpenFold_Predictor()
        self.foldseek_searcher = FoldseekSearcher()
        self.evaluator = StructureEvaluator()
        self.ncbi_blast_searcher = NCBI_BLAST_Searcher()
        self.colabfold_msa_searcher = ColabFold_MSA_Searcher()
        self.local_blast_searcher = LocalBlastSearcher()
        self.phylo_tree_builder = PhylogeneticTreeBuilder()
        self.conversation_memory = conversation_memory
        self.job_manager = job_manager
        self.selected_functions = []
        self.db_builder = BlastDatabaseBuilder()
        self.docking_tool = DockingTool()
        self.prank_tool = PrankTool()
        self.ramachandran_analyzer = RamachandranAnalyzer()

    def process_input(self, session_id: str, text: str) -> Dict[str, Any]:
        # Retrieve conversation history if needed
        history = self.conversation_memory.get_history(session_id)
        self.conversation_memory.add_message(session_id, "user", text)
        
        parsed = self.text_processor.process_input(text)
        if not parsed.get("success"):
            return {"success": False, "message": parsed.get("error")}
            
        self.selected_functions = parsed["functions"]
        jobs = []
        
        # Create jobs for each function
        for func in self.selected_functions:
            job = self.job_manager.create_job(
                title=PipelineFunction.get_description(func["name"]),
                description=self._generate_job_description(func),
                function_name=func["name"],
                parameters=func["parameters"]
            )
            jobs.append(job)
        
        # Set up dependencies between jobs
        for i, job in enumerate(jobs):
            # Define what type of job this job depends on
            dependency_type = self._get_dependency_type(job.function_name)
            if dependency_type:
                # Find the most recent job of the required type
                for prev_job in reversed(jobs[:i]):
                    if prev_job.function_name == dependency_type:
                        job.depends_on = prev_job.id
                        break
        
        # Add the natural language explanation to the conversation
        self.conversation_memory.add_message(session_id, "bot", parsed["explanation"])
        
        return {
            "success": True,
            "explanation": parsed["explanation"],
            "jobs": [job.to_dict() for job in jobs]
        }

    def execute_job(self, job: Job) -> Dict[str, Any]:
        name = job.function_name
        params = job.parameters
        result = {}
        
        # If this job depends on another, get its result first
        if hasattr(job, 'depends_on') and job.depends_on:
            previous_job = self.job_manager.get_job(job.depends_on)
            if previous_job and previous_job.result:
                # Update parameters based on previous job's result
                params = self._chain_job_parameters(previous_job.result, job)
        
        if name == 'file_upload':
            file_path = params.get('filePath')
            output_type = params.get('outputType') # This is 'structure', 'molecule', or 'sequence' (singular)
            
            if not file_path or not output_type:
                return {"success": False, "error": "Missing file path or output type"}
            
            if not os.path.exists(file_path):
                return {"success": False, "error": f"File not found at path: {file_path}"}
            
            if output_type == 'structure':
                result = {
                    "success": True,
                    "filePath": file_path, # Changed from pdb_file to filePath for consistency
                    "outputType": "structure"
                }
            elif output_type == 'molecule':
                result = {
                    "success": True,
                    "filePath": file_path, # Changed from molecule_file to filePath for consistency
                    "outputType": "molecule"
                }
            elif output_type == 'sequence': # Input 'outputType' from frontend is 'sequence'
                sequences_list = params.get('sequences', []) # Parsed by app.py's upload_file
                num_sequences = len(sequences_list)

                if num_sequences == 1:
                    result = {
                        "success": True,
                        "filePath": file_path,
                        "outputType": "sequence", 
                        "sequence": sequences_list[0]
                    }
                elif num_sequences > 1:
                    result = {
                        "success": True,
                        "filePath": file_path,
                        "outputType": "sequences_list", 
                        "sequences_list": sequences_list
                    }
                else:
                    result = {"success": False, "error": "No sequences found in the uploaded FASTA file."}
            else:
                return {"success": False, "error": f"Invalid output type for file_upload: {output_type}"}
                
        elif name == PipelineFunction.GENERATE_PROTEIN.value:
            result = self.protein_generator.generate(params.get("prompt", ""))
        elif name == PipelineFunction.PREDICT_STRUCTURE.value:
            sequence = params.get("sequence", "")
            model = params.get("model_type", "openfold")  # Default to OpenFold if not specified
            
            if model == "esmfold_predict":
                prediction = self.esm_predictor.predict_structure(sequence)
            elif model == "alphafold2_predict":
                prediction = self.af2_predictor.predict_structure(sequence, params)
            elif model == "openfold_predict":
                prediction = self.openfold_predictor.predict_structure(sequence, params)
            else:
                return {"success": False, "error": f"Unknown model: {model}"}
                
            if prediction.get("success"):
                result = {
                    "success": True,
                    "pdb_file": prediction["pdb_file"],
                    "metrics": prediction["metrics"]
                }
            else:
                result = {"success": False, "error": prediction.get("error")}
        elif name == PipelineFunction.SEARCH_STRUCTURE.value:
            pdb_file = params.get("pdb_file", "")
            if pdb_file:
                fold_result = self.foldseek_searcher.submit_search(pdb_file)
                if fold_result.get("success"):
                    search_results = self.foldseek_searcher.get_results(fold_result["ticket_id"])
                    if search_results.get("success"):
                        result = {
                            "success": True,
                            "results": search_results["results"],
                            "pdb_file": pdb_file  # Include the original PDB file path
                        }
                    else:
                        result = search_results
            else:
                result = {"success": False, "error": "No PDB file provided"}
        elif name == PipelineFunction.EVALUATE_STRUCTURE.value:
            pdb_file1 = params.get("pdb_file1", "")
            pdb_file2 = params.get("pdb_file2", "")
            if pdb_file1 and pdb_file2:
                result = self.evaluator.evaluate_with_usalign(pdb_file1, pdb_file2)
            else:
                result = {"success": False, "error": "No PDB file provided"}
        elif name == PipelineFunction.SEARCH_SIMILARITY.value:
            sequence = params.get("sequence", "")
            search_type = params.get("model_type", "ncbi")  # Default to NCBI BLAST
            
            if not sequence:
                return {"success": False, "error": "No sequence provided"}
                
            if search_type == "ncbi_blast_search":
                result = self.ncbi_blast_searcher.search(sequence, params)
            elif search_type == "colabfold_search":
                result = self.colabfold_msa_searcher.search(sequence, params)
            elif search_type == "local_blast_search":
                # Get local BLAST specific parameters
                sequence = params.get("sequence", "")
                e_value = params.get("e_value", 0.0001)
                interpro_ids = params.get("interpro_ids", [])
                
                # Get database information from input
                database = params.get("database", {})
                if isinstance(database, dict) and "database" in database:
                    database = database["database"]  # Unwrap the nested database object
                
                if not database or not database.get("path"):
                    return {"success": False, "error": "No database provided. Please connect a BLAST Database Builder block."}
                
                # Run local BLAST search
                result = self.local_blast_searcher.search(
                    sequence=sequence,
                    db_path=database["path"],
                    e_value=e_value,
                    interpro_ids=interpro_ids
                )
                
                # If search was successful, check results
                if result.get("success"):
                    # For local BLAST, results are returned immediately
                    return result
                else:
                    return {"success": False, "error": result.get("error", "Local BLAST search failed")}
            else:                return {"success": False, "error": f"Unknown search type: {search_type}"}
        elif name == PipelineFunction.PREDICT_BINDING_SITES.value:
            # Extract P2Rank parameters
            pdb_file = params.get('pdb_file')
            output_dir = params.get('output_dir')
            
            if not pdb_file:
                return {"success": False, "error": "No PDB file provided for binding site prediction"}
            
            # Run P2Rank analysis
            result = self.prank_tool.run_full_analysis(pdb_file, output_dir)
            
            if result.get('success'):
                # Return comprehensive binding site information
                return {
                    "success": True,
                    "pdb_filename": result['pdb_filename'],
                    "result_path": result['result_path'],
                    "predictions_csv": result['predictions_csv'],
                    "binding_sites": result['binding_sites'],
                    "summary": result['summary'],                    "top_site": result['top_site'],
                    "message": f"Found {result['summary']['total_sites']} binding sites"
                }
            else:
                return {"success": False, "error": result.get('error', 'P2Rank prediction failed')}
        elif name == PipelineFunction.BUILD_PHYLOGENETIC_TREE.value:
            # Extract phylogenetic tree parameters
            # Check both 'blast_results' and 'results' for backward compatibility
            blast_results = params.get('blast_results') or params.get('results')
            tree_method = params.get('tree_method', 'neighbor_joining')
            distance_model = params.get('distance_model', 'identity')
            max_sequences = params.get('max_sequences', 50)
            min_sequence_length = params.get('min_sequence_length', 50)
            remove_gaps = params.get('remove_gaps', True)
            
            if not blast_results:
                return {"success": False, "error": "No BLAST results provided for phylogenetic tree construction"}
            
            # Build phylogenetic tree
            parameters = {
                'method': tree_method,
                'distance_model': distance_model,
                'max_sequences': max_sequences,
                'min_sequence_length': min_sequence_length,
                'remove_gaps': remove_gaps
            }
            
            result = self.phylo_tree_builder.build_tree_from_blast_results(
                blast_results=blast_results,
                parameters=parameters
            )
            
            if result.get('success'):
                return {
                    "success": True,
                    "tree_data": result['tree'],
                    "alignment_data": result['alignment'],
                    "metadata": result['metadata'],
                    "message": f"Built phylogenetic tree with {result['alignment']['sequences_used']} sequences using {tree_method} method"
                }
            else:
                return {"success": False, "error": result.get('error', 'Phylogenetic tree construction failed')}
        elif name == 'build_database':
            return self.build_database(params)
        elif name == 'perform_docking':
            # Extract docking parameters
            protein_file = params.get('pdb_file') 
            ligand_file = params.get('molecule_file')  
            center_x = params.get('center_x')
            center_y = params.get('center_y')
            center_z = params.get('center_z')
            size_x = params.get('size_x', 20)
            size_y = params.get('size_y', 20)
            size_z = params.get('size_z', 20)
            exhaustiveness = params.get('exhaustiveness', 16)
            num_modes = params.get('num_modes', 10)
            cpu = params.get('cpu', 4)
            
            # Check if binding site information is available from previous P2Rank analysis
            top_site = params.get('top_site')
            auto_center = params.get('auto_center', False)
            
            if auto_center and top_site and not all([center_x, center_y, center_z]):
                # Use P2Rank results for binding site center
                center_x = top_site.get('center_x')
                center_y = top_site.get('center_y') 
                center_z = top_site.get('center_z')
                
            # If still no center coordinates, try to run P2Rank automatically
            if not all([center_x, center_y, center_z]) and protein_file:
                prank_result = self.prank_tool.run_full_analysis(protein_file)
                if prank_result.get('success') and prank_result.get('top_site'):
                    top_site = prank_result['top_site']
                    center_x = top_site.get('center_x')
                    center_y = top_site.get('center_y')
                    center_z = top_site.get('center_z')

            if not all([protein_file, ligand_file, center_x, center_y, center_z]):
                return {"success": False, "error": "Missing required docking parameters (protein_file, ligand_file, center coordinates)"}

            result = self.docking_tool.perform_docking(
                protein_file=protein_file,
                ligand_file=ligand_file,
                center_x=center_x,
                center_y=center_y,
                center_z=center_z,
                size_x=size_x,
                size_y=size_y,
                size_z=size_z,
                exhaustiveness=exhaustiveness,
                num_modes=num_modes,
                cpu=cpu            )
        elif name == PipelineFunction.ANALYZE_RAMACHANDRAN.value:
            # Extract Ramachandran analysis parameters
            pdb_file = params.get('pdb_file')
            output_dir = params.get('output_dir')
            
            if not pdb_file:
                return {"success": False, "error": "No PDB file provided for Ramachandran analysis"}
            
            # Run Ramachandran analysis
            result = self.ramachandran_analyzer.generate_ramachandran_analysis(pdb_file, output_dir)
            
            if result.get('success'):
                # Return comprehensive Ramachandran analysis information
                return {
                    "success": True,
                    "pdb_file": result['pdb_file'],
                    "plot_base64": result['plot_base64'],
                    "plot_path": result.get('plot_path'),
                    "data_path": result.get('data_path'),
                    "statistics": result['statistics'],
                    "residue_count": result['residue_count'],
                    "angle_data": result['angle_data'],
                    "timestamp": result['timestamp'],
                    "message": f"Generated Ramachandran plot for {result['residue_count']} residues"
                }
            else:
                return {"success": False, "error": result.get('error', 'Ramachandran analysis failed')}
            
        return result

    def _get_dependency_type(self, function_name: str) -> str:
        """Get the type of job that this function depends on."""
        dependencies = {
            PipelineFunction.PREDICT_STRUCTURE.value: PipelineFunction.GENERATE_PROTEIN.value,
            PipelineFunction.SEARCH_STRUCTURE.value: PipelineFunction.PREDICT_STRUCTURE.value,
            PipelineFunction.EVALUATE_STRUCTURE.value: PipelineFunction.PREDICT_STRUCTURE.value,
            PipelineFunction.SEARCH_SIMILARITY.value: PipelineFunction.GENERATE_PROTEIN.value,
            PipelineFunction.PREDICT_BINDING_SITES.value: PipelineFunction.PREDICT_STRUCTURE.value,
            PipelineFunction.BUILD_PHYLOGENETIC_TREE.value: PipelineFunction.SEARCH_SIMILARITY.value,
            PipelineFunction.ANALYZE_RAMACHANDRAN.value: PipelineFunction.PREDICT_STRUCTURE.value
        }
        return dependencies.get(function_name, "")

    def _chain_job_parameters(self, previous_result: Dict[str, Any], current_job: Job) -> Dict[str, Any]:
        """Update job parameters based on the previous job's result."""
        params = current_job.parameters.copy()
        
        # Map of job types to their output fields and corresponding parameter names
        output_mappings = {
            PipelineFunction.GENERATE_PROTEIN.value: {
                "sequence": "sequence"
            },
            PipelineFunction.PREDICT_STRUCTURE.value: {
                "pdb_file": "pdb_file",
                "sequence": "sequence"
            },
            PipelineFunction.PREDICT_BINDING_SITES.value: {
                "binding_sites": "binding_sites",
                "top_site": "top_site",
                "predictions_csv": "predictions_csv"
            },
            PipelineFunction.SEARCH_SIMILARITY.value: {
                "results": "blast_results"
            },
            PipelineFunction.ANALYZE_RAMACHANDRAN.value: {
                "plot_base64": "plot_base64",
                "plot_path": "plot_path",
                "statistics": "statistics",
                "angle_data": "angle_data"
            }
        }
        
        # Get the previous job type
        previous_job = self.job_manager.get_job(current_job.depends_on)
        if not previous_job:
            return params
            
        # Get the output mapping for the previous job
        mapping = output_mappings.get(previous_job.function_name, {})
        
        # Update parameters based on the mapping
        for output_field, param_name in mapping.items():
            if output_field in previous_result:
                params[param_name] = previous_result[output_field]
                
        return params

    def _generate_job_description(self, func: Dict[str, Any]) -> str:
        params = func["parameters"]
        if func["name"] == PipelineFunction.PREDICT_STRUCTURE.value:
            sequence = params.get("sequence", "")
            seq_length = len(sequence) if sequence else "N/A"
            model = params.get("model", "")
            model_info = f"Model: {model}" if model else "Model: To be selected"
            return f"Sequence length: {seq_length} amino acids\n{model_info}\nOutput: 3D structure prediction in PDB format\nAdditional analysis: Structure similarity search using FoldSeek"
        elif func["name"] == PipelineFunction.GENERATE_PROTEIN.value:
            prompt = params.get("prompt", "")
            return f"Target: {prompt}"
        elif func["name"] == PipelineFunction.SEARCH_STRUCTURE.value:
            return f"Search for similar structures in the database"
        elif func["name"] == PipelineFunction.EVALUATE_STRUCTURE.value:
            return f"Evaluate the 3D structure quality and properties"
        elif func["name"] == PipelineFunction.SEARCH_SIMILARITY.value:
            search_type = params.get("search_type", "colabfold")
            if search_type == "colabfold":
                return "Search for similar protein sequences using ColabFold MSA"
            else:
                return "Run a BLAST search on NCBI server in the nr database to find similar sequences"
        return "Execute the requested operation"

    def build_database(self, parameters):
        """Build a BLAST database from FASTA file or Pfam IDs."""
        try:
            fasta_file = parameters.get('fasta_file')
            pfam_ids = parameters.get('pfam_ids', [])
            db_name = parameters.get('db_name')
            sequence_types = parameters.get('sequence_types')

            result = self.db_builder.build_database(
                fasta_file=fasta_file,
                pfam_ids=pfam_ids,
                db_name=db_name,
                sequence_types=sequence_types
            )

            if result['success']:
                return {
                    'success': True,
                    'database': {
                        'path': result['db_path'],
                        'name': result['db_name']
                    },
                    'fasta_file': result['fasta_path']
                }
            else:
                return {
                    'success': False,
                    'error': result['error']
                }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
