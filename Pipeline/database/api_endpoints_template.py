"""
Finetuning API endpoints for Protein Pipeline
Add these endpoints to your main app.py file
"""

from flask import request, jsonify
from database.db_manager import DatabaseManager
from database.dal import FinetuningDAL
import uuid
from datetime import datetime

# Initialize database components (add this to your main app.py)
db_manager = DatabaseManager()
finetuning_dal = FinetuningDAL(db_manager)

# Finetuning API Endpoints

@app.route('/api/finetuning/models', methods=['GET'])
def get_base_models():
    """Get all available base models for finetuning"""
    try:
        models = finetuning_dal.get_base_models()
        return jsonify({
            'success': True,
            'models': models
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/datasets', methods=['GET'])
def get_user_datasets():
    """Get datasets for the current user"""
    try:
        # Get user from session or auth token
        user_name = session.get('user_name')  # Implement your auth logic
        if not user_name:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        datasets = finetuning_dal.get_user_datasets(user_name)
        return jsonify({
            'success': True,
            'datasets': datasets
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/datasets', methods=['POST'])
def create_dataset():
    """Upload and register a new dataset"""
    try:
        # Handle file upload (similar to your existing upload_file endpoint)
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        dataset_name = request.form.get('dataset_name')
        dataset_type = request.form.get('dataset_type', 'protein')
        description = request.form.get('description')
        user_name = session.get('user_name')
        
        if not user_name:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        if not dataset_name:
            return jsonify({'success': False, 'error': 'Dataset name required'}), 400
        
        # Save file (reuse your existing logic)
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        file.save(file_path)
        
        # Parse FASTA file to count sequences
        sequences = []
        with open(file_path, 'r') as f:
            for line in f:
                if line.startswith('>'):
                    sequences.append(line)
        
        file_size = os.path.getsize(file_path)
        
        # Create dataset record
        dataset_id = finetuning_dal.create_dataset(
            path=file_path,
            user_name=user_name,
            dataset_name=dataset_name,
            number_of_sequences=len(sequences),
            dataset_size_bytes=file_size,
            dataset_type=dataset_type,
            description=description
        )
        
        if dataset_id:
            return jsonify({
                'success': True,
                'dataset_id': dataset_id,
                'message': 'Dataset uploaded successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create dataset record'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/jobs', methods=['POST'])
def create_finetuning_job():
    """Create a new finetuning job"""
    try:
        data = request.get_json()
        user_name = session.get('user_name')
        
        if not user_name:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        # Extract parameters
        base_model_id = data.get('base_model_id')
        dataset_id = data.get('dataset_id')
        job_name = data.get('job_name')
        finetune_mode = data.get('finetune_mode', 'full')
        learning_rate = data.get('learning_rate')
        batch_size = data.get('batch_size')
        num_epochs = data.get('num_epochs')
        weight_decay = data.get('weight_decay')
        optuna_hyperparam_tuning = data.get('optuna_hyperparam_tuning', False)
        
        if not base_model_id or not dataset_id:
            return jsonify({
                'success': False,
                'error': 'base_model_id and dataset_id are required'
            }), 400
        
        # Validate that user owns the dataset
        dataset = finetuning_dal.get_dataset(dataset_id)
        if not dataset or dataset['user_name'] != user_name:
            return jsonify({
                'success': False,
                'error': 'Dataset not found or access denied'
            }), 404
        
        # Create the job
        job_id = finetuning_dal.create_finetuning_job(
            user_name=user_name,
            base_model_id=base_model_id,
            dataset_id=dataset_id,
            job_name=job_name,
            finetune_mode=finetune_mode,
            learning_rate=learning_rate,
            batch_size=batch_size,
            num_epochs=num_epochs,
            weight_decay=weight_decay,
            optuna_hyperparam_tuning=optuna_hyperparam_tuning
        )
        
        if job_id:
            # Here you would typically:
            # 1. Submit the job to your Kubernetes cluster
            # 2. Start a pod with the finetuning process
            # 3. Update the job status to 'running'
            
            # For now, just return success
            return jsonify({
                'success': True,
                'job_id': job_id,
                'message': 'Finetuning job created successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create finetuning job'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/jobs/<int:job_id>', methods=['GET'])
def get_finetuning_job(job_id):
    """Get details of a specific finetuning job"""
    try:
        user_name = session.get('user_name')
        if not user_name:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        job = finetuning_dal.get_job(job_id)
        if not job:
            return jsonify({'success': False, 'error': 'Job not found'}), 404
        
        # Check if user owns this job
        if job['user_name'] != user_name:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        return jsonify({
            'success': True,
            'job': job
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/jobs', methods=['GET'])
def get_user_finetuning_jobs():
    """Get all finetuning jobs for the current user"""
    try:
        user_name = session.get('user_name')
        if not user_name:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        status_filter = request.args.get('status')
        jobs = finetuning_dal.get_user_jobs(user_name, status_filter)
        
        return jsonify({
            'success': True,
            'jobs': jobs
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/jobs/<int:job_id>/status', methods=['PUT'])
def update_job_status(job_id):
    """Update job status (typically called by the finetuning pod)"""
    try:
        data = request.get_json()
        status = data.get('status')
        error_message = data.get('error_message')
        progress_percentage = data.get('progress_percentage')
        pod_id = data.get('pod_id')
        
        if not status:
            return jsonify({'success': False, 'error': 'Status is required'}), 400
        
        success = finetuning_dal.update_job_status(
            job_id=job_id,
            status=status,
            error_message=error_message,
            progress_percentage=progress_percentage,
            pod_id=pod_id
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Job status updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update job status'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/models/user', methods=['GET'])
def get_user_finetuned_models():
    """Get all finetuned models for the current user"""
    try:
        user_name = session.get('user_name')
        if not user_name:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        models = finetuning_dal.get_user_models(user_name)
        return jsonify({
            'success': True,
            'models': models
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/generate', methods=['POST'])
def generate_with_finetuned_model():
    """Generate sequences using a finetuned model"""
    try:
        data = request.get_json()
        user_name = session.get('user_name')
        
        if not user_name:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        model_id = data.get('model_id')
        prompt = data.get('prompt')
        generation_params = data.get('generation_params', {})
        
        if not model_id or not prompt:
            return jsonify({
                'success': False,
                'error': 'model_id and prompt are required'
            }), 400
        
        # Validate model ownership
        model = finetuning_dal.get_finetuned_model(model_id)
        if not model or model['user_name'] != user_name:
            return jsonify({
                'success': False,
                'error': 'Model not found or access denied'
            }), 404
        
        # Here you would:
        # 1. Load the model
        # 2. Generate the sequence
        # 3. Calculate costs and execution time
        
        # For now, simulate generation
        start_time = datetime.now()
        generated_sequence = "MKVLVFPGDGIGPEIAKQVHAKGLGVGRAAIDASKGMRVIVSLPKSDAELIHLPGERINVVELSRSDAKRYLRELEEFGYQKLLERTAIPGSKIGVATRPGSMLPKGRQFCVNVKRKLQHKVLNLLCPGDGIFEIRARAFCGLSLIAEAYDLLRGHPSTLRFPGDGKKSLEEFGHQAVVGLTPRQRPLAVQQNEGAGGLP"
        end_time = datetime.now()
        
        execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
        tokens_generated = len(generated_sequence)
        cost_credits = tokens_generated * 0.01  # Example pricing
        
        # Record the generation call
        call_id = finetuning_dal.create_generation_call(
            finetuned_model_id=model_id,
            user_name=user_name,
            prompt=prompt,
            generated_sequence=generated_sequence,
            generation_params=generation_params,
            execution_time_ms=execution_time_ms,
            tokens_generated=tokens_generated,
            cost_credits=cost_credits
        )
        
        # Deduct credits from user (implement this)
        # finetuning_dal.update_user_credits(user_name, user_credits - cost_credits)
        
        return jsonify({
            'success': True,
            'generated_sequence': generated_sequence,
            'execution_time_ms': execution_time_ms,
            'tokens_generated': tokens_generated,
            'cost_credits': cost_credits,
            'call_id': call_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/finetuning/history', methods=['GET'])
def get_generation_history():
    """Get generation history for the current user"""
    try:
        user_name = session.get('user_name')
        if not user_name:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        limit = request.args.get('limit', 100, type=int)
        history = finetuning_dal.get_user_generation_history(user_name, limit)
        
        return jsonify({
            'success': True,
            'history': history
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
