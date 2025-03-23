import json
from enum import Enum
from typing import Dict, Any, List
from groq import Groq  # Assuming this is your LLM client

class PipelineFunction(Enum):
    GENERATE_PROTEIN = "generate_protein"
    PREDICT_STRUCTURE = "predict_structure"
    EVALUATE_SEQUENCE = "evaluate_sequence"
    SEARCH_SIMILARITY = "search_similarity"

    @classmethod
    def get_description(cls, function: str) -> str:
        descriptions = {
            cls.GENERATE_PROTEIN.value: "Generate a protein sequence with specific properties",
            cls.PREDICT_STRUCTURE.value: "Predict the 3D structure of a protein sequence",
            cls.EVALUATE_SEQUENCE.value: "Evaluate properties of a protein sequence",
            cls.SEARCH_SIMILARITY.value: "Search for similar protein structures"
        }
        return descriptions.get(function, "Unknown function")

class TextProcessor:
    def __init__(self, api_key: str):
        self.client = Groq(api_key=api_key)

    def process_input(self, text: str) -> Dict[str, Any]:
        system_prompt = """
You are a protein engineering assistant that interprets natural language requests into structured commands.
Return a JSON object like:
{
    "functions": [
        {
            "name": "predict_structure",
            "parameters": {
                "sequence": "<protein sequence>"
            }
        }
    ]
}
"""
        try:
            response = self.client.chat.completions.create(
                model="gemma2-9b-it",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                temperature=0.1,
                max_tokens=500
            )
            parsed = json.loads(response.choices[0].message.content)
            if self.validate(parsed):
                return {"success": True, "functions": parsed["functions"]}
            return {"success": False, "error": "Invalid output format from LLM"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def validate(self, data: Dict[str, Any]) -> bool:
        if "functions" not in data or not isinstance(data["functions"], list):
            return False
        valid = {f.value for f in PipelineFunction}
        for func in data["functions"]:
            if not isinstance(func, dict) or "name" not in func or "parameters" not in func:
                return False
            if func["name"] not in valid:
                return False
        return True
