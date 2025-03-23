# Protein Structure Prediction Pipeline

A comprehensive pipeline for protein structure prediction, sequence analysis, and similarity search using state-of-the-art tools and natural language processing.

## Features

- Natural language command processing
- Protein structure prediction using ESMAtlas
- Protein sequence generation
- Structure evaluation and analysis
- Similarity search using BLAST and FoldSeek
- Visualization of protein structures

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Pipeline
```

2. Set up a virtual environment:
```bash
# Windows
python -m venv venv

# Linux/macOS
python3 -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
.\venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

4. Install dependencies (make sure your virtual environment is activated):
```bash
pip install -r requirements.txt
```

5. Verify the installation:
   - You should see `(venv)` at the beginning of your command prompt
   - Check installed packages with `pip list`

To deactivate the virtual environment when you're done:
```bash
deactivate
```

3. Set up your API key:
- Obtain an API key from Groq (for natural language processing)
- Set the API key as an environment variable or provide it during initialization

## Usage

### Basic Usage

```python
from pipeline_controller import PipelineController

# Initialize the pipeline with your API key
pipeline = PipelineController(api_key="your-api-key")

# Process a natural language command
result = pipeline.process_input("Predict the structure of protein sequence ACDEFGHIKLMNPQRSTVWY")

# If the command is valid, execute the pipeline
if result["success"] and result["status"] == "awaiting_confirmation":
    pipeline_result = pipeline.execute_pipeline()
```

### Example Commands

The pipeline supports various natural language commands:

1. Structure Prediction:
```python
"Predict the structure of protein sequence ACDEFGHIKLMNPQRSTVWY"
```

2. Sequence Generation:
```python
"Generate a protein sequence that could bind to calcium ions"
```

3. Structure Evaluation:
```python
"Evaluate the stability of protein sequence ACDEFGHIKLMNPQRSTVWY"
```

4. Similarity Search:
```python
"Find similar proteins to sequence ACDEFGHIKLMNPQRSTVWY"
```

## Pipeline Components

### Text Processor
Processes natural language commands into structured pipeline functions using the Groq LLM API.

### Protein Generator
Generates protein sequences based on specified requirements or constraints.

### Structure Predictor
Predicts protein 3D structures using the ESMAtlas API and saves the results in PDB format.

### Structure Evaluator
Analyzes protein structures and provides metrics such as pLDDT scores, PTM scores, and RMSD.

### Similarity Searchers
- **BLAST**: Searches for similar protein sequences in databases
- **FoldSeek**: Searches for proteins with similar 3D structures

## Output Files

The pipeline generates various output files in the following directories:

- `Tools/TDStructure/Prediction/visualizations/`: Contains PDB files and visualization outputs
- Additional output directories for other components

## Troubleshooting

### Common Issues

1. API Connection Errors
   - Verify your API key is correct
   - Check your internet connection
   - Ensure the API endpoint is accessible

2. Invalid Sequences
   - Ensure protein sequences contain only valid amino acid residues (ACDEFGHIKLMNPQRSTVWY)
   - Check for any special characters or spaces in the sequence

3. File Permission Issues
   - Ensure write permissions for output directories
   - Check if visualization directories exist and are accessible

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.