import json
from enum import Enum
from typing import Dict, Any
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

class PipelineFunction(Enum):
    GENERATE_PROTEIN = "generate_protein"
    PREDICT_STRUCTURE = "predict_structure"
    SEARCH_STRUCTURE = "search_structure"
    EVALUATE_STRUCTURE = "evaluate_structure"
    SEARCH_SIMILARITY = "search_similarity"
    PREDICT_BINDING_SITES = "predict_binding_sites"
    PERFORM_DOCKING = "perform_docking"
    BUILD_PHYLOGENETIC_TREE = "build_phylogenetic_tree"
    ANALYZE_RAMACHANDRAN = "analyze_ramachandran"

    @staticmethod
    def get_description(function_name):
        descriptions = {
            PipelineFunction.GENERATE_PROTEIN.value: "Generate a protein sequence",
            PipelineFunction.PREDICT_STRUCTURE.value: "Predict protein structure",
            PipelineFunction.SEARCH_STRUCTURE.value: "Search for similar structures",
            PipelineFunction.EVALUATE_STRUCTURE.value: "Compare two protein structures",
            PipelineFunction.SEARCH_SIMILARITY.value: "Search for similar sequences",
            PipelineFunction.PREDICT_BINDING_SITES.value: "Predict protein binding sites",
            PipelineFunction.PERFORM_DOCKING.value: "Perform molecular docking",
            PipelineFunction.BUILD_PHYLOGENETIC_TREE.value: "Build phylogenetic tree from MSA",
            PipelineFunction.ANALYZE_RAMACHANDRAN.value: "Generate Ramachandran plot analysis"
        }
        return descriptions.get(function_name, "Unknown function")

class TextProcessor:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def process_input(self, text: str) -> Dict[str, Any]:
        system_prompt = """
You are a protein engineering assistant that interprets natural language requests into structured commands for protein design and analysis workflows.
Analyze the input text carefully to identify:
1. Any provided protein sequences
2. Specific analysis requests (structure prediction, similarity search, evaluation)
3. Whether protein generation is explicitly requested
4. Specific requirements for generated proteins (e.g., binding affinity, stability, etc.)
5. Preferred structure prediction model (ESM, AlphaFold2, or OpenFold)
6. Preferred search type for sequence similarity (NCBI BLAST or ColabFold MSA)

Return a JSON object with two fields:
1. "explanation": A natural language explanation of what will be done
2. "functions": An array of functions to be executed in sequence

Valid function names and their purposes:
- generate_protein: Generate a new protein sequence
- predict_structure: Predict 3D structure of a protein sequence
- evaluate_structure: Compare two protein structures using USAlign
- predict_binding_sites: Predict protein binding sites using P2Rank
- search_similarity: Search for similar protein sequences using BLAST or ColabFold MSA
- search_structure: Search for similar protein structures using FoldSeek
- perform_docking: Perform molecular docking between protein and ligand
- build_phylogenetic_tree: Build phylogenetic tree from multiple sequence alignment results
- analyze_ramachandran: Generate Ramachandran plot analysis

IMPORTANT: Every function in the chain MUST include a "parameters" field, even if it's an empty object {}.

For predict_structure, include a "model" parameter with one of these values ONLY IF the model is explicitly specified in the user's request:
- "esm": Use ESM model
- "alphafold2": Use AlphaFold2 model
- "openfold": Use OpenFold model

For search_similarity, include a "search_type" parameter with one of these values ONLY IF the search type is explicitly specified in the user's request:
- "ncbi": Use NCBI BLAST search
- "colabfold": Use ColabFold MSA search
- "local": Use local BLAST search with custom database

For local BLAST search, you can also include these optional parameters:
- "fasta_file": Path to a custom FASTA file to use as database
- "db_name": Name for the custom database
- "interpro_ids": List of InterPro IDs to create database from

For predict_binding_sites, you can include these optional parameters:
- "output_dir": Custom output directory for P2Rank results

For perform_docking, you can include these parameters:
- "center_x", "center_y", "center_z": Center coordinates for docking box
- "size_x", "size_y", "size_z": Size of docking box (default: 20,20,20)
- "exhaustiveness": Search exhaustiveness (default: 16)
- "num_modes": Number of binding modes (default: 10)
- "auto_center": Use P2Rank results for automatic center determination (default: false)

For build_phylogenetic_tree, you can include these optional parameters:
- "method": Tree building method ("neighbor_joining", "upgma", "parsimony", default: "neighbor_joining")
- "distance_model": Distance model for tree construction ("identity", "blosum62", default: "identity")
- "max_sequences": Maximum number of sequences to include (default: 50)
- "min_sequence_length": Minimum sequence length to include (default: 50)
- "remove_gaps": Remove gaps from sequences before analysis (default: true)

For analyze_ramachandran, you can include these optional parameters:
- "output_dir": Custom output directory for Ramachandran plot and data files

For evaluate_structure, you MUST include these parameters:
- "pdb_file1": Path to the first PDB file for comparison
- "pdb_file2": Path to the second PDB file for comparison

Example response format:
{
    "explanation": "I'll help you generate a protein sequence with high binding affinity, predict its 3D structure using AlphaFold2, and search for similar sequences using ColabFold MSA.",
    "functions": [
        {
            "name": "generate_protein",
            "parameters": {
                "prompt": "Generate a protein sequence with high binding affinity"
            }
        },
        {
            "name": "predict_structure",
            "parameters": {
                "model": "alphafold2"
            }
        },
        {
            "name": "search_similarity",
            "parameters": {
                "search_type": "colabfold"
            }
        }
    ]
}

Rules:
1. For chained operations, only include required parameters in the first function
2. Subsequent functions in the chain will automatically receive their parameters from previous functions
3. Extract any protein sequence from the input text
4. Every function MUST include a "parameters" field, even if empty
5. Only include generate_protein if explicitly requested
6. Only include predict_structure if structure prediction is explicitly requested
7. Only include search_structure if FoldSeek search is explicitly requested
8. When generating proteins, include specific requirements in the prompt
9. Do not automatically add additional functions - only include what is explicitly requested
10. For predict_structure, if it follows generate_protein, do not include sequence parameter
11. For search_structure, if it follows predict_structure, do not include pdb_file parameter
12. For predict_binding_sites, if it follows predict_structure, do not include pdb_file parameter
13. For perform_docking, if it follows predict_binding_sites, use auto_center parameter
14. IMPORTANT: Use EXACTLY the function names listed above - do not use variations like 'blast_search'
15. The explanation should be clear, concise, and explain what each function will do
16. For predict_structure, ONLY include the model parameter if EXPLICITLY mentioned in the request
17. For search_similarity, ONLY include the search_type parameter if EXPLICITLY mentioned in the request
18. If a model or search type is not explicitly specified, DO NOT include the corresponding parameter
19. For evaluate_structure, both pdb_file1 and pdb_file2 parameters are required and must specify the paths to the two PDB files to compare
20. Only include evaluate_structure if structure comparison is explicitly requested
"""
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                temperature=0.1,
                max_tokens=500            )
            
            # Check if response and content exist
            if not response or not response.choices or not response.choices[0].message.content:
                return {"success": False, "error": "Empty or invalid response from LLM"}
                
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
                
                # Process each function to ensure model is only included when explicitly specified
                for func in parsed["functions"]:
                    if func["name"] == PipelineFunction.PREDICT_STRUCTURE.value:
                        # If model is empty string, remove it
                        if "model" in func["parameters"] and not func["parameters"]["model"]:
                            del func["parameters"]["model"]
                
                # Only validate sequence parameter for the first function in a chain
                first_func = parsed["functions"][0] if parsed["functions"] else None
                if first_func and first_func["name"] in [
                    PipelineFunction.PREDICT_STRUCTURE.value,
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
            print("Missing or invalid explanation field")
            return False
        if "functions" not in data or not isinstance(data["functions"], list):
            print("Missing or invalid functions field")
            return False
        valid = {f.value for f in PipelineFunction}
        for func in data["functions"]:
            if not isinstance(func, dict):
                print("Function must be a dictionary")
                return False
            if "name" not in func:
                print("Missing name field in function")
                return False
            if "parameters" not in func:
                print("Missing parameters field in function")
                return False
            if func["name"] not in valid:
                print(f"Invalid function name: {func['name']}")
                return False
            # Validate model parameter for predict_structure if it exists
            if func["name"] == PipelineFunction.PREDICT_STRUCTURE.value and "model" in func["parameters"]:
                model = func["parameters"]["model"]
                if model not in ["esm", "alphafold2", "openfold"]:
                    print("Invalid model parameter:", model)
                    return False
        return True
