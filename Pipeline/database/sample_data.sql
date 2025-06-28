-- Sample data for testing the Protein Pipeline Finetuning Database

-- Insert sample users
INSERT INTO user_account (user_name, email, credits, full_name, hashed_password, institution) VALUES
('jdoe', 'john.doe@university.edu', 1000, 'John Doe', '$2b$12$hashedpassword1', 'University of Science'),
('asmith', 'alice.smith@research.org', 500, 'Alice Smith', '$2b$12$hashedpassword2', 'Research Institute'),
('bwilson', 'bob.wilson@biotech.com', 2000, 'Bob Wilson', '$2b$12$hashedpassword3', 'BioTech Corp'),
('admin', 'admin@protein-pipeline.com', 10000, 'System Administrator', '$2b$12$hashedpassword4', 'Protein Pipeline Inc');

-- Insert sample base models
INSERT INTO base_model (path, model_name, number_of_parameters, model_type, description) VALUES
('/models/esm2_t33_650M_UR50D', 'ESM-2 650M', 650000000, 'transformer', 'Meta AI ESM-2 protein language model with 650M parameters'),
('/models/esm2_t36_3B_UR50D', 'ESM-2 3B', 3000000000, 'transformer', 'Meta AI ESM-2 protein language model with 3B parameters'),
('/models/protbert', 'ProtBERT', 420000000, 'transformer', 'BERT-based protein sequence model'),
('/models/ankh', 'Ankh', 450000000, 'transformer', 'Ankh protein language model'),
('/models/progen2_small', 'ProGen2-small', 151000000, 'transformer', 'ProGen2 small model for protein generation');

-- Insert sample datasets
INSERT INTO dataset (path, user_name, dataset_name, number_of_sequences, dataset_size_bytes, dataset_type, description) VALUES
('/datasets/pfam_kinases.fasta', 'jdoe', 'Kinase Proteins', 15000, 25600000, 'protein', 'Protein kinase sequences from Pfam database'),
('/datasets/antibody_sequences.fasta', 'asmith', 'Antibody Dataset', 8500, 18200000, 'protein', 'Heavy and light chain antibody sequences'),
('/datasets/membrane_proteins.fasta', 'bwilson', 'Membrane Proteins', 12000, 31400000, 'protein', 'Transmembrane protein sequences'),
('/datasets/enzymes_ec1.fasta', 'jdoe', 'EC1 Enzymes', 22000, 45800000, 'protein', 'Oxidoreductase enzyme sequences'),
('/datasets/signal_peptides.fasta', 'asmith', 'Signal Peptides', 5000, 8500000, 'protein', 'Signal peptide sequences for subcellular targeting');

-- Insert sample finetuning jobs
INSERT INTO finetuning_job (user_name, base_model_id, dataset_id, job_name, finetune_mode, status, learning_rate, batch_size, num_epochs, optuna_hyperparam_tuning) VALUES
('jdoe', 1, 1, 'Kinase-ESM2-650M', 'qlora', 'completed', 0.0001, 16, 10, 0),
('asmith', 2, 2, 'Antibody-ESM2-3B', 'lora', 'running', 0.00005, 8, 15, 0),
('bwilson', 3, 3, 'Membrane-ProtBERT', 'full', 'pending', NULL, NULL, NULL, 1),
('jdoe', 4, 4, 'Enzyme-Ankh', 'qlora', 'failed', 0.0002, 32, 5, 0),
('asmith', 5, 5, 'SignalPep-ProGen2', 'adapter', 'completed', 0.0001, 24, 8, 0);

-- Update some jobs with completion details
UPDATE finetuning_job SET 
    progress_percentage = 100.0,
    actual_completion_time = DATEADD(hour, -2, GETUTCDATE()),
    pod_id = 'finetune-pod-001'
WHERE id = 1;

UPDATE finetuning_job SET 
    progress_percentage = 65.0,
    estimated_completion_time = DATEADD(hour, 3, GETUTCDATE()),
    pod_id = 'finetune-pod-002'
WHERE id = 2;

UPDATE finetuning_job SET 
    progress_percentage = 0.0,
    error_message = 'CUDA out of memory error during training'
WHERE id = 4;

UPDATE finetuning_job SET 
    progress_percentage = 100.0,
    actual_completion_time = DATEADD(day, -1, GETUTCDATE()),
    pod_id = 'finetune-pod-003'
WHERE id = 5;

-- Insert sample finetuned models (only for completed jobs)
INSERT INTO finetuned_model (base_model_id, user_name, job_id, model_name, path, model_size_bytes, performance_metrics) VALUES
(1, 'jdoe', 1, 'Kinase-ESM2-650M-v1', '/models/finetuned/jdoe_kinase_esm2_650m_v1', 650000000, '{"perplexity": 2.45, "accuracy": 0.87, "f1_score": 0.82}'),
(5, 'asmith', 5, 'SignalPep-ProGen2-v1', '/models/finetuned/asmith_signalpep_progen2_v1', 151000000, '{"perplexity": 3.12, "accuracy": 0.91, "f1_score": 0.89}');

-- Insert sample generation calls
INSERT INTO generate_call (finetuned_model_id, user_name, prompt, generated_sequence, generation_params, execution_time_ms, tokens_generated, cost_credits) VALUES
(1, 'jdoe', 'Generate a kinase protein sequence', 'MKVLVFPGDGIGPEIAKQVHAKGLGVGRAAIDASKGMRVIVSLPKSDAELIHLPGERINVVELSRSDAKRYLRELEEFGYQKLLERTAIPGSKIGVATRPGSMLPKGRQFCVNVKRKLQHKVLNLLCPGDGIFEIRARAFCGLSLIAEAYDLLRGHPSTLRFPGDGKKSLEEFGHQAVVGLTPRQRPLAVQQNEGAGGLP', '{"temperature": 0.8, "max_length": 200, "top_p": 0.9}', 1500, 150, 0.50),
(2, 'asmith', 'Generate a signal peptide for mitochondrial targeting', 'MLSLRQSIRFFKPATRTLCSSRYLL', '{"temperature": 0.7, "max_length": 50, "top_p": 0.85}', 800, 25, 0.10),
(1, 'jdoe', 'Create a novel serine/threonine kinase', 'MKVLKPDGIDVEIPAGVHARRGVGTRAVDSPKGERVIVSLPQMKTLMLLQRERIDVVELSKSDAKQYLRELEEFGYHKLLERTSIPGSRIGVATRPGSMLPKGRQFCVNVKRKLQHKVLNLLCPGDGIFEIRARAFCGLSLIAEAYDLLRGHPSTLRFPGDGKKSLEEFGHQAVVGLTPRQRPLAVQQNEGAGGLP', '{"temperature": 0.75, "max_length": 250, "top_p": 0.9}', 2100, 180, 0.75);

PRINT 'Sample data inserted successfully!';
