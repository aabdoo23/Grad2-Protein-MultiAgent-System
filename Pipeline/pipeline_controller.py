import json
from typing import Dict, Any
from text_processor import TextProcessor, PipelineFunction
from Tools.DeNovo.protein_generator import ProteinGenerator
from Tools.TDStructure.Prediction.structure_predictor import StructurePredictor
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.blast_searcher import BlastSearcher
from job_manager import Job

class PipelineController:
    def __init__(self, conversation_memory, job_manager):
        # Instantiate all components
        self.text_processor = TextProcessor()
        self.protein_generator = ProteinGenerator()
        self.structure_predictor = StructurePredictor()
        self.foldseek_searcher = FoldseekSearcher()
        self.evaluator = StructureEvaluator()
        self.blast_searcher = BlastSearcher()
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
            jobs.append(job.to_dict())
        
        # Generate response message
        message = "I understand your request. Here are the tasks I can help you with:"
        for job in jobs:
            message += f"\n- {job['title']}"
        
        self.conversation_memory.add_message(session_id, "bot", message)
        return {"success": True, "message": message, "jobs": jobs}

    def execute_job(self, job: Job) -> Dict[str, Any]:
        name = job.function_name
        params = job.parameters
        result = {}
        
        if name == PipelineFunction.GENERATE_PROTEIN.value:
            result = self.protein_generator.generate(params.get("prompt", ""))
        elif name == PipelineFunction.PREDICT_STRUCTURE.value:
            prediction = self.structure_predictor.predict_structure(params.get("sequence", ""))
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
                    result = self.foldseek_searcher.wait_for_results(fold_result["ticket_id"])
        elif name == PipelineFunction.EVALUATE_STRUCTURE.value:
            structure = params.get("structure", "")
            if structure:
                result = self.evaluator.evaluate_3d(structure)
        elif name == PipelineFunction.EVALUATE_SEQUENCE.value:
            seq = params.get("sequence", "")
            result = self.evaluator.evaluate_sequence(seq)
        elif name == PipelineFunction.SEARCH_SIMILARITY.value:
            result = self.blast_searcher.search(params.get("sequence", ""))
            
        return result
        try:
            # Validate results dictionary before formatting
            if not isinstance(results, dict):
                raise ValueError("Results must be a dictionary")
            
            # Ensure all values in results are JSON serializable
            formatted_results = json.dumps({"success": True, "results": results}, indent=2)
            parsed_results = json.loads(formatted_results)
            
            self.conversation_memory.add_message(session_id, "bot", "Pipeline executed successfully.")
            return parsed_results
        except (TypeError, ValueError, json.JSONDecodeError) as e:
            error_msg = f"Error formatting pipeline results: {str(e)}"
            self.conversation_memory.add_message(session_id, "bot", error_msg)
            return {"success": False, "error": error_msg}

    def _generate_job_description(self, func: Dict[str, Any]) -> str:
        params = func["parameters"]
        if func["name"] == PipelineFunction.PREDICT_STRUCTURE.value:
            sequence = params.get("sequence", "")
            seq_length = len(sequence)
            return f"Sequence length: {seq_length} amino acids\nOutput: 3D structure prediction in PDB format\nAdditional analysis: Structure similarity search using FoldSeek"
        elif func["name"] == PipelineFunction.GENERATE_PROTEIN.value:
            prompt = params.get("prompt", "")
            return f"Target: {prompt}"
        elif func["name"] == PipelineFunction.SEARCH_STRUCTURE.value:
            return f"Search for similar structures in the database"
        elif func["name"] == PipelineFunction.EVALUATE_STRUCTURE.value:
            return f"Evaluate the 3D structure quality and properties"
        elif func["name"] == PipelineFunction.EVALUATE_SEQUENCE.value:
            return f"Analyze sequence properties and characteristics"
        elif func["name"] == PipelineFunction.SEARCH_SIMILARITY.value:
            return f"Search for similar sequences in the database"
        return "Execute the requested operation"
        #         messages.append(f"  • Output: Novel protein sequence optimized for the specified function")
        #         messages.append(f"  • Validation: Sequence properties and stability assessment")
        #     elif func["name"] == PipelineFunction.EVALUATE_SEQUENCE.value:
        #         sequence = params.get("sequence", "")
        #         messages.append(f"- {desc}")
        #         messages.append(f"  • Analysis of: Physicochemical properties, stability, and potential functionality")
        #         messages.append(f"  • Sequence length: {len(sequence)} amino acids")
        #     elif func["name"] == PipelineFunction.SEARCH_SIMILARITY.value:
        #         sequence = params.get("sequence", "")
        #         messages.append(f"- {desc}")
        #         messages.append(f"  • BLAST search for similar sequences in protein databases")
        #         messages.append(f"  • Sequence length: {len(sequence)} amino acids")
        # messages.append("\nDo you want to proceed? (yes/no)")
        # return "\n".join(messages)
