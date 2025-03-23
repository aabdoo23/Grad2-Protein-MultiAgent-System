from pipeline_controller import PipelineController

def main():
    # Initialize the pipeline controller with API key
    controller = PipelineController('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')
    
    while True:
        # Get user input
        print("\nWhat would you like to do with the protein pipeline? (Type 'exit' to quit)")
        user_input = input("> ")
        
        if user_input.lower() == 'exit':
            break
        
        # Process user input and get initial pipeline plan
        result = controller.process_user_input(user_input)
        
        if not result['success']:
            print(f"\nError: {result['message']}")
            continue
        
        # Display the planned actions and get user confirmation
        print("\n" + result['message'])
        confirmation = input("\nConfirm (yes/no)? ").lower()
        
        if confirmation in ['y', 'yes']:
            # Execute the confirmed pipeline
            execution_result = controller.confirm_execution(True)
            
            if execution_result['success']:
                print("\n" + execution_result['message'])
                
                # Display results if available
                if 'results' in execution_result:
                    if 'structure_prediction' in execution_result['results']:
                        pred_result = execution_result['results']['structure_prediction']
                        if pred_result['success']:
                            print("\nStructure Quality Metrics:")
                            metrics = pred_result['metrics']
                            print(f"pLDDT Score: {metrics['plddt']:.2f}")
                            print(f"pTM Score: {metrics['ptm']:.2f}")
                            print(f"RMSD: {metrics['rmsd']:.2f}")
                            print(f"TM-score: {metrics['tm_score']:.2f}")
                            print(f"\nVisualization saved at: {pred_result['visualization_file']}")
            else:
                print(f"\nError during execution: {execution_result['message']}")
        else:
            # Cancel the pipeline execution
            controller.confirm_execution(False)
            print("\nOperation cancelled.")

if __name__ == "__main__":
    main()