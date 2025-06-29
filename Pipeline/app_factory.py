"""
Main application factory for the Protein Pipeline.
Creates and configures the Flask application with all modules.
"""

from flask import Flask, session
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

# Import all modules
from api.auth import auth_bp, init_auth_module
from api.finetune import finetune_bp, init_finetune_module
from api.pipeline import pipeline_bp, init_pipeline_module
from api.files import files_bp, init_files_module
from api.search import search_bp, init_search_module

# Import dependencies
from util.flow.pipeline_controller import PipelineController
from util.chatbot.conversation_memory import ConversationMemory
from util.flow.job_manager import JobManager
from Tools.Search.FoldSeek.foldseek_searcher import FoldseekSearcher
from Tools.TDStructure.Evaluation.structure_evaluator import StructureEvaluator
from Tools.Search.BLAST.ncbi_blast_searcher import NCBI_BLAST_Searcher
from Tools.Search.BLAST.database_builder import BlastDatabaseBuilder
from util.modules.download_handler import DownloadHandler
from util.finetune_client import finetune_client
from database.db_manager import DatabaseManager
from util.auth_manager import AuthManager

def create_app():
    """Create and configure the Flask application."""
    # Load environment variables
    load_dotenv()
    
    # Create Flask app
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, supports_credentials=True, resources={
        r"/*": {
            "origins": [
                "http://localhost:3000", 
                "https://grad2-protein-multi-agent-system.vercel.app", 
                "https://protein-pipeline.vercel.app"
            ],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Disposition"]
        }
    })
      # Configure session management
    app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour session timeout
    
    # Configure static file serving
    STATIC_PDB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
    os.makedirs(STATIC_PDB_DIR, exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Initialize database and authentication
    db_manager = None
    auth_manager = None
    try:
        db_manager = DatabaseManager()
        auth_manager = AuthManager(db_manager)
        print("Database connection established successfully")
        
        # Enable debug logging for authentication
        logging.basicConfig(level=logging.INFO)
        auth_logger = logging.getLogger('util.auth_manager')
        auth_logger.setLevel(logging.INFO)
        
    except Exception as e:
        print(f"Warning: Database connection failed: {e}")
    
    # Create global objects
    memory = ConversationMemory()
    job_manager = JobManager()
    controller = PipelineController(conversation_memory=memory, job_manager=job_manager)
    blast_searcher = NCBI_BLAST_Searcher()
    download_handler = DownloadHandler()
    db_builder = BlastDatabaseBuilder()
    foldseek_searcher = FoldseekSearcher()
    structure_evaluator = StructureEvaluator()
    
    # Initialize all modules with their dependencies
    init_auth_module(auth_manager, app.logger)
    init_finetune_module(finetune_client, app.logger)
    init_pipeline_module(controller, job_manager, memory, app.logger)
    init_files_module(STATIC_PDB_DIR, UPLOAD_DIR, download_handler, app.logger)
    init_search_module(blast_searcher, foldseek_searcher, structure_evaluator, 
                      db_builder, STATIC_PDB_DIR, app.logger)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(finetune_bp)
    app.register_blueprint(pipeline_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(search_bp)
    
    return app

def main():
    """Main entry point for the application."""
    app = create_app()
    app.run(debug=True)

if __name__ == '__main__':
    main()
