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

Return a JSON object with two fields:
1. "explanation": A natural language explanation of what will be done
2. "functions": An array of functions to be executed in sequence

Valid function names and their purposes:
- generate_protein: Generate a new protein sequence
- predict_structure: Predict 3D structure of a protein sequence
- evaluate_sequence: Analyze properties of a protein sequence
- search_similarity: Search for similar protein sequences using BLAST
- search_structure: Search for similar protein structures using FoldSeek
- evaluate_structure: Evaluate quality of a protein structure

Example response format:
{
    "explanation": "I'll help you generate a protein sequence with high binding affinity, predict its 3D structure, and search for similar structures in the database.",
    "functions": [
        {
            "name": "generate_protein",
            "parameters": {
                "prompt": "Generate a protein sequence with high binding affinity"
            }
        },
        {
            "name": "predict_structure",
            "parameters": {}
        },
        {
            "name": "search_structure",
            "parameters": {}
        }
    ]
}

Rules:
1. For chained operations, only include required parameters in the first function
2. Subsequent functions in the chain will automatically receive their parameters from previous functions
3. Extract any protein sequence from the input text
4. Only include generate_protein if explicitly requested
5. Only include predict_structure if structure prediction is explicitly requested
6. Only include evaluate_sequence if sequence evaluation is explicitly requested
7. Only include search_structure if FoldSeek search is explicitly requested
8. Only include evaluate_structure if structure evaluation is explicitly requested
9. When generating proteins, include specific requirements in the prompt
10. Do not automatically add additional functions - only include what is explicitly requested
11. For predict_structure, if it follows generate_protein, do not include sequence parameter
12. For search_structure, if it follows predict_structure, do not include pdb_file parameter
13. IMPORTANT: Use EXACTLY the function names listed above - do not use variations like 'blast_search'
14. The explanation should be clear, concise, and explain what each function will do
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
                
                # Only validate sequence parameter for the first function in a chain
                first_func = parsed["functions"][0] if parsed["functions"] else None
                if first_func and first_func["name"] in [
                    PipelineFunction.PREDICT_STRUCTURE.value,
                    PipelineFunction.EVALUATE_SEQUENCE.value,
                    PipelineFunction.SEARCH_SIMILARITY.value
                ]:
                    if "sequence" not in first_func["parameters"] or not first_func["parameters"]["sequence"]:
                        return {"success": False, "error": f"Missing sequence parameter for {first_func['name']}"}
                
                return {"success": True, "explanation": parsed["explanation"], "functions": parsed["functions"]}
            except json.JSONDecodeError as je:
                return {"success": False, "error": f"JSON parsing error: {str(je)}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def validate(self, data: Dict[str, Any]) -> bool:
        if "explanation" not in data or not isinstance(data["explanation"], str):
            return False
        if "functions" not in data or not isinstance(data["functions"], list):
            return False
        valid = {f.value for f in PipelineFunction}
        for func in data["functions"]:
            if not isinstance(func, dict) or "name" not in func or "parameters" not in func:
                return False
            if func["name"] not in valid:
                return False
        return True
