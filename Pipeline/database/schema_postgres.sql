-- Protein Pipeline Finetuning Database Schema
-- PostgreSQL Migration Script

-- Drop tables in reverse dependency order if they exist
DROP TABLE IF EXISTS generate_call CASCADE;
DROP TABLE IF EXISTS finetuned_models CASCADE;
DROP TABLE IF EXISTS finetuning_job CASCADE;
DROP TABLE IF EXISTS dataset CASCADE;
DROP TABLE IF EXISTS base_model CASCADE;
DROP TABLE IF EXISTS user_account CASCADE;

-- Create user_account table (renamed from 'user' to avoid SQL keyword conflicts)
CREATE TABLE user_account (
    user_name VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    credits INTEGER DEFAULT 0 CHECK (credits >= 0),
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create base_model table
CREATE TABLE base_model (
    id SERIAL PRIMARY KEY,
    path VARCHAR(500) NOT NULL,
    model_name VARCHAR(255) UNIQUE NOT NULL,
    number_of_parameters BIGINT CHECK (number_of_parameters > 0),
    model_type VARCHAR(100), -- e.g., 'transformer', 'cnn', etc.
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create dataset table
CREATE TABLE dataset (
    id SERIAL PRIMARY KEY,
    path VARCHAR(500) NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    dataset_name VARCHAR(255) NOT NULL,
    number_of_sequences INTEGER CHECK (number_of_sequences > 0),
    dataset_size_bytes BIGINT CHECK (dataset_size_bytes > 0),
    dataset_type VARCHAR(100), -- e.g., 'protein', 'dna', 'rna'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_name) REFERENCES user_account(user_name) ON DELETE CASCADE,
    CONSTRAINT UK_dataset_user_name UNIQUE (user_name, dataset_name)
);

-- Create finetuning_job table
CREATE TABLE finetuning_job (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    base_model_id INTEGER NOT NULL,
    dataset_id INTEGER NOT NULL,
    job_name VARCHAR(255),
    finetune_mode VARCHAR(50) DEFAULT 'full' CHECK (finetune_mode IN ('full', 'qlora', 'lora', 'adapter')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    learning_rate REAL CHECK (learning_rate > 0 AND learning_rate <= 1),
    batch_size INTEGER CHECK (batch_size > 0),
    num_epochs INTEGER CHECK (num_epochs > 0),
    weight_decay REAL CHECK (weight_decay >= 0 AND weight_decay <= 1),
    optuna_hyperparam_tuning BOOLEAN DEFAULT FALSE,
    pod_id VARCHAR(255), -- Kubernetes pod identifier
    error_message TEXT,
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    actual_completion_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_name) REFERENCES user_account(user_name) ON DELETE CASCADE,
    FOREIGN KEY (base_model_id) REFERENCES base_model(id) ON DELETE RESTRICT,
    FOREIGN KEY (dataset_id) REFERENCES dataset(id) ON DELETE RESTRICT
);

-- Create finetuned_models table (using plural name as in SQL Server)
CREATE TABLE finetuned_models (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    model_path VARCHAR(500) NOT NULL,
    base_model_name VARCHAR(255) NOT NULL,
    model_size_bytes BIGINT,
    performance_metrics TEXT, -- JSON string with metrics
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_name) REFERENCES user_account(user_name) ON DELETE RESTRICT,
    CONSTRAINT UK_finetuned_models_user_name UNIQUE (user_name, model_name)
);

-- Create generate_call table
CREATE TABLE generate_call (
    id SERIAL PRIMARY KEY,
    finetuned_model_id INTEGER NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    generated_sequence TEXT,
    generation_params TEXT, -- JSON string with generation parameters
    execution_time_ms INTEGER,
    tokens_generated INTEGER,
    cost_credits DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (finetuned_model_id) REFERENCES finetuned_models(id) ON DELETE CASCADE,
    FOREIGN KEY (user_name) REFERENCES user_account(user_name) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX IX_dataset_user_name ON dataset(user_name);
CREATE INDEX IX_dataset_created_at ON dataset(created_at);

CREATE INDEX IX_finetuning_job_user_name ON finetuning_job(user_name);
CREATE INDEX IX_finetuning_job_status ON finetuning_job(status);
CREATE INDEX IX_finetuning_job_created_at ON finetuning_job(created_at);
CREATE INDEX IX_finetuning_job_base_model ON finetuning_job(base_model_id);

CREATE INDEX IX_finetuned_models_user_name ON finetuned_models(user_name);
CREATE INDEX IX_finetuned_models_base_model ON finetuned_models(base_model_name);
CREATE INDEX IX_finetuned_models_created_at ON finetuned_models(created_at);

CREATE INDEX IX_generate_call_user_name ON generate_call(user_name);
CREATE INDEX IX_generate_call_model ON generate_call(finetuned_model_id);
CREATE INDEX IX_generate_call_created_at ON generate_call(created_at);

-- Create functions for updated_at timestamps (PostgreSQL equivalent of SQL Server triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER trigger_user_account_updated_at
    BEFORE UPDATE ON user_account
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_base_model_updated_at
    BEFORE UPDATE ON base_model
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_dataset_updated_at
    BEFORE UPDATE ON dataset
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_finetuning_job_updated_at
    BEFORE UPDATE ON finetuning_job
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_finetuned_models_updated_at
    BEFORE UPDATE ON finetuned_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Output success message
SELECT 'Database schema created successfully!' as result;
