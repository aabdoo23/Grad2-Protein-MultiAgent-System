"""
Search and analysis module for the Protein Pipeline API.
Handles BLAST searches, structure evaluation, FoldSeek, and database building.
"""

from flask import Blueprint, request, jsonify
import os

# Create blueprint for search/analysis routes
search_bp = Blueprint('search', __name__)

# Global variables to be injected by app factory
blast_searcher = None
foldseek_searcher = None
structure_evaluator = None
db_builder = None
STATIC_PDB_DIR = None
app_logger = None

def init_search_module(blast_search, foldseek_search, struct_eval, database_builder, static_dir, logger):
    """Initialize the search module with dependencies."""
    global blast_searcher, foldseek_searcher, structure_evaluator, db_builder, STATIC_PDB_DIR, app_logger
    blast_searcher = blast_search
    foldseek_searcher = foldseek_search
    structure_evaluator = struct_eval
    db_builder = database_builder
    STATIC_PDB_DIR = static_dir
    app_logger = logger

@search_bp.route('/download-pdb', methods=['POST'])
def download_pdb():
    """Download a PDB file from either RCSB or AlphaFold database."""
    if not foldseek_searcher:
        return jsonify({'success': False, 'error': 'Search service unavailable'}), 503
        
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
    target_id = data.get('target_id')
    database = data.get('database')
    
    if not target_id or not database:
        return jsonify({'success': False, 'error': 'Missing target_id or database'}), 400
    
    result = foldseek_searcher.download_pdb(target_id, database)
    
    if result['success']:
        # Extract just the filename for the response
        filename = os.path.basename(result['pdb_file'])
        return jsonify({
            'success': True,
            'pdb_file': filename
        })
    else:
        return jsonify(result), 500

@search_bp.route('/evaluate-structures', methods=['POST'])
def evaluate_structures():
    """Evaluate structural similarity between two PDB files using USalign."""
    if not structure_evaluator or not STATIC_PDB_DIR:
        return jsonify({'success': False, 'error': 'Analysis service unavailable'}), 503
        
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
    pdb1_path = data.get('pdb1_path')
    pdb2_path = data.get('pdb2_path')
    
    if not pdb1_path or not pdb2_path:
        return jsonify({'success': False, 'error': 'Missing PDB file paths'}), 400
    
    # Convert relative paths to absolute paths
    pdb1_abs = os.path.join(STATIC_PDB_DIR, os.path.basename(pdb1_path))
    pdb2_abs = os.path.join(STATIC_PDB_DIR, os.path.basename(pdb2_path))
    
    if not os.path.exists(pdb1_abs) or not os.path.exists(pdb2_abs):
        return jsonify({'success': False, 'error': 'One or both PDB files not found'}), 404
    
    result = structure_evaluator.evaluate_with_usalign(pdb1_abs, pdb2_abs)
    
    return jsonify(result)

@search_bp.route('/check-blast-results/<rid>', methods=['GET'])
def check_blast_results(rid):
    """Check the status and get results of a BLAST search."""
    if not blast_searcher:
        return jsonify({'success': False, 'error': 'BLAST service unavailable'}), 503
        
    try:
        result = blast_searcher.check_results(rid)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "status": "failed",
            "error": str(e)
        }), 500

@search_bp.route('/build-blast-db', methods=['POST'])
def build_blast_db():
    """Build a BLAST database from either a FASTA file or Pfam IDs."""
    if not db_builder:
        return jsonify({'success': False, 'error': 'Database building service unavailable'}), 503
        
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
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

@search_bp.route('/active-blast-dbs', methods=['GET'])
def get_active_dbs():
    """Get all currently active BLAST databases."""
    if not db_builder:
        return jsonify({'success': False, 'error': 'Database service unavailable'}), 503
        
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

@search_bp.route('/get-pfam-data', methods=['POST'])
def get_pfam_data():
    """Get Pfam data for given Pfam IDs."""
    if not db_builder:
        return jsonify({'success': False, 'error': 'Database service unavailable'}), 503
        
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
        
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
