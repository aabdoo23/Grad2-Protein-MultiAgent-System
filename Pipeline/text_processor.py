from typing import Dict, Any, List, Optional
from enum import Enum
from groq import Groq
import json
from StructurePrediction.predict_3d_structure import StructurePredictor

class PipelineFunction(Enum):
    GENERATE_PROTEIN = "generate_protein"
    PREDICT_STRUCTURE = "predict_structure"
    EVALUATE_SEQUENCE = "evaluate_sequence"
    SEARCH_SIMILARITY = "search_similarity"

class TextProcessor:
    def __init__(self, api_key: str):
        """Initialize the text processor with Groq API key."""
        self.api_key = api_key
        self.client = Groq(api_key=api_key)
        self.structure_predictor = StructurePredictor()

    def process_input(self, text: str) -> Dict[str, Any]:
        """Process natural language input and structure it for the protein pipeline.

        Args:
            text (str): Natural language input describing the desired protein operation

        Returns:
            Dict[str, Any]: Structured output containing:
                - function: PipelineFunction to execute
                - parameters: Dictionary of parameters for the function
                - confidence: Confidence score of the interpretation
        """
        # Construct the prompt for the LLM
        system_prompt = """
You are a protein engineering assistant that interprets natural language requests into structured commands.
Your task is to parse the input and return a JSON object with exactly this structure:
{
    "function": "predict_structure",
    "parameters": {
        "sequence": "<protein sequence>"
    }
}

Rules:
1. For structure prediction requests, extract the protein sequence and set it as the sequence parameter
2. The function must be one of: "generate_protein", "predict_structure", "evaluate_sequence", "search_similarity"
3. Return ONLY the JSON object, no other text
4. Ensure the JSON is properly formatted with double quotes
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

            # Extract and parse the structured output from the LLM response
            structured_output = json.loads(response.choices[0].message.content)
            
            if not self.validate_output(structured_output):
                raise ValueError("Invalid output format from LLM")
            
            # Handle structure prediction if requested
            if structured_output['function'] == PipelineFunction.PREDICT_STRUCTURE.value:
                if 'sequence' in structured_output['parameters']:
                    prediction_result = self.structure_predictor.predict_structure(
                        structured_output['parameters']['sequence']
                    )
                    structured_output['prediction_result'] = prediction_result
                else:
                    raise ValueError("Missing sequence parameter for structure prediction")
            
            return structured_output

        except Exception as e:
            raise Exception(f"Error processing text input: {str(e)}")

    def validate_output(self, structured_output: Dict[str, Any]) -> bool:
        """Validate the structured output to ensure it contains required fields.

        Args:
            structured_output (Dict[str, Any]): The structured output to validate

        Returns:
            bool: True if valid, False otherwise
        """
        required_fields = ["function", "parameters"]
        return all(field in structured_output for field in required_fields)