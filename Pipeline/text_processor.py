import json
from enum import Enum
from typing import Dict, Any, List
from groq import Groq

class PipelineFunction(Enum):
    GENERATE_PROTEIN = "generate_protein"
    PREDICT_STRUCTURE = "predict_structure"
    EVALUATE_SEQUENCE = "evaluate_sequence"
    SEARCH_SIMILARITY = "search_similarity"
    SEARCH_STRUCTURE = "search_structure"
    EVALUATE_STRUCTURE = "evaluate_structure"

    @classmethod
    def get_description(cls, function: str) -> str:
        descriptions = {
            cls.GENERATE_PROTEIN.value: "Generate a protein sequence with specific properties",
            cls.PREDICT_STRUCTURE.value: "Predict the 3D structure of a protein sequence",
            cls.EVALUATE_SEQUENCE.value: "Evaluate properties of a protein sequence",
            cls.SEARCH_SIMILARITY.value: "Search for similar protein sequences",
            cls.SEARCH_STRUCTURE.value: "Search for similar protein structures using FoldSeek",
            cls.EVALUATE_STRUCTURE.value: "Evaluate the quality and properties of a predicted 3D structure"
        }
        return descriptions.get(function, "Unknown function")

class TextProcessor:
    def __init__(self):
        self.client = Groq(api_key="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")

    def process_input(self, text: str) -> Dict[str, Any]:
        system_prompt = """
You are a protein engineering assistant that interprets natural language requests into structured commands for protein design and analysis workflows.
Analyze the input text carefully to identify:
1. Any provided protein sequences
2. Specific analysis requests (structure prediction, similarity search, evaluation)
3. Whether protein generation is explicitly requested
4. Specific requirements for generated proteins (e.g., binding affinity, stability, etc.)

Return a JSON object with an array of functions to be executed in sequence. Only include functions that are explicitly requested in the input text.

Example response format:
{
    "functions": [
        {
            "name": "generate_protein",
            "parameters": {
                "prompt": "Generate a protein sequence with high binding affinity to IL-2 receptors, focusing on key binding motifs and structural stability"
            }
        }
    ]
}

Rules:
1. Extract any protein sequence from the input text
2. Only include generate_protein if explicitly requested
3. Only include predict_structure if structure prediction is explicitly requested
4. Only include evaluate_sequence if sequence evaluation is explicitly requested
5. Only include search_structure if FoldSeek search is explicitly requested
6. Only include evaluate_structure if structure evaluation is explicitly requested
7. When generating proteins, include specific requirements in the prompt
8. Do not automatically add additional functions - only include what is explicitly requested
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
            response_text = response.choices[0].message.content.strip()
            print("response",response_text)
            if not response_text:
                return {"success": False, "error": "Empty response from LLM"}
            
            # Clean and validate response text
            try:
                # Find the first { and last } to extract the JSON object
                first_brace = response_text.find('{')
                last_brace = response_text.rfind('}')
                
                if first_brace == -1 or last_brace == -1:
                    return {"success": False, "error": "Invalid JSON format: missing braces"}
                
                # Extract the JSON content and ensure it's balanced
                json_content = response_text[first_brace:last_brace + 1]
                brace_count = 0
                for char in json_content:
                    if char == '{': brace_count += 1
                    elif char == '}': brace_count -= 1
                    if brace_count < 0:
                        return {"success": False, "error": "Invalid JSON format: unbalanced braces"}
                
                if brace_count != 0:
                    return {"success": False, "error": "Invalid JSON format: unbalanced braces"}
                
                parsed = json.loads(json_content)
                if not self.validate(parsed):
                    return {"success": False, "error": "Invalid output format from LLM"}
                
                # Validate sequence lengths and parameters
                for func in parsed["functions"]:
                    if func["name"] in [PipelineFunction.PREDICT_STRUCTURE.value, 
                                      PipelineFunction.EVALUATE_SEQUENCE.value,
                                      PipelineFunction.SEARCH_SIMILARITY.value]:
                        if "sequence" not in func["parameters"] or not func["parameters"]["sequence"]:
                            return {"success": False, "error": f"Missing sequence parameter for {func['name']}"}
                
                has_sequence = any("sequence" in f["parameters"] for f in parsed["functions"])
                if has_sequence:
                    parsed["functions"] = [f for f in parsed["functions"]]
                
                return {"success": True, "functions": parsed["functions"]}
            except json.JSONDecodeError as je:
                return {"success": False, "error": f"JSON parsing error: {str(je)}"}
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
