from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from pipeline_controller import PipelineController
from Chatbot.ConversationMemory import ConversationMemory
from job_manager import JobManager, JobStatus
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.blast_searcher import BlastSearcher
import os

app = Flask(__name__)
CORS(app)
app.secret_key = "YOUR_SECRET_KEY"  # Needed for session management

# Configure static file serving
STATIC_PDB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'pdb_files')
os.makedirs(STATIC_PDB_DIR, exist_ok=True)

# Create global objects
memory = ConversationMemory()
job_manager = JobManager()
controller = PipelineController(conversation_memory=memory, job_manager=job_manager)
blast_searcher = BlastSearcher()

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
    if not job_id:
        return jsonify({"success": False, "message": "Job ID is required."})
    
    job = job_manager.get_job(job_id)
    if not job:
        return jsonify({"success": False, "message": "Job not found."})
    
    # Queue the job
    job_manager.queue_job(job_id)
    job_manager.update_job_status(job_id, JobStatus.RUNNING)
    
    # Execute the job
    try:
        result = controller.execute_job(job)
        job_manager.update_job_status(job_id, JobStatus.COMPLETED, result=result)
        return jsonify({"success": True, "job": job.to_dict()})
    except Exception as e:
        job_manager.update_job_status(job_id, JobStatus.FAILED, error=str(e))
        return jsonify({"success": False, "message": str(e)})

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
    """Check the status and get results of a BLAST search.
    
    Args:
        rid (str): The Request ID from BLAST
        
    Returns:
        Dict[str, Any]: Dictionary containing:
            - success: bool indicating if check was successful
            - status: Current status ('running', 'completed', 'failed')
            - results: Processed BLAST results if completed
            - error: Error message if unsuccessful
    """
    try:
        result = blast_searcher.check_results(rid)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "status": "failed",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    import uuid
    app.run(debug=True)
