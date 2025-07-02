from typing import List, Dict, Any, Optional
from datetime import datetime
from db_manager import DatabaseManager
import json

class FinetuningDAL:
    """Data Access Layer for finetuning operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    # User operations
    def create_user(self, user_name: str, email: str, full_name: str, 
                   hashed_password: str, institution: str = None, credits: int = 0) -> bool:
        """Create a new user account"""
        query = """
            INSERT INTO user_account (user_name, email, full_name, hashed_password, institution, credits)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        try:
            self.db.execute_query(query, (user_name, email, full_name, hashed_password, institution, credits))
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False
    
    def get_user(self, user_name: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        query = "SELECT * FROM user_account WHERE user_name = ?"
        result = self.db.execute_query(query, (user_name,), fetch=True)
        return result[0] if result else None
    
    def update_user_credits(self, user_name: str, credits: int) -> bool:
        """Update user credits"""
        query = "UPDATE user_account SET credits = ? WHERE user_name = ?"
        try:
            rows_affected = self.db.execute_query(query, (credits, user_name))
            return rows_affected > 0
        except Exception as e:
            print(f"Error updating credits: {e}")
            return False
    
    # Base model operations
    def get_base_models(self) -> List[Dict[str, Any]]:
        """Get all active base models"""
        query = "SELECT * FROM base_model WHERE is_active = 1 ORDER BY model_name"
        return self.db.execute_query(query, fetch=True) or []
    
    def get_base_model(self, model_id: int) -> Optional[Dict[str, Any]]:
        """Get base model by ID"""
        query = "SELECT * FROM base_model WHERE id = ? AND is_active = 1"
        result = self.db.execute_query(query, (model_id,), fetch=True)
        return result[0] if result else None
    
    # Dataset operations
    def create_dataset(self, path: str, user_name: str, dataset_name: str,
                      number_of_sequences: int, dataset_size_bytes: int,
                      dataset_type: str = None, description: str = None) -> Optional[int]:
        """Create a new dataset"""
        # Try SQL Server syntax first, fall back to standard SQL
        try:
            query = """
                INSERT INTO dataset (path, user_name, dataset_name, number_of_sequences, 
                                   dataset_size_bytes, dataset_type, description)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            result = self.db.execute_scalar(query, (path, user_name, dataset_name,
                                                  number_of_sequences, dataset_size_bytes,
                                                  dataset_type, description))
            return result
        except Exception as e:
            # Fall back to standard SQL approach
            try:
                query = """
                    INSERT INTO dataset (path, user_name, dataset_name, number_of_sequences, 
                                       dataset_size_bytes, dataset_type, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """
                self.db.execute_query(query, (path, user_name, dataset_name,
                                            number_of_sequences, dataset_size_bytes,
                                            dataset_type, description))
                # Get the last inserted ID
                result = self.db.execute_scalar("SELECT last_insert_rowid()")  # SQLite
                return result
            except Exception as e2:
                print(f"Error creating dataset: {e2}")
                return None
    
    def get_user_datasets(self, user_name: str) -> List[Dict[str, Any]]:
        """Get all datasets for a user"""
        query = """
            SELECT * FROM dataset 
            WHERE user_name = ? AND is_active = 1 
            ORDER BY created_at DESC
        """
        return self.db.execute_query(query, (user_name,), fetch=True) or []
    
    def get_dataset(self, dataset_id: int) -> Optional[Dict[str, Any]]:
        """Get dataset by ID"""
        query = "SELECT * FROM dataset WHERE id = ? AND is_active = 1"
        result = self.db.execute_query(query, (dataset_id,), fetch=True)
        return result[0] if result else None
    
    # Finetuning job operations
    def create_finetuning_job(self, user_name: str, base_model_id: int, dataset_id: int,
                             job_name: str = None, finetune_mode: str = 'full',
                             learning_rate: float = None, batch_size: int = None,
                             num_epochs: int = None, weight_decay: float = None,
                             optuna_hyperparam_tuning: bool = False) -> Optional[int]:
        """Create a new finetuning job"""
        # Try SQL Server syntax first, fall back to standard SQL
        try:
            query = """
                INSERT INTO finetuning_job (user_name, base_model_id, dataset_id, job_name,
                                          finetune_mode, learning_rate, batch_size, num_epochs,
                                          weight_decay, optuna_hyperparam_tuning)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            result = self.db.execute_scalar(query, (user_name, base_model_id, dataset_id,
                                                  job_name, finetune_mode, learning_rate,
                                                  batch_size, num_epochs, weight_decay,
                                                  optuna_hyperparam_tuning))
            return result
        except Exception as e:
            # Fall back to standard SQL approach
            try:
                query = """
                    INSERT INTO finetuning_job (user_name, base_model_id, dataset_id, job_name,
                                              finetune_mode, learning_rate, batch_size, num_epochs,
                                              weight_decay, optuna_hyperparam_tuning)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                self.db.execute_query(query, (user_name, base_model_id, dataset_id,
                                            job_name, finetune_mode, learning_rate,
                                            batch_size, num_epochs, weight_decay,
                                            optuna_hyperparam_tuning))
                # Get the last inserted ID
                result = self.db.execute_scalar("SELECT last_insert_rowid()")  # SQLite
                return result
            except Exception as e2:
                print(f"Error creating finetuning job: {e2}")
                return None
    
    def update_job_status(self, job_id: int, status: str, error_message: str = None,
                         progress_percentage: float = None, pod_id: str = None) -> bool:
        """Update job status and progress"""
        query = """
            UPDATE finetuning_job 
            SET status = ?, error_message = ?, progress_percentage = ?, pod_id = ?
            WHERE id = ?
        """
        try:
            rows_affected = self.db.execute_query(query, (status, error_message,
                                                        progress_percentage, pod_id, job_id))
            return rows_affected > 0
        except Exception as e:
            print(f"Error updating job status: {e}")
            return False
    
    def complete_job(self, job_id: int) -> bool:
        """Mark job as completed"""
        # Try SQL Server syntax first, fall back to standard SQL
        try:
            query = """
                UPDATE finetuning_job 
                SET status = 'completed', progress_percentage = 100.0, 
                    actual_completion_time = GETUTCDATE()
                WHERE id = ?
            """
            rows_affected = self.db.execute_query(query, (job_id,))
            return rows_affected > 0
        except Exception as e:
            # Fall back to standard SQL with CURRENT_TIMESTAMP
            try:
                query = """
                    UPDATE finetuning_job 
                    SET status = 'completed', progress_percentage = 100.0, 
                        actual_completion_time = CURRENT_TIMESTAMP
                    WHERE id = ?
                """
                rows_affected = self.db.execute_query(query, (job_id,))
                return rows_affected > 0
            except Exception as e2:
                print(f"Error completing job: {e2}")
                return False
    
    def get_job(self, job_id: int) -> Optional[Dict[str, Any]]:
        """Get job by ID with related information"""
        query = """
            SELECT fj.*, bm.model_name as base_model_name, d.dataset_name,
                   ua.full_name as user_full_name
            FROM finetuning_job fj
            JOIN base_model bm ON fj.base_model_id = bm.id
            JOIN dataset d ON fj.dataset_id = d.id
            JOIN user_account ua ON fj.user_name = ua.user_name
            WHERE fj.id = ?
        """
        result = self.db.execute_query(query, (job_id,), fetch=True)
        return result[0] if result else None
    
    def get_user_jobs(self, user_name: str, status: str = None) -> List[Dict[str, Any]]:
        """Get jobs for a user, optionally filtered by status"""
        if status:
            query = """
                SELECT fj.*, bm.model_name as base_model_name, d.dataset_name
                FROM finetuning_job fj
                JOIN base_model bm ON fj.base_model_id = bm.id
                JOIN dataset d ON fj.dataset_id = d.id
                WHERE fj.user_name = ? AND fj.status = ?
                ORDER BY fj.created_at DESC
            """
            params = (user_name, status)
        else:
            query = """
                SELECT fj.*, bm.model_name as base_model_name, d.dataset_name
                FROM finetuning_job fj
                JOIN base_model bm ON fj.base_model_id = bm.id
                JOIN dataset d ON fj.dataset_id = d.id
                WHERE fj.user_name = ?
                ORDER BY fj.created_at DESC
            """
            params = (user_name,)
        
        return self.db.execute_query(query, params, fetch=True) or []
    
    # Finetuned model operations
    def create_finetuned_model(self, job_id: str, user_name: str, model_name: str, 
                              model_path: str, base_model_name: str, model_size_bytes: int = None,
                              performance_metrics: Dict[str, Any] = None) -> Optional[int]:
        """Create a new finetuned model"""
        metrics_json = json.dumps(performance_metrics) if performance_metrics else None
        # Try SQL Server syntax first, fall back to standard SQL
        try:
            query = """
                INSERT INTO finetuned_models (job_id, user_name, model_name, model_path,
                                           base_model_name, model_size_bytes, performance_metrics)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            result = self.db.execute_scalar(query, (job_id, user_name, model_name, 
                                                  model_path, base_model_name, model_size_bytes,
                                                  metrics_json))
            return result
        except Exception as e:
            # Fall back to PostgreSQL approach
            try:
                query = """
                    INSERT INTO finetuned_models (job_id, user_name, model_name, model_path,
                                               base_model_name, model_size_bytes, performance_metrics)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
                """
                result = self.db.execute_scalar(query, (job_id, user_name, model_name,
                                              model_path, base_model_name, model_size_bytes,
                                              metrics_json))
                return result
            except Exception as e2:
                print(f"Error creating finetuned model: {e2}")
                return None
    
    def get_user_models(self, user_name: str) -> List[Dict[str, Any]]:
        """Get all finetuned models for a user"""
        query = """
            SELECT fm.*, fm.base_model_name
            FROM finetuned_models fm
            WHERE fm.user_name = ? AND fm.is_active = 1
            ORDER BY fm.created_at DESC
        """
        return self.db.execute_query(query, (user_name,), fetch=True) or []
    
    def get_finetuned_model(self, model_id: int) -> Optional[Dict[str, Any]]:
        """Get finetuned model by ID"""
        query = """
            SELECT fm.*
            FROM finetuned_models fm
            WHERE fm.id = ? AND fm.is_active = 1
        """
        result = self.db.execute_query(query, (model_id,), fetch=True)
        return result[0] if result else None
    
    # Generation call operations
    def create_generation_call(self, finetuned_model_id: int, user_name: str, prompt: str,
                              generated_sequence: str = None, generation_params: Dict[str, Any] = None,
                              execution_time_ms: int = None, tokens_generated: int = None,
                              cost_credits: float = None) -> Optional[int]:
        """Create a new generation call record"""
        params_json = json.dumps(generation_params) if generation_params else None
        # Try SQL Server syntax first, fall back to standard SQL
        try:
            query = """
                INSERT INTO generate_call (finetuned_model_id, user_name, prompt, generated_sequence,
                                         generation_params, execution_time_ms, tokens_generated, cost_credits)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
            result = self.db.execute_scalar(query, (finetuned_model_id, user_name, prompt,
                                                  generated_sequence, params_json,
                                                  execution_time_ms, tokens_generated, cost_credits))
            return result
        except Exception as e:
            # Fall back to standard SQL approach
            try:
                query = """
                    INSERT INTO generate_call (finetuned_model_id, user_name, prompt, generated_sequence,
                                             generation_params, execution_time_ms, tokens_generated, cost_credits)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """
                self.db.execute_query(query, (finetuned_model_id, user_name, prompt,
                                            generated_sequence, params_json,
                                            execution_time_ms, tokens_generated, cost_credits))
                # Get the last inserted ID
                result = self.db.execute_scalar("SELECT last_insert_rowid()")  # SQLite
                return result
            except Exception as e2:
                print(f"Error creating generation call: {e2}")
                return None
    
    def get_user_generation_history(self, user_name: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get generation history for a user"""
        # Try SQL Server syntax first, fall back to standard SQL
        try:
            query = """
                SELECT gc.*, fm.model_name as finetuned_model_name
                FROM generate_call gc
                JOIN finetuned_models fm ON gc.finetuned_model_id = fm.id
                WHERE gc.user_name = ?
                ORDER BY gc.created_at DESC
                OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY
            """
            return self.db.execute_query(query, (user_name, limit), fetch=True) or []
        except Exception as e:
            # Fall back to standard SQL with LIMIT
            try:
                query = """
                    SELECT gc.*, fm.model_name as finetuned_model_name
                    FROM generate_call gc
                    JOIN finetuned_models fm ON gc.finetuned_model_id = fm.id
                    WHERE gc.user_name = ?
                    ORDER BY gc.created_at DESC
                    LIMIT ?
                """
                return self.db.execute_query(query, (user_name, limit), fetch=True) or []
            except Exception as e2:
                print(f"Error getting generation history: {e2}")
                return []
