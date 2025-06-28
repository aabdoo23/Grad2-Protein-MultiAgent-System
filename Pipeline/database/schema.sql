-- Protein Pipeline Finetuning Database Schema
-- SQL Server Migration Script

-- Create database (uncomment if needed)
-- CREATE DATABASE ProteinFinetuning;
-- USE ProteinFinetuning;

-- Drop tables in reverse dependency order if they exist
IF OBJECT_ID('generate_call', 'U') IS NOT NULL DROP TABLE generate_call;
IF OBJECT_ID('finetuned_model', 'U') IS NOT NULL DROP TABLE finetuned_model;
IF OBJECT_ID('finetuning_job', 'U') IS NOT NULL DROP TABLE finetuning_job;
IF OBJECT_ID('dataset', 'U') IS NOT NULL DROP TABLE dataset;
IF OBJECT_ID('base_model', 'U') IS NOT NULL DROP TABLE base_model;
IF OBJECT_ID('user_account', 'U') IS NOT NULL DROP TABLE user_account;

-- Create user_account table (renamed from 'user' to avoid SQL keyword conflicts)
CREATE TABLE user_account (
    user_name NVARCHAR(50) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    credits INT DEFAULT 0 CHECK (credits >= 0),
    full_name NVARCHAR(255) NOT NULL,
    hashed_password NVARCHAR(255) NOT NULL,
    institution NVARCHAR(255),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Create base_model table
CREATE TABLE base_model (
    id INT IDENTITY(1,1) PRIMARY KEY,
    path NVARCHAR(500) NOT NULL,
    model_name NVARCHAR(255) UNIQUE NOT NULL,
    number_of_parameters BIGINT CHECK (number_of_parameters > 0),
    model_type NVARCHAR(100), -- e.g., 'transformer', 'cnn', etc.
    description NTEXT,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Create dataset table
CREATE TABLE dataset (
    id INT IDENTITY(1,1) PRIMARY KEY,
    path NVARCHAR(500) NOT NULL,
    user_name NVARCHAR(50) NOT NULL,
    dataset_name NVARCHAR(255) NOT NULL,
    number_of_sequences INT CHECK (number_of_sequences > 0),
    dataset_size_bytes BIGINT CHECK (dataset_size_bytes > 0),
    dataset_type NVARCHAR(100), -- e.g., 'protein', 'dna', 'rna'
    description NTEXT,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_name) REFERENCES user_account(user_name) ON DELETE CASCADE,
    CONSTRAINT UK_dataset_user_name UNIQUE (user_name, dataset_name)
);

-- Create finetuning_job table
CREATE TABLE finetuning_job (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_name NVARCHAR(50) NOT NULL,
    base_model_id INT NOT NULL,
    dataset_id INT NOT NULL,
    job_name NVARCHAR(255),
    finetune_mode NVARCHAR(50) DEFAULT 'full' CHECK (finetune_mode IN ('full', 'qlora', 'lora', 'adapter')),
    status NVARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    learning_rate FLOAT CHECK (learning_rate > 0 AND learning_rate <= 1),
    batch_size INT CHECK (batch_size > 0),
    num_epochs INT CHECK (num_epochs > 0),
    weight_decay FLOAT CHECK (weight_decay >= 0 AND weight_decay <= 1),
    optuna_hyperparam_tuning BIT DEFAULT 0,
    pod_id NVARCHAR(255), -- Kubernetes pod identifier
    error_message NTEXT,
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_completion_time DATETIME2,
    actual_completion_time DATETIME2,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_name) REFERENCES user_account(user_name) ON DELETE CASCADE,
    FOREIGN KEY (base_model_id) REFERENCES base_model(id) ON DELETE NO ACTION,
    FOREIGN KEY (dataset_id) REFERENCES dataset(id) ON DELETE NO ACTION
);

-- Create finetuned_model table
CREATE TABLE finetuned_model (
    id INT IDENTITY(1,1) PRIMARY KEY,
    base_model_id INT NOT NULL,
    user_name NVARCHAR(50) NOT NULL,
    job_id INT NOT NULL UNIQUE,
    model_name NVARCHAR(255) NOT NULL,
    path NVARCHAR(500) NOT NULL,
    model_size_bytes BIGINT,
    performance_metrics NTEXT, -- JSON string with metrics
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (base_model_id) REFERENCES base_model(id) ON DELETE NO ACTION,
    FOREIGN KEY (user_name) REFERENCES user_account(user_name) ON DELETE NO ACTION,
    FOREIGN KEY (job_id) REFERENCES finetuning_job(id) ON DELETE CASCADE,
    CONSTRAINT UK_finetuned_model_user_name UNIQUE (user_name, model_name)
);

-- Create generate_call table
CREATE TABLE generate_call (
    id INT IDENTITY(1,1) PRIMARY KEY,
    finetuned_model_id INT NOT NULL,
    user_name NVARCHAR(50) NOT NULL,
    prompt NTEXT NOT NULL,
    generated_sequence NTEXT,
    generation_params NTEXT, -- JSON string with generation parameters
    execution_time_ms INT,
    tokens_generated INT,
    cost_credits DECIMAL(10,4),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (finetuned_model_id) REFERENCES finetuned_model(id) ON DELETE CASCADE,
    FOREIGN KEY (user_name) REFERENCES user_account(user_name) ON DELETE NO ACTION
);

-- Create indexes for better performance
CREATE INDEX IX_dataset_user_name ON dataset(user_name);
CREATE INDEX IX_dataset_created_at ON dataset(created_at);

CREATE INDEX IX_finetuning_job_user_name ON finetuning_job(user_name);
CREATE INDEX IX_finetuning_job_status ON finetuning_job(status);
CREATE INDEX IX_finetuning_job_created_at ON finetuning_job(created_at);
CREATE INDEX IX_finetuning_job_base_model ON finetuning_job(base_model_id);

CREATE INDEX IX_finetuned_model_user_name ON finetuned_model(user_name);
CREATE INDEX IX_finetuned_model_base_model ON finetuned_model(base_model_id);
CREATE INDEX IX_finetuned_model_created_at ON finetuned_model(created_at);

CREATE INDEX IX_generate_call_user_name ON generate_call(user_name);
CREATE INDEX IX_generate_call_model ON generate_call(finetuned_model_id);
CREATE INDEX IX_generate_call_created_at ON generate_call(created_at);

GO

-- Create triggers for updated_at timestamps
CREATE TRIGGER TR_user_account_updated_at
ON user_account
AFTER UPDATE
AS
BEGIN
    UPDATE user_account 
    SET updated_at = GETUTCDATE()
    FROM user_account u
    INNER JOIN inserted i ON u.user_name = i.user_name;
END;

GO

CREATE TRIGGER TR_base_model_updated_at
ON base_model
AFTER UPDATE
AS
BEGIN
    UPDATE base_model 
    SET updated_at = GETUTCDATE()
    FROM base_model b
    INNER JOIN inserted i ON b.id = i.id;
END;

GO

CREATE TRIGGER TR_dataset_updated_at
ON dataset
AFTER UPDATE
AS
BEGIN
    UPDATE dataset 
    SET updated_at = GETUTCDATE()
    FROM dataset d
    INNER JOIN inserted i ON d.id = i.id;
END;

GO

CREATE TRIGGER TR_finetuning_job_updated_at
ON finetuning_job
AFTER UPDATE
AS
BEGIN
    UPDATE finetuning_job 
    SET updated_at = GETUTCDATE()
    FROM finetuning_job f
    INNER JOIN inserted i ON f.id = i.id;
END;

GO

CREATE TRIGGER TR_finetuned_model_updated_at
ON finetuned_model
AFTER UPDATE
AS
BEGIN
    UPDATE finetuned_model 
    SET updated_at = GETUTCDATE()
    FROM finetuned_model f
    INNER JOIN inserted i ON f.id = i.id;
END;

GO

PRINT 'Database schema created successfully!';