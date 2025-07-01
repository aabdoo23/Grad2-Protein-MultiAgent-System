"""
Pipeline and job management module for the Protein Pipeline API.
Handles chat interactions, job execution, and pipeline management.
"""

from flask import Blueprint, request, jsonify, session
import threading
import uuid

# Create blueprint for pipeline routes
pipeline_bp = Blueprint('pipeline', __name__)

# Global variables to be injected by app factory
controller = None
job_manager = None
memory = None
app_logger = None

def init_pipeline_module(pipeline_controller, job_mgr, conversation_memory, logger):
    """Initialize the pipeline module with dependencies."""
    global controller, job_manager, memory, app_logger
    controller = pipeline_controller
    job_manager = job_mgr
    memory = conversation_memory
    app_logger = logger

def execute_job_in_background(job_id):
    """Execute a job in a background thread."""
    if not job_manager or not controller:
        return
        
    job = job_manager.get_job(job_id)
    if not job:
        return
        
    try:
        from util.flow.job_manager import JobStatus
        result = controller.execute_job(job)
        job_manager.update_job_status(job_id, JobStatus.COMPLETED, result=result)
    except Exception as e:
        from util.flow.job_manager import JobStatus
        job_manager.update_job_status(job_id, JobStatus.FAILED, error=str(e))

@pipeline_bp.before_request
def setup_session():
    """Initialize a session if it doesn't exist."""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        if memory:
            memory.init_session(session['session_id'])

@pipeline_bp.route('/chat', methods=['POST'])
def chat():
    """Process chat messages and interactions."""
    if not controller:
        return jsonify({'success': False, 'error': 'Pipeline service unavailable'}), 503
        
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
    user_message = data.get('message')
    if not user_message:
        return jsonify({'success': False, 'error': 'Message is required'}), 400
        
    session_id = session['session_id']
    
    # Process user input and get a confirmation message
    result = controller.process_input(session_id, user_message)
    return jsonify(result)

@pipeline_bp.route('/confirm-job', methods=['POST'])
def confirm_job():
    """Confirm and start job execution."""
    if not job_manager or not controller:
        return jsonify({'success': False, 'error': 'Pipeline service unavailable'}), 503
        
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
    job_id = data.get('job_id')
    job_data = data.get('job_data')
    
    if not job_id:
        return jsonify({"success": False, "message": "Job ID is required."})
    
    # Check if job exists
    job = job_manager.get_job(job_id)
    
    # If job doesn't exist but we have job_data, create it
    if not job and job_data:
        # Map the specialized block types to their backend function names
        function_mapping = {
            'generate_protein': 'generate_protein',
            'openfold_predict': 'predict_structure',
            'alphafold2_predict': 'predict_structure',
            'esmfold_predict': 'predict_structure',
            'colabfold_search': 'search_similarity',
            'ncbi_blast_search': 'search_similarity',
            'local_blast_search': 'search_similarity',
            'blast_db_builder': 'build_database'
        }
        
        # Get the base function name from the mapping, or use the original if not found
        function_name = function_mapping.get(job_data.get('function_name'), job_data.get('function_name'))
        
        # Create a new job from the provided data
        job = job_manager.create_job(
            job_id=job_id,
            function_name=function_name,
            parameters={
                **job_data.get('parameters', {}),
                # Add the specific model/type as a parameter
                'model_type': job_data.get('function_name')
            },
            description=job_data.get('description', 'Sandbox job')
        )
    
    # Still no job? Return error
    if not job:
        return jsonify({"success": False, "message": "Job not found."})
    
    # Update job parameters if job_data is provided
    if job_data and 'parameters' in job_data:
        # Update job parameters with the ones from the frontend
        job.parameters.update(job_data['parameters'])
        # Ensure model_type is set for specialized blocks
        if job_data.get('function_name') in ['openfold_predict', 'alphafold2_predict', 'esmfold_predict', 
                                           'colabfold_search', 'ncbi_blast_search', 'local_blast_search',
                                           'blast_db_builder']:
            job.parameters['model_type'] = job_data.get('function_name')
    
    # For sandbox jobs, store the block_id if provided
    if job_data and 'block_id' in job_data:
        job.block_id = job_data['block_id']
    
    # Queue the job
    from util.flow.job_manager import JobStatus
    job_manager.queue_job(job_id)
    job_manager.update_job_status(job_id, JobStatus.RUNNING)
    
    # Start job execution in a background thread
    job_thread = threading.Thread(target=execute_job_in_background, args=(job_id,))
    job_thread.daemon = True  # Thread will exit when the main program exits
    job_thread.start()
    
    # Return immediately after the job is queued and the thread is started
    return jsonify({"success": True, "job": job.to_dict()})

@pipeline_bp.route('/job-status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get the status of a specific job."""
    if not job_manager:
        return jsonify({'success': False, 'error': 'Pipeline service unavailable'}), 503
        
    job = job_manager.get_job(job_id)
    if not job:
        return jsonify({"success": False, "message": "Job not found."}), 404
    return jsonify(job.to_dict())

@pipeline_bp.route('/jobs', methods=['GET'])
def get_jobs():
    """Get all jobs."""
    if not job_manager:
        return jsonify({'success': False, 'error': 'Pipeline service unavailable'}), 503
        
    return jsonify({
        "success": True,
        "jobs": job_manager.get_all_jobs()
    })

@pipeline_bp.route('/read-fasta-file', methods=['POST'])
def read_fasta_file():
    """Read and parse a FASTA file."""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        file_path = data.get('file_path')
        if not file_path:
            return jsonify({"success": False, "message": "File path is required."}), 400

        # Read and parse the FASTA file
        sequences = []
        current_sequence = []
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('>'):
                    if current_sequence:
                        sequences.append(''.join(current_sequence))
                        current_sequence = []
                elif line:
                    current_sequence.append(line)
            
            # Add the last sequence if exists
            if current_sequence:
                sequences.append(''.join(current_sequence))

        return jsonify({
            "success": True,
            "sequences": sequences
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
