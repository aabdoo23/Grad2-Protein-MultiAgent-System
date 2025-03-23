from typing import Dict, Any, List
from text_processor import TextProcessor, PipelineFunction
from Tools.DeNovo.protein_generator import ProteinGenerator
from Tools.TDStructure.Prediction.structure_predictor import StructurePredictor
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.blast_searcher import BlastSearcher

class PipelineController:
    def __init__(self, api_key: str):
        # Instantiate all components
        self.text_processor = TextProcessor(api_key)
        self.protein_generator = ProteinGenerator()
        self.structure_predictor = StructurePredictor()
        self.foldseek_searcher = FoldseekSearcher()
        self.evaluator = StructureEvaluator()
        self.blast_searcher = BlastSearcher()
        self.selected_functions = []  # Will hold parsed commands

    def process_input(self, text: str) -> Dict[str, Any]:
        parsed = self.text_processor.process_input(text)
        if not parsed.get("success"):
            return {"success": False, "message": parsed.get("error")}
        self.selected_functions = parsed["functions"]
        confirmation = self._generate_confirmation(self.selected_functions)
        return {"success": True, "status": "awaiting_confirmation", "message": confirmation, "actions": self.selected_functions}

    def execute_pipeline(self) -> Dict[str, Any]:
        results = {}
        for func in self.selected_functions:
            name = func["name"]
            params = func["parameters"]
            if name == PipelineFunction.GENERATE_PROTEIN.value:
                results["generated_protein"] = self.protein_generator.generate(params.get("prompt", ""))
            elif name == PipelineFunction.PREDICT_STRUCTURE.value:
                prediction = self.structure_predictor.predict_structure(params.get("sequence", ""))
                results["structure_prediction"] = prediction
                if prediction.get("success"):
                    # Optionally run FoldSeek search if a PDB file is available
                    fold_result = self.foldseek_searcher.submit_search(prediction["pdb_file"])
                    if fold_result.get("success"):
                        results["foldseek"] = self.foldseek_searcher.wait_for_results(fold_result["ticket_id"])
            elif name == PipelineFunction.EVALUATE_SEQUENCE.value:
                seq = params.get("sequence", "")
                results["sequence_evaluation"] = self.evaluator.evaluate_sequence(seq)
            elif name == PipelineFunction.SEARCH_SIMILARITY.value:
                # Example: Using BLAST search as the similarity search
                results["blast_search"] = self.blast_searcher.search(params.get("sequence", ""))
        return {"success": True, "results": results}

    def _generate_confirmation(self, functions: List[Dict[str, Any]]) -> str:
        messages = ["The following actions will be executed:"]
        for func in functions:
            desc = PipelineFunction.get_description(func["name"])
            messages.append(f"- {desc}")
        messages.append("Do you want to proceed? (yes/no)")
        return "\n".join(messages)
