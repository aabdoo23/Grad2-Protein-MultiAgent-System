"""
Fine-tuning module for the Protein Pipeline API.
Handles AI model fine-tuning operations and sequence generation.
"""

from flask import Blueprint, request, jsonify, session

# Create blueprint for fine-tuning routes
finetune_bp = Blueprint('finetune', __name__, url_prefix='/api/finetune')

# Global variables to be injected by app factory
finetune_client = None
app_logger = None

def init_finetune_module(ft_client, logger):
    """Initialize the finetune module with dependencies."""
    global finetune_client, app_logger
    finetune_client = ft_client
    app_logger = logger

def require_auth(f):
    """Authentication decorator for protected routes."""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@finetune_bp.route('/models/base', methods=['GET'])
@require_auth
def get_base_models():
    """Get list of available base models for fine-tuning."""
    try:
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        result = finetune_client.get_base_models()
        return jsonify(result)
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error fetching base models: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to connect to fine-tuning server: {str(e)}'
        }), 500

@finetune_bp.route('/models/user/<user_id>', methods=['GET'])
@require_auth
def get_user_finetuned_models(user_id):
    """Get list of user's fine-tuned models."""
    try:
        # Ensure user can only access their own models
        current_user = session['user']['user_name']
        if user_id != current_user:
            return jsonify({
                'success': False, 
                'error': 'Access denied: can only view own models'
            }), 403
        
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        result = finetune_client.get_user_models(user_id)
        return jsonify(result)
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error fetching user models for {user_id}: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to fetch user models: {str(e)}'
        }), 500

@finetune_bp.route('/models/user/current', methods=['GET'])
@require_auth
def get_current_user_models():
    """Get current authenticated user's fine-tuned models."""
    try:
        current_user = session['user']['user_name']
        
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        result = finetune_client.get_user_models(current_user)
        return jsonify(result)
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error fetching current user models: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to fetch user models: {str(e)}'
        }), 500

@finetune_bp.route('/jobs/user/current', methods=['GET'])
@require_auth
def get_current_user_jobs():
    """Get current authenticated user's fine-tuning jobs."""
    try:
        current_user = session['user']['user_name']
        
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        result = finetune_client.get_user_jobs(current_user)
        return jsonify(result)
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error fetching current user jobs: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to fetch user jobs: {str(e)}'
        }), 500

@finetune_bp.route('/start', methods=['POST'])
@require_auth
def start_finetuning():
    """Start a fine-tuning job."""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Get authenticated user
        current_user = session['user']['user_name']
        
        # Validate required fields
        required_fields = ['model_key', 'fasta_content']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False, 
                    'error': f'Missing required field: {field}'
                }), 400
        
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
        
        result = finetune_client.start_finetuning(
            model_key=data['model_key'],
            fasta_content=data['fasta_content'],
            user_id=current_user,
            finetune_mode=data.get('finetune_mode'),
            n_trials=data.get('n_trials')
        )
        
        return jsonify({
            'success': True,
            'job_id': result['job_id'],
            'status': result['status']
        })
        
    except ValueError as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 400
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error starting fine-tuning job: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to start fine-tuning job: {str(e)}'
        }), 500

@finetune_bp.route('/generate', methods=['POST'])
@require_auth
def generate_sequence():
    """Generate a protein sequence using a base or fine-tuned model."""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Get authenticated user
        current_user = session['user']['user_name']
        
        # Validate required fields
        required_fields = ['prompt']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False, 
                    'error': f'Missing required field: {field}'
                }), 400
        
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
        
        result = finetune_client.generate_sequence(
            prompt=data['prompt'],
            user_id=current_user,
            base_model_key=data.get('base_model_key'),
            model_dir_on_volume=data.get('model_dir_on_volume'),
            max_new_tokens=data.get('max_new_tokens')
        )
        
        return jsonify({
            'success': True,
            'job_id': result['job_id'],
            'status': result['status']
        })
        
    except ValueError as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 400
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error starting generation job: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to start generation job: {str(e)}'
        }), 500

@finetune_bp.route('/status/<job_id>', methods=['GET'])
@require_auth
def get_finetune_job_status(job_id):
    """Get the status of a fine-tuning or generation job."""
    try:
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        result = finetune_client.get_job_status(job_id)
        
        return jsonify({
            'success': True,
            'job_id': result['job_id'],
            'status': finetune_client.normalize_job_status(result['status']),
            'output': result.get('output')
        })
        
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error fetching job status for {job_id}: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to fetch job status: {str(e)}'
        }), 500

@finetune_bp.route('/health', methods=['GET'])
def check_finetune_server_health():
    """Check if the fine-tuning server is accessible."""
    try:
        if not finetune_client:
            return jsonify({
                'success': False,
                'server_status': 'offline',
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        health_data = finetune_client.health_check()
        return jsonify({
            'success': True,
            'server_status': 'online',
            'health_data': health_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'server_status': 'offline',
            'error': str(e)
        }), 503

@finetune_bp.route('/models/current/<job_id>', methods=['DELETE'])
@require_auth
def delete_current_user_model(job_id):
    """Delete a specific fine-tuned model for the current user."""
    try:
        current_user = session['user']['user_name']
        
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        result = finetune_client.delete_model(current_user, job_id)
        return jsonify(result)
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error deleting model {job_id} for current user: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to delete model: {str(e)}'
        }), 500

@finetune_bp.route('/models/user/<user_id>/<job_id>', methods=['DELETE'])
@require_auth
def delete_user_finetuned_model(user_id, job_id):
    """Delete a specific fine-tuned model for a user."""
    try:
        # Ensure user can only delete their own models
        current_user = session['user']['user_name']
        if user_id != current_user:
            return jsonify({
                'success': False, 
                'error': 'Access denied: can only delete own models'
            }), 403
        
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        result = finetune_client.delete_model(user_id, job_id)
        return jsonify(result)
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error deleting model {job_id} for user {user_id}: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to delete model: {str(e)}'
        }), 500

@finetune_bp.route('/jobs/user/<user_id>', methods=['GET'])
@require_auth
def get_user_finetune_jobs(user_id):
    """Get all fine-tuning jobs for a user."""
    try:
        # Ensure user can only access their own jobs
        current_user = session['user']['user_name']
        if user_id != current_user:
            return jsonify({
                'success': False, 
                'error': 'Access denied: can only view own jobs'
            }), 403
        
        if not finetune_client:
            return jsonify({
                'success': False, 
                'error': 'Fine-tuning service unavailable'
            }), 503
            
        result = finetune_client.get_user_jobs(user_id)
        return jsonify(result)
    except Exception as e:
        if app_logger:
            app_logger.error(f"Error fetching jobs for user {user_id}: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Failed to fetch user jobs: {str(e)}'
        }), 500
