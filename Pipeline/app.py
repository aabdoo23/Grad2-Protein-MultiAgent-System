from flask import Flask, request, jsonify, session, send_from_directory, send_file
from flask_cors import CORS
from pipeline_controller import PipelineController
from conversation_memory import ConversationMemory
from job_manager import JobManager, JobStatus
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.ncbi_blast_searcher import NCBI_BLAST_Searcher
from util.modules.download_handler import DownloadHandler
import os
import threading
import io
from datetime import datetime
import uuid

app = Flask(__name__)
# Configure CORS to allow credentials and specific headers
CORS(app, supports_credentials=True, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "https://grad2-protein-multi-agent-system.vercel.app", "https://protein-pipeline.vercel.app"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Disposition"]
    }
})
app.secret_key = "YOUR_SECRET_KEY"  # Needed for session management

# Configure static file serving
STATIC_PDB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'pdb_files')
os.makedirs(STATIC_PDB_DIR, exist_ok=True)

# Create global objects
memory = ConversationMemory()
job_manager = JobManager()
controller = PipelineController(conversation_memory=memory, job_manager=job_manager)
blast_searcher = NCBI_BLAST_Searcher()
download_handler = DownloadHandler()

# Function to execute a job in a background thread
def execute_job_in_background(job_id):
    job = job_manager.get_job(job_id)
    if not job:
        return
        
    try:
        result = controller.execute_job(job)
        job_manager.update_job_status(job_id, JobStatus.COMPLETED, result=result)
    except Exception as e:
        job_manager.update_job_status(job_id, JobStatus.FAILED, error=str(e))

@app.before_request
def setup_session():
    # Initialize a session if it doesn't exist
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        memory.init_session(session['session_id'])

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    session_id = session['session_id']
    
    # Process user input and get a confirmation message
    result = controller.process_input(session_id, user_message)
    return jsonify(result)

@app.route('/confirm-job', methods=['POST'])
def confirm_job():
    job_id = request.json.get('job_id')
    job_data = request.json.get('job_data')
    
    if not job_id:
        return jsonify({"success": False, "message": "Job ID is required."})
    
    # Check if job exists
    job = job_manager.get_job(job_id)
    
    # If job doesn't exist but we have job_data, create it
    if not job and job_data:
        # Map the specialized block types to their backend function names
        function_mapping = {
            'openfold_predict': 'predict_structure',
            'alphafold2_predict': 'predict_structure',
            'esmfold_predict': 'predict_structure',
            'colabfold_search': 'search_similarity',
            'ncbi_blast_search': 'search_similarity',
            'local_blast_search': 'search_similarity'
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
                                           'colabfold_search', 'ncbi_blast_search', 'local_blast_search']:
            job.parameters['model_type'] = job_data.get('function_name')
    
    # For sandbox jobs, store the block_id if provided
    if job_data and 'block_id' in job_data:
        job.block_id = job_data['block_id']
    
    # Queue the job
    job_manager.queue_job(job_id)
    job_manager.update_job_status(job_id, JobStatus.RUNNING)
    
    # Start job execution in a background thread
    job_thread = threading.Thread(target=execute_job_in_background, args=(job_id,))
    job_thread.daemon = True  # Thread will exit when the main program exits
    job_thread.start()
    
    # Return immediately after the job is queued and the thread is started
    return jsonify({"success": True, "job": job.to_dict()})

@app.route('/job-status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    job = job_manager.get_job(job_id)
    if not job:
        return jsonify({"success": False, "message": "Job not found."}), 404
    return jsonify(job.to_dict())

@app.route('/jobs', methods=['GET'])
def get_jobs():
    return jsonify({
        "success": True,
        "jobs": job_manager.get_all_jobs()
    })

@app.route('/pdb/<path:filename>')
def serve_pdb(filename):
    """Serve PDB files from the static directory"""
    # Extract just the filename without path for security
    safe_filename = os.path.basename(filename)
    if not os.path.exists(os.path.join(STATIC_PDB_DIR, safe_filename)):
        return jsonify({'error': 'PDB file not found'}), 404
    return send_from_directory(STATIC_PDB_DIR, safe_filename)

@app.route('/download-pdb', methods=['POST'])
def download_pdb():
    """Download a PDB file from either RCSB or AlphaFold database."""
    data = request.json
    target_id = data.get('target_id')
    database = data.get('database')
    
    if not target_id or not database:
        return jsonify({'success': False, 'error': 'Missing target_id or database'}), 400
    
    foldseek = FoldseekSearcher()
    result = foldseek.download_pdb(target_id, database)
    
    if result['success']:
        # Extract just the filename for the response
        filename = os.path.basename(result['pdb_file'])
        return jsonify({
            'success': True,
            'pdb_file': filename
        })
    else:
        return jsonify(result), 500

@app.route('/evaluate-structures', methods=['POST'])
def evaluate_structures():
    """Evaluate structural similarity between two PDB files using USalign."""
    data = request.json
    pdb1_path = data.get('pdb1_path')
    pdb2_path = data.get('pdb2_path')
    
    if not pdb1_path or not pdb2_path:
        return jsonify({'success': False, 'error': 'Missing PDB file paths'}), 400
    
    # Convert relative paths to absolute paths
    pdb1_abs = os.path.join(STATIC_PDB_DIR, os.path.basename(pdb1_path))
    pdb2_abs = os.path.join(STATIC_PDB_DIR, os.path.basename(pdb2_path))
    
    if not os.path.exists(pdb1_abs) or not os.path.exists(pdb2_abs):
        return jsonify({'success': False, 'error': 'One or both PDB files not found'}), 404
    
    evaluator = StructureEvaluator()
    result = evaluator.evaluate_with_usalign(pdb1_abs, pdb2_abs)
    
    return jsonify(result)

@app.route('/check-blast-results/<rid>', methods=['GET'])
def check_blast_results(rid):
    """Check the status and get results of a BLAST search."""
    try:
        result = blast_searcher.check_results(rid)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "status": "failed",
            "error": str(e)
        }), 500

@app.route('/download-sequence', methods=['POST'])
def download_sequence():
    """Download a sequence as a FASTA file."""
    data = request.json
    sequence = data.get('sequence')
    sequence_name = data.get('sequence_name', 'sequence')
    
    if not sequence:
        return jsonify({'success': False, 'error': 'No sequence provided'}), 400
    
    # Create FASTA content
    fasta_content = f">{sequence_name}\n{sequence}"
    
    # Create response with FASTA file
    response = io.BytesIO()
    response.write(fasta_content.encode())
    response.seek(0)
    
    filename = f"{sequence_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.fasta"
    return send_file(
        response,
        mimetype='text/plain',
        as_attachment=True,
        download_name=filename
    )

@app.route('/download-structure', methods=['POST'])
def download_structure():
    """Download a PDB structure file."""
    data = request.json
    pdb_file = data.get('pdb_file')
    
    if not pdb_file:
        return jsonify({'success': False, 'error': 'No PDB file provided'}), 400
    
    # Get the full path to the PDB file
    pdb_path = os.path.join(STATIC_PDB_DIR, os.path.basename(pdb_file))
    
    if not os.path.exists(pdb_path):
        return jsonify({'success': False, 'error': 'PDB file not found'}), 404
    
    return send_file(
        pdb_path,
        mimetype='chemical/x-pdb',
        as_attachment=True,
        download_name=os.path.basename(pdb_file)
    )

@app.route('/download-search-results', methods=['POST'])
def download_search_results():
    """Download search results as a zip file containing organized results and reports."""
    data = request.json
    results = data.get('results')
    search_type = data.get('search_type')
    download_settings = data.get('downloadSettings')
    
    if not results or not search_type:
        return jsonify({'success': False, 'error': 'Missing results or search type'}), 400
    
    # Create zip file using the download handler
    zip_buffer = download_handler.create_search_results_zip(results, search_type)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"search_results_{timestamp}.zip"
    
    # Send the zip file
    return download_handler.send_zip_file(zip_buffer, filename, download_settings)

@app.route('/download-multiple', methods=['POST'])
def download_multiple():
    """Download multiple items with improved organization and reporting."""
    payload = request.get_json(force=True)
    items = payload.get('items', [])
    download_settings = payload.get('downloadSettings')
    
    if not items:
        return jsonify({'success': False, 'error': 'No items provided'}), 400
    
    # Create zip file using the download handler
    zip_buffer = download_handler.create_multiple_items_zip(items)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"batch_{timestamp}.zip"
    
    # Send the zip file
    return download_handler.send_zip_file(zip_buffer, filename, download_settings)

if __name__ == '__main__':
    app.run(debug=True)
