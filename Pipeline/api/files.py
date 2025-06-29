"""
File management module for the Protein Pipeline API.
Handles file uploads, downloads, PDB serving, and file operations.
"""

from flask import Blueprint, request, jsonify, send_from_directory, send_file, Response
from werkzeug.utils import secure_filename
from datetime import datetime
import threading
import io
import zipfile
import uuid
import os

# Create blueprint for file management routes
files_bp = Blueprint('files', __name__)

# Global variables to be injected by app factory
STATIC_PDB_DIR = None
UPLOAD_DIR = None
download_handler = None
app_logger = None

def init_files_module(static_dir, upload_dir, dl_handler, logger):
    """Initialize the files module with dependencies."""
    global STATIC_PDB_DIR, UPLOAD_DIR, download_handler, app_logger
    STATIC_PDB_DIR = static_dir
    UPLOAD_DIR = upload_dir
    download_handler = dl_handler
    app_logger = logger

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    'structure': ['.pdb'],
    'molecule': ['.sdf', '.mol2'],
    'sequence': ['.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn']
}

def allowed_file(filename, output_type):
    """Check if a file extension is allowed for the given output type."""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS[output_type])

@files_bp.route('/api/pdb-content', methods=['GET'])
def get_pdb_content():
    """Get the content of a PDB file."""
    if not STATIC_PDB_DIR:
        return jsonify({"success": False, "error": "File service not properly configured"}), 503
        
    file_path_param = request.args.get('filePath')
    if not file_path_param:
        if app_logger:
            app_logger.warning("API call to /api/pdb-content missing filePath parameter.")
        return jsonify({"success": False, "error": "filePath parameter is missing"}), 400

    try:
        # Check if the file path is within our static directory
        static_abs_path = os.path.realpath(STATIC_PDB_DIR)
        
        # If it's an absolute path that starts with our static directory, use it as-is
        if os.path.isabs(file_path_param):
            requested_abs_path = os.path.realpath(file_path_param)
            
            # Security check: Ensure the requested path is within the static directory
            if not requested_abs_path.startswith(static_abs_path):
                if app_logger:
                    app_logger.warning(
                        f"Forbidden access attempt. Path '{requested_abs_path}' not within static directory '{static_abs_path}'."
                    )
                return jsonify({"success": False, "error": "Access to the specified file is forbidden."}), 403
        else:
            # For relative paths, try different subdirectories
            filename_only = os.path.basename(file_path_param)
            
            # Try pdb_files directory (for FoldseekSearcher results)
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
                if app_logger:
                    app_logger.error(f"PDB file '{filename_only}' not found in any allowed directory")
                return jsonify({"success": False, "error": "PDB file not found."}), 404
            
            # Final security check
            if not requested_abs_path.startswith(static_abs_path):
                if app_logger:
                    app_logger.warning(f"Security violation: resolved path '{requested_abs_path}' not within static directory")
                return jsonify({"success": False, "error": "Access to the specified file is forbidden."}), 403

        if not os.path.exists(requested_abs_path):
            if app_logger:
                app_logger.error(f"PDB file not found at resolved path: '{requested_abs_path}'")
            return jsonify({"success": False, "error": "PDB file not found."}), 404
        
        if not os.path.isfile(requested_abs_path):
            if app_logger:
                app_logger.error(f"Path is not a file: '{requested_abs_path}'")
            return jsonify({"success": False, "error": "Specified path is not a file."}), 400

        with open(requested_abs_path, 'r', encoding='utf-8') as f:
            pdb_content = f.read()
        
        return Response(pdb_content, mimetype='text/plain; charset=utf-8')

    except Exception as e:
        if app_logger:
            app_logger.error(f"Error serving PDB content for path '{file_path_param}': {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": "Internal server error while serving PDB content."}), 500

@files_bp.route('/upload-file', methods=['POST'])
def upload_file():
    """Handle file uploads and store them temporarily."""
    if not UPLOAD_DIR:
        return jsonify({'success': False, 'error': 'Upload service not properly configured'}), 503
        
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    output_type = request.form.get('outputType')
    
    if not file or not file.filename or not output_type:
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

@files_bp.route('/pdb/<path:filename>')
def serve_pdb(filename):
    """Serve PDB files from the static directory."""
    if not STATIC_PDB_DIR:
        return jsonify({'error': 'File service not properly configured'}), 503
        
    # Extract just the filename without path for security
    safe_filename = os.path.basename(filename)
    if not os.path.exists(os.path.join(STATIC_PDB_DIR, safe_filename)):
        return jsonify({'error': 'PDB file not found'}), 404
    return send_from_directory(STATIC_PDB_DIR, safe_filename)

@files_bp.route('/download-sequence', methods=['POST'])
def download_sequence():
    """Download a sequence as a FASTA file."""
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
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

@files_bp.route('/download-structure', methods=['POST'])
def download_structure():
    """Download a PDB structure file."""
    if not STATIC_PDB_DIR:
        return jsonify({'success': False, 'error': 'File service not properly configured'}), 503
        
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
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

@files_bp.route('/download-search-results', methods=['POST'])
def download_search_results():
    """Download search results as a zip file containing organized results and reports."""
    if not download_handler:
        return jsonify({'success': False, 'error': 'Download service unavailable'}), 503
        
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
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

@files_bp.route('/download-multiple', methods=['POST'])
def download_multiple():
    """Download multiple items with improved organization and reporting."""
    if not download_handler:
        return jsonify({'success': False, 'error': 'Download service unavailable'}), 503
        
    payload = request.get_json(force=True)
    if not payload:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
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

@files_bp.route('/download-files-zip', methods=['POST'])
def download_files_zip():
    """Download multiple files as a ZIP archive."""
    data = request.json or {}
    files = data.get('files', [])
    
    if not files:
        return jsonify({'success': False, 'error': 'No files provided'}), 400
    
    # Create a zip file in memory
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
                    if app_logger:
                        app_logger.warning(f"File not found: {file_path}")
        
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
        if app_logger:
            app_logger.error(f"Error creating ZIP file: {str(e)}")
        return jsonify({'success': False, 'error': f'Failed to create ZIP file: {str(e)}'}), 500
