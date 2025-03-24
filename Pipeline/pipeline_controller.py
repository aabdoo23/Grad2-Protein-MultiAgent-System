import json
from typing import Dict, Any
from text_processor import TextProcessor, PipelineFunction
from Tools.DeNovo.protein_generator import ProteinGenerator
from Tools.TDStructure.Prediction.structure_predictor import StructurePredictor
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.blast_searcher import BlastSearcher

class PipelineController:
    def __init__(self, conversation_memory):
        # Instantiate all components
        self.text_processor = TextProcessor()
        self.protein_generator = ProteinGenerator()
        self.structure_predictor = StructurePredictor()
        self.foldseek_searcher = FoldseekSearcher()
        self.evaluator = StructureEvaluator()
        self.blast_searcher = BlastSearcher()
        self.conversation_memory = conversation_memory
        self.selected_functions = []

    def process_input(self, session_id: str, text: str) -> Dict[str, Any]:
        # Retrieve conversation history if needed
        history = self.conversation_memory.get_history(session_id)
        self.conversation_memory.add_message(session_id, "user", text)
        print("history", history)
        parsed = self.text_processor.process_input(text)
        print("parsed", parsed)
        if not parsed.get("success"):
            return {"success": False, "message": parsed.get("error")}
        self.selected_functions = parsed["functions"]
        confirmation = self._generate_confirmation(self.selected_functions)
        self.conversation_memory.add_message(session_id, "bot", confirmation)
        return {"success": True, "status": "awaiting_confirmation", "message": confirmation, "actions": self.selected_functions}

    def execute_pipeline(self, session_id: str) -> Dict[str, Any]:
        results = {}
        for func in self.selected_functions:
            name = func["name"]
            params = func["parameters"]
            if name == PipelineFunction.GENERATE_PROTEIN.value:
                results["generated_protein"] = self.protein_generator.generate(params.get("prompt", ""))
            elif name == PipelineFunction.PREDICT_STRUCTURE.value:
                prediction = self.structure_predictor.predict_structure(params.get("sequence", ""))
                # Format structure prediction results to only include file path and metrics
                if prediction.get("success"):
                    results["structure_prediction"] = {
                        "success": True,
                        "pdb_file": prediction["pdb_file"],
                        "metrics": prediction["metrics"]
                    }
                else:
                    results["structure_prediction"] = {"success": False, "error": prediction.get("error")}
            elif name == PipelineFunction.SEARCH_STRUCTURE.value:
                pdb_file = params.get("pdb_file", "")
                if pdb_file:
                    fold_result = self.foldseek_searcher.submit_search(pdb_file)
                    if fold_result.get("success"):
                        results["foldseek"] = self.foldseek_searcher.wait_for_results(fold_result["ticket_id"])
            elif name == PipelineFunction.EVALUATE_STRUCTURE.value:
                structure = params.get("structure", "")
                if structure:
                    results["structure_metrics"] = self.evaluator.evaluate_3d(structure)
            elif name == PipelineFunction.EVALUATE_SEQUENCE.value:
                seq = params.get("sequence", "")
                results["sequence_evaluation"] = self.evaluator.evaluate_sequence(seq)
            elif name == PipelineFunction.SEARCH_SIMILARITY.value:
                results["blast_search"] = self.blast_searcher.search(params.get("sequence", ""))
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

    def _generate_confirmation(self, functions):
        messages = ["The following actions will be executed:"]
        for func in functions:
            desc = PipelineFunction.get_description(func["name"])
            params = func["parameters"]
            if func["name"] == PipelineFunction.PREDICT_STRUCTURE.value:
                sequence = params.get("sequence", "")
                seq_length = len(sequence)
                messages.append(f"- {desc}")
                messages.append(f"  • Sequence length: {seq_length} amino acids")
                messages.append(f"  • Output: 3D structure prediction in PDB format")
                messages.append(f"  • Additional analysis: Structure similarity search using FoldSeek")
            elif func["name"] == PipelineFunction.GENERATE_PROTEIN.value:
                prompt = params.get("prompt", "")
                messages.append(f"- {desc}")
                messages.append(f"  • Target: {prompt}")
                messages.append(f"  • Output: Novel protein sequence optimized for the specified function")
                messages.append(f"  • Validation: Sequence properties and stability assessment")
            elif func["name"] == PipelineFunction.EVALUATE_SEQUENCE.value:
                sequence = params.get("sequence", "")
                messages.append(f"- {desc}")
                messages.append(f"  • Analysis of: Physicochemical properties, stability, and potential functionality")
                messages.append(f"  • Sequence length: {len(sequence)} amino acids")
            elif func["name"] == PipelineFunction.SEARCH_SIMILARITY.value:
                sequence = params.get("sequence", "")
                messages.append(f"- {desc}")
                messages.append(f"  • BLAST search for similar sequences in protein databases")
                messages.append(f"  • Sequence length: {len(sequence)} amino acids")
        messages.append("\nDo you want to proceed? (yes/no)")
        return "\n".join(messages)
