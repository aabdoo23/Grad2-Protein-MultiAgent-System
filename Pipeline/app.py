from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from pipeline_controller import PipelineController
from Chatbot.ConversationMemory import ConversationMemory
import os

app = Flask(__name__)
CORS(app)
app.secret_key = "YOUR_SECRET_KEY"  # Needed for session management

# Configure static file serving
STATIC_PDB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'pdb_files')
os.makedirs(STATIC_PDB_DIR, exist_ok=True)

# Create a global conversation memory object
memory = ConversationMemory()
controller = PipelineController(conversation_memory=memory)

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

@app.route('/confirm', methods=['POST'])
def confirm():
    confirmation = request.json.get('confirmation')  # expect 'yes' or 'no'
    session_id = session['session_id']
    if confirmation.lower() != "yes":
        return jsonify({"success": True, "message": "Pipeline execution cancelled."})
    
    execution_result = controller.execute_pipeline(session_id)
    return jsonify(execution_result)

@app.route('/pdb/<path:filename>')
def serve_pdb(filename):
    """Serve PDB files from the static directory"""
    # Extract just the filename without path for security
    safe_filename = os.path.basename(filename)
    if not os.path.exists(os.path.join(STATIC_PDB_DIR, safe_filename)):
        return jsonify({'error': 'PDB file not found'}), 404
    return send_from_directory(STATIC_PDB_DIR, safe_filename)

if __name__ == '__main__':
    import uuid
    app.run(debug=True)
