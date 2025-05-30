import io
import json
import zipfile
import shutil
from datetime import datetime
from typing import Dict, Any, List
from flask import send_file
import os

from util.reports.report_generator import ReportGenerator
from util.utils.file_formatter import FileFormatter

class DownloadHandler:
    def __init__(self):
        self.report_generator = ReportGenerator()
        self.file_formatter = FileFormatter()
        self.STATIC_PDB_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'pdb_files')

    def create_search_results_zip(self, results: Dict[str, Any], search_type: str) -> io.BytesIO:
        """Create a zip file containing search results and reports."""
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Create a report directory
            report_dir = "report"
            
            # Generate summary report
            report_content = self.report_generator.generate_search_report(results, search_type)
            zip_file.writestr(f"{report_dir}/summary_report.txt", report_content)
            
            # Generate HTML report
            html_report = self.report_generator.generate_html_report(results, search_type)
            zip_file.writestr(f"{report_dir}/detailed_report.html", html_report)
            
            # Process MSA sequences
            if results.get('msa', {}).get('sequences'):
                msa_dir = "msa"
                # Create FASTA files for each database
                for db_name, sequences in self.file_formatter.group_sequences_by_database(results['msa']['sequences']).items():
                    fasta_content = self.file_formatter.format_fasta_sequences(sequences)
                    zip_file.writestr(f"{msa_dir}/{db_name}_sequences.fasta", fasta_content)
                
                # Create a combined FASTA file
                all_sequences = self.file_formatter.format_fasta_sequences(results['msa']['sequences'])
                zip_file.writestr(f"{msa_dir}/all_sequences.fasta", all_sequences)
            
            # Process alignments
            if results.get('alignments', {}).get('databases'):
                alignments_dir = "alignments"
                for db_name, db_data in results['alignments']['databases'].items():
                    # Create a CSV file with hit information
                    hits_csv = self.file_formatter.generate_hits_csv(db_data['hits'])
                    zip_file.writestr(f"{alignments_dir}/{db_name}_hits.csv", hits_csv)
                    
                    # Create detailed alignment files
                    for hit in db_data['hits']:
                        alignment_content = self.file_formatter.format_alignment_details(hit)
                        zip_file.writestr(
                            f"{alignments_dir}/{db_name}/{hit['id']}_alignment.txt",
                            alignment_content
                        )
            
            # Add the original results as JSON for reference
            results_json = json.dumps(results, indent=2)
            zip_file.writestr("original_results.json", results_json)
        
        zip_buffer.seek(0)
        return zip_buffer

    def create_multiple_items_zip(self, items: List[Dict[str, Any]]) -> io.BytesIO:
        """Create a zip file containing multiple items with their reports."""
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            report_dir = "report"
            summary_report = self.report_generator.generate_multiple_items_report(items)
            zipf.writestr(f"{report_dir}/summary_report.txt", summary_report)
            
            for idx, item in enumerate(items, start=1):
                typ = item.get('outputType') # This is often the input handle name from the frontend connection
                data = item.get('data', {})
                # Determine a more specific item type if possible, e.g., from data structure
                item_specific_type = typ 
                if 'docking_poses' in data and 'output_dir' in data: # Check for docking result structure
                    item_specific_type = 'docking_results'
                
                item_dir_name = f"item_{idx}_{item_specific_type}"

                if item_specific_type == 'docking_results':
                    docking_output_dir = data.get('output_dir')
                    if docking_output_dir and os.path.isdir(docking_output_dir):
                        # Add all files from the docking output directory to the zip
                        for root, _, files in os.walk(docking_output_dir):
                            for file in files:
                                file_path = os.path.join(root, file)
                                # arcname is the path inside the zip file
                                arcname = os.path.join(item_dir_name, os.path.relpath(file_path, docking_output_dir))
                                zipf.write(file_path, arcname)
                        # Optionally, add a report for the docking results
                        docking_report = self.report_generator.generate_docking_report(data) # Assume this method exists
                        zipf.writestr(f"{item_dir_name}/docking_summary_report.txt", docking_report)
                    else:
                        print(f"Docking output directory not found or is not a directory: {docking_output_dir}")
                        zipf.writestr(f"{item_dir_name}/error.txt", f"Docking output directory not found: {docking_output_dir}")
                
                elif typ == 'sequence':
                    # Handle sequence data
                    if data.get('sequence'):
                        # Create FASTA file
                        sequence_name = data.get('sequence_name') or f'seq{str(idx)}'
                        fasta = f">{sequence_name}\n{data.get('sequence')}\n"
                        zipf.writestr(f"{item_dir_name}/sequence.fasta", fasta)
                        
                        # Create sequence report
                        seq_report = self.report_generator.generate_sequence_report(data)
                        zipf.writestr(f"{item_dir_name}/sequence_report.txt", seq_report)
                
                elif typ == 'structure':
                    # Handle structure data
                    if data.get('pdb_file'):
                        pdb_path = data.get('pdb_file')
                        if os.path.exists(pdb_path):
                            zipf.write(pdb_path, f"{item_dir_name}/structure.pdb")
                            
                            # Create structure report
                            struct_report = self.report_generator.generate_structure_report(data)
                            zipf.writestr(f"{item_dir_name}/structure_report.txt", struct_report)
                
                elif typ == 'results':
                    # Handle search results
                    if isinstance(data.get('results'), dict):
                        results_data = data['results']
                        
                        # Generate results report
                        results_report = self.report_generator.generate_search_report(
                            results_data, 
                            data.get('search_type', 'unknown_search')
                        )
                        zipf.writestr(f"{item_dir_name}/results_report.txt", results_report)
                        
                        # Process MSA sequences
                        if results_data.get('msa', {}).get('sequences'):
                            msa_content = self.file_formatter.format_fasta_sequences(results_data['msa']['sequences'])
                            zipf.writestr(f"{item_dir_name}/msa_sequences.fasta", msa_content)
                        
                        # Process alignments
                        if results_data.get('alignments', {}).get('databases'):
                            for db_name, db_data in results_data['alignments']['databases'].items():
                                hits_csv = self.file_formatter.generate_hits_csv(db_data['hits'])
                                zipf.writestr(f"{item_dir_name}/{db_name}_hits.csv", hits_csv)
                        
                        # Add original results
                        zipf.writestr(f"{item_dir_name}/original_results.json", json.dumps(results_data, indent=2))

                elif typ == 'database':
                    # Handle BLAST database files
                    if data.get('database'):
                        db_info = data['database']
                        db_path_base = db_info.get('path')
                        # Assuming db_path_base is the path to one of the db files (e.g. .pdb or .phr)
                        # and the actual db files are in its parent directory.
                        if db_path_base and os.path.exists(os.path.dirname(db_path_base)):
                            db_dir_to_zip = os.path.dirname(db_path_base)
                            for root, _, files_in_db_dir in os.walk(db_dir_to_zip):
                                for file_in_db in files_in_db_dir:
                                    # Only add files that belong to this specific BLAST database, 
                                    # using the db_name from db_info as part of the check.
                                    # This avoids zipping other unrelated dbs if they are in the same root folder.
                                    if file_in_db.startswith(db_info.get('name')):
                                        file_path_to_add = os.path.join(root, file_in_db)
                                        arcname = os.path.join(item_dir_name, os.path.relpath(file_path_to_add, db_dir_to_zip))
                                        zipf.write(file_path_to_add, arcname)
                            db_report = self.report_generator.generate_database_report(data)
                            zipf.writestr(f"{item_dir_name}/database_report.txt", db_report)
                        else:
                            print(f"Database directory not found based on path {db_path_base}")
                            zipf.writestr(f"{item_dir_name}/error.txt", f"Database directory not found for {db_path_base}")

                elif typ == 'fasta':
                    # Handle FASTA files
                    if data.get('fasta_file'):
                        fasta_path = data['fasta_file']
                        if os.path.exists(fasta_path):
                            zipf.write(fasta_path, f"{item_dir_name}/sequences.fasta")
                            
                            # Create FASTA report
                            fasta_report = self.report_generator.generate_fasta_report(data)
                            zipf.writestr(f"{item_dir_name}/fasta_report.txt", fasta_report)
                
                else: # Fallback for unknown types or types not requiring special file handling
                    if data:
                         zipf.writestr(f"{item_dir_name}/data.json", json.dumps(data, indent=2))
                    else:
                        zipf.writestr(f"{item_dir_name}/info.txt", f"Item type '{typ}' had no specific data to zip.")

                metadata = {
                    'type': item_specific_type,
                    'original_input_type': typ, # Keep original type for reference
                    'timestamp': datetime.now().isoformat(),
                    'description': data.get('description', '')
                }
                zipf.writestr(f"{item_dir_name}/metadata.json", json.dumps(metadata, indent=2))
        
        zip_buffer.seek(0)
        return zip_buffer

    def send_zip_file(self, zip_buffer: io.BytesIO, filename: str, download_settings: Dict[str, Any] = None) -> Any:
        """Send a zip file as a download response and optionally save it to a specified location."""
        if download_settings and download_settings.get('autoSave') and download_settings.get('location'):
            try:
                # Ensure the download directory exists
                os.makedirs(download_settings['location'], exist_ok=True)
                
                # Save the zip file to the specified location
                save_path = os.path.join(download_settings['location'], filename)
                with open(save_path, 'wb') as f:
                    f.write(zip_buffer.getvalue())
                
                # Reset the buffer position for the response
                zip_buffer.seek(0)
            except Exception as e:
                print(f"Error saving file to {download_settings['location']}: {str(e)}")
        
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=filename
        ) 