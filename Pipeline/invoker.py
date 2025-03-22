from text_processor import TextProcessor
from StructurePrediction.predict_3d_structure import StructurePredictor

# Initialize the text processor
processor = TextProcessor('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')

# Process the text input for structure prediction
result = processor.process_input('Predict the structure of this protein sequence: PIAQIHILEGRSDEQKETLIREVSEAISRSLDAPLTSVRVIITEMAKGHFGIGGELASK')
print("\nText Processing Result:")
print(result)

# Check if prediction was successful
if 'prediction_result' in result and result['prediction_result']['success']:
    print("\nStructure Prediction Result:")
    print("Structure prediction completed successfully")
    
    # Display structure quality metrics
    print("\nStructure Quality Metrics:")
    metrics = result['prediction_result']['metrics']
    print(f"pLDDT Score: {metrics['plddt']:.2f}")
    print(f"pTM Score: {metrics['ptm']:.2f}")
    print(f"RMSD: {metrics['rmsd']:.2f}")
    print(f"TM-score: {metrics['tm_score']:.2f}")
    
    # Generate visualization
    structure_predictor = StructurePredictor()
    visualization_result = structure_predictor.visualize_structure(result['prediction_result']['structure'])
    if visualization_result['success']:
        print("\nVisualization generated and saved successfully")
        print(f"Visualization file saved at: {visualization_result['file_path']}")
    else:
        print("\nVisualization Error:")
        print(visualization_result['error'])
else:
    print("\nStructure Prediction Error:")
    print("Failed to predict structure through the pipeline")