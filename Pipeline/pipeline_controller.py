from typing import Dict, Any
from text_processor import TextProcessor, PipelineFunction
from Tools.DeNovo.protein_generator import ProteinGenerator
from Tools.TDStructure.Prediction.esm_predictor import ESM_Predictor
from Tools.TDStructure.Prediction.af2_predictor import AlphaFold2_Predictor
from Tools.TDStructure.Prediction.openfold_predictor import OpenFold_Predictor
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.ncbi_blast_searcher import NCBI_BLAST_Searcher
from Tools.Search.BLAST.colabfold_msa_search import ColabFold_MSA_Searcher
from Tools.Search.BLAST.local_blast import LocalBlastSearcher
from job_manager import Job
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
        self.conversation_memory = conversation_memory
        self.job_manager = job_manager
        self.selected_functions = []

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
            # Get the file path and output type from parameters
            file_path = params.get('filePath')
            output_type = params.get('outputType')
            
            if not file_path or not output_type:
                return {"success": False, "error": "Missing file path or output type"}
            
            # Construct the full file path
            full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads', file_path)
            
            if not os.path.exists(full_path):
                return {"success": False, "error": "File not found"}
            
            # Return the appropriate output based on file type
            if output_type == 'structure':
                result = {
                    "success": True,
                    "pdb_file": file_path,
                    "outputType": "structure"
                }
            elif output_type == 'molecule':
                result = {
                    "success": True,
                    "molecule_file": file_path,
                    "outputType": "molecule"
                }
            else:
                return {"success": False, "error": "Invalid output type"}
                
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
                fasta_path = params.get("fasta_file", None)
                custom_db = params.get("db_name", None)
                interpro_ids = params.get("interpro_ids", None)
                
                # Run local BLAST search
                result = self.local_blast_searcher.search(
                    sequence=sequence,
                    fasta_file=fasta_path,
                    db_name=custom_db,
                    interpro_ids=interpro_ids
                )
                
                # If search was successful, check results
                if result.get("success"):
                    # For local BLAST, results are returned immediately
                    return result
                else:
                    return {"success": False, "error": result.get("error", "Local BLAST search failed")}
            else:
                return {"success": False, "error": f"Unknown search type: {search_type}"}
            
        return result

    def _get_dependency_type(self, function_name: str) -> str:
        """Get the type of job that this function depends on."""
        dependencies = {
            PipelineFunction.PREDICT_STRUCTURE.value: PipelineFunction.GENERATE_PROTEIN.value,
            PipelineFunction.SEARCH_STRUCTURE.value: PipelineFunction.PREDICT_STRUCTURE.value,
            PipelineFunction.EVALUATE_STRUCTURE.value: PipelineFunction.PREDICT_STRUCTURE.value,
            PipelineFunction.SEARCH_SIMILARITY.value: PipelineFunction.GENERATE_PROTEIN.value
        }
        return dependencies.get(function_name)

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
