from flask import Flask, request, jsonify, session, send_from_directory, send_file, Response
from flask_cors import CORS
from util.flow.pipeline_controller import PipelineController
from util.chatbot.conversation_memory import ConversationMemory
from util.flow.job_manager import JobManager, JobStatus
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.ncbi_blast_searcher import NCBI_BLAST_Searcher
from Tools.Search.BLAST.database_builder import BlastDatabaseBuilder
from util.modules.download_handler import DownloadHandler
import os
import threading
import io
import zipfile
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename

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
STATIC_PDB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
os.makedirs(STATIC_PDB_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    'structure': ['.pdb'],
    'molecule': ['.sdf', '.mol2'],
    'sequence': ['.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn']
}

def allowed_file(filename, output_type):
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS[output_type])

@app.route('/api/pdb-content', methods=['GET'])
def get_pdb_content():
    file_path_param = request.args.get('filePath')
    if not file_path_param:
        app.logger.warning("API call to /api/pdb-content missing filePath parameter.")
        return jsonify({"success": False, "error": "filePath parameter is missing"}), 400

    try:
        # Check if the file path is within our static directory
        static_abs_path = os.path.realpath(STATIC_PDB_DIR)
        
        # If it's an absolute path that starts with our static directory, use it as-is
        if os.path.isabs(file_path_param):
            requested_abs_path = os.path.realpath(file_path_param)
            
            # Security check: Ensure the requested path is within the static directory
            if not requested_abs_path.startswith(static_abs_path):
                app.logger.warning(
                    f"Forbidden access attempt. Path '{requested_abs_path}' not within static directory '{static_abs_path}'."
                )
                return jsonify({"success": False, "error": "Access to the specified file is forbidden."}), 403
        else:
            # For relative paths, try different subdirectories
            filename_only = os.path.basename(file_path_param)
            
            # Try pdb_files directory first (for FoldseekSearcher results)
            pdb_files_dir = os.path.join(STATIC_PDB_DIR, 'pdb_files')
            pdb_files_path = os.path.join(pdb_files_dir, filename_only)
            
            # Try docking_results directory (for docking results with subdirectories)
            docking_results_dir = os.path.join(STATIC_PDB_DIR, 'docking_results')
            
            requested_abs_path = None
            
            # Check if file exists in pdb_files directory
            if os.path.exists(pdb_files_path) and os.path.isfile(pdb_files_path):
                requested_abs_path = os.path.realpath(pdb_files_path)
            else:
                # Search in docking_results subdirectories
                for root, dirs, files in os.walk(docking_results_dir):
                    if filename_only in files:
                        potential_path = os.path.join(root, filename_only)
                        if os.path.isfile(potential_path):
                            requested_abs_path = os.path.realpath(potential_path)
                            break
            
            if requested_abs_path is None:
                app.logger.error(f"PDB file '{filename_only}' not found in any allowed directory")
                return jsonify({"success": False, "error": "PDB file not found."}), 404
            
            # Final security check
            if not requested_abs_path.startswith(static_abs_path):
                app.logger.warning(f"Security violation: resolved path '{requested_abs_path}' not within static directory")
                return jsonify({"success": False, "error": "Access to the specified file is forbidden."}), 403

        if not os.path.exists(requested_abs_path):
            app.logger.error(f"PDB file not found at resolved path: '{requested_abs_path}'")
            return jsonify({"success": False, "error": "PDB file not found."}), 404
        
        if not os.path.isfile(requested_abs_path):
            app.logger.error(f"Path is not a file: '{requested_abs_path}'")
            return jsonify({"success": False, "error": "Specified path is not a file."}), 400

        with open(requested_abs_path, 'r', encoding='utf-8') as f:
            pdb_content = f.read()
        
        return Response(pdb_content, mimetype='text/plain; charset=utf-8')

    except Exception as e:
        app.logger.error(f"Error serving PDB content for path '{file_path_param}': {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": "Internal server error while serving PDB content."}), 500

@app.route('/upload-file', methods=['POST'])
def upload_file():
    """Handle file uploads and store them temporarily."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    output_type = request.form.get('outputType')
    
    if not file or not output_type:
        return jsonify({'success': False, 'error': 'Missing file or output type'}), 400
    
    if not allowed_file(file.filename, output_type):
        return jsonify({'success': False, 'error': 'Invalid file type'}), 400
    
    try:
        # Create a unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save the file
        file.save(file_path)
        
        # Schedule file deletion after 1 hour
        def delete_file():
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error deleting file {file_path}: {str(e)}")
        
        threading.Timer(3600, delete_file).start()
        
        # If it's a sequence file, read and parse it
        sequences = []
        if output_type == 'sequence':
            with open(file_path, 'r') as f:
                current_sequence = []
                for line in f:
                    line = line.strip()
                    if line.startswith('>'):
                        if current_sequence:
                            sequences.append(''.join(current_sequence))
                            current_sequence = []
                    elif line:
                        current_sequence.append(line)
                if current_sequence:
                    sequences.append(''.join(current_sequence))
        
        return jsonify({
            'success': True,
            'filePath': file_path,
            'outputType': output_type,
            'sequences': sequences if output_type == 'sequence' else None
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Create global objects
memory = ConversationMemory()
job_manager = JobManager()
controller = PipelineController(conversation_memory=memory, job_manager=job_manager)
blast_searcher = NCBI_BLAST_Searcher()
download_handler = DownloadHandler()
db_builder = BlastDatabaseBuilder()

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
            'local_blast_search': 'search_similarity',
            'blast_db_builder': 'build_database'  # Add mapping for database builder
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
                                           'blast_db_builder']:  # Add blast_db_builder to the list
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

@app.route('/read-fasta-file', methods=['POST'])
def read_fasta_file():
    try:
        file_path = request.json.get('file_path')
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

@app.route('/build-blast-db', methods=['POST'])
def build_blast_db():
    """Build a BLAST database from either a FASTA file or Pfam IDs."""
    data = request.json
    fasta_file = data.get('fasta_file')
    pfam_ids = data.get('pfam_ids')
    sequence_types = data.get('sequence_types', ['unreviewed', 'reviewed', 'uniprot'])
    db_name = data.get('db_name')
    
    if not fasta_file and not pfam_ids:
        return jsonify({'success': False, 'error': 'Either fasta_file or pfam_ids must be provided'}), 400
    
    result = db_builder.build_database(
        fasta_file=fasta_file,
        pfam_ids=pfam_ids,
        sequence_types=sequence_types,
        db_name=db_name
    )
    
    if not result['success']:
        return jsonify(result), 500
    
    return jsonify(result)

@app.route('/active-blast-dbs', methods=['GET'])
def get_active_dbs():
    """Get all currently active BLAST databases."""
    try:
        active_dbs = db_builder.get_active_databases()
        return jsonify({
            'success': True,
            'databases': active_dbs
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/get-pfam-data', methods=['POST'])
def get_pfam_data():
    """Get Pfam data for given Pfam IDs."""
    data = request.json
    pfam_ids = data.get('pfam_ids', [])
    
    if not pfam_ids:
        return jsonify({
            'success': False,
            'error': 'No Pfam IDs provided'
        }), 400
        
    try:
        result = db_builder._get_count_of_sequences(pfam_ids)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/download-files-zip', methods=['POST'])
def download_files_zip():
    """Download multiple files as a ZIP archive."""
    data = request.json or {}
    files = data.get('files', [])
    
    if not files:
        return jsonify({'success': False, 'error': 'No files provided'}), 400
    
    # Create a zip file in memory
    import zipfile
    zip_buffer = io.BytesIO()
    
    try:
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_info in files:
                file_path = file_info.get('path')
                file_name = file_info.get('name')
                
                if not file_path or not file_name:
                    continue
                    
                if os.path.exists(file_path):
                    zip_file.write(file_path, file_name)
                else:
                    app.logger.warning(f"File not found: {file_path}")
        
        zip_buffer.seek(0)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"ramachandran_results_{timestamp}.zip"
        
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        app.logger.error(f"Error creating ZIP file: {str(e)}")
        return jsonify({'success': False, 'error': f'Failed to create ZIP file: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
