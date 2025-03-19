from typing import Dict, Any, List, Optional
from enum import Enum
from groq import Groq

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
        You are a protein engineering assistant that interprets natural language requests 
        into structured commands. You should identify which of these functions to call:
        1. generate_protein: For creating new protein sequences
        2. predict_structure: For 3D structure prediction
        3. evaluate_sequence: For evaluating generated sequences
        4. search_similarity: For sequence similarity search using FoldSeek

        Output should be in JSON format with 'function' and 'parameters' fields.
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

            # Extract the structured output from the LLM response
            structured_output = response.choices[0].message.content
            # TODO: Parse the JSON response and validate the function and parameters
            
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