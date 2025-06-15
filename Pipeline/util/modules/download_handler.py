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
            
            # --- Enhanced Summary Report Logic ---
            base_summary_content = self.report_generator.generate_multiple_items_report(items)
            
            additional_summary_lines = ["\n\nDetailed Item Overview:", "======================="]
            
            temp_item_specific_types = [] # To store determined specific types for reuse

            # First pass: determine specific types and gather details for the enhanced summary
            for idx, item in enumerate(items, start=1):
                typ = item.get('outputType')
                data = item.get('data', {})
                
                item_specific_type = typ  # Default
                if 'docking_poses' in data and 'output_dir' in data:  # Check for docking result structure
                    item_specific_type = 'docking_results'
                temp_item_specific_types.append(item_specific_type)

                item_dir_name_for_report = f"item_{idx}_{item_specific_type}"
                
                line = f"\nItem {idx} ({item_specific_type}): Stored in '{item_dir_name_for_report}/'"
                
                if item_specific_type == 'docking_results':
                    output_dir = data.get('output_dir', 'N/A')
                    scores = data.get('scores')
                    best_affinity = 'N/A'
                    if isinstance(scores, dict):
                        best_affinity = scores.get('best_affinity', 'N/A')
                    line += f" - Docking: Results from '{os.path.basename(output_dir) if output_dir != 'N/A' else 'N/A'}'. Best affinity: {best_affinity}."
                    line += " Files are within the item directory."
                elif typ == 'sequence':
                    sequence_name = data.get('sequence_name', f'seq{idx}')
                    sequence_len = len(data.get('sequence', ''))
                    line += f" - Sequence: '{sequence_name}', Length: {sequence_len} aa."
                elif typ == 'structure':
                    pdb_file = data.get('pdb_file', 'N/A')
                    line += f" - Structure: '{os.path.basename(pdb_file) if pdb_file != 'N/A' else 'N/A'}'."
                elif typ == 'results':
                    search_type_report = data.get('search_type', 'unknown_search')
                    num_hits_report = 0
                    results_data_report = data.get('results')
                    if isinstance(results_data_report, dict):
                        msa_data = results_data_report.get('msa', {})
                        if msa_data and 'sequences' in msa_data:
                            num_hits_report = len(msa_data.get('sequences', []))
                        elif 'alignments' in results_data_report:
                            alignments_data = results_data_report.get('alignments', {})
                            if alignments_data and 'databases' in alignments_data:
                                for db_name, db_data in alignments_data.get('databases', {}).items():
                                    num_hits_report += len(db_data.get('hits', []))
                    line += f" - Search Results ({search_type_report}): Approx. {num_hits_report} hits/sequences."
                elif typ == 'database':
                    db_info = data.get('database', {})
                    db_name = db_info.get('name', 'N/A')
                    db_path_base = db_info.get('path', 'N/A')
                    line += f" - BLAST Database: '{db_name}' (based on '{os.path.basename(db_path_base) if db_path_base != 'N/A' else 'N/A'}')."
                elif typ == 'fasta':
                    fasta_file = data.get('fasta_file', 'N/A')
                    line += f" - FASTA file: '{os.path.basename(fasta_file) if fasta_file != 'N/A' else 'N/A'}'."
                else:
                    line += f" - Generic data item. See '{item_dir_name_for_report}/data.json' or '{item_dir_name_for_report}/full_item_data.json'."
                
                additional_summary_lines.append(line)
                additional_summary_lines.append(f"  Full data for this item is in: {item_dir_name_for_report}/full_item_data.json")
                additional_summary_lines.append(f"  Individual report (if any) and files are in: {item_dir_name_for_report}/")

            enhanced_summary_content = base_summary_content + "\n".join(additional_summary_lines)
            zipf.writestr(f"{report_dir}/summary_report.txt", enhanced_summary_content)
            # --- End of Enhanced Summary Report Logic ---

            for idx, item in enumerate(items, start=1):
                typ = item.get('outputType') 
                data = item.get('data', {})
                # Use the pre-calculated item_specific_type for consistency
                item_specific_type = temp_item_specific_types[idx-1]
                
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
                
                elif typ == 'ramachandran_plot':
                    # Handle Ramachandran plot results
                    if data.get('plot_path') or data.get('data_path'):
                        # Add plot image if available
                        plot_path = data.get('plot_path')
                        if plot_path and os.path.exists(plot_path):
                            zipf.write(plot_path, f"{item_dir_name}/ramachandran_plot.png")
                        
                        # Add data JSON if available
                        data_path = data.get('data_path')
                        if data_path and os.path.exists(data_path):
                            zipf.write(data_path, f"{item_dir_name}/ramachandran_data.json")
                        
                        # Generate Ramachandran report
                        ramachandran_report = self.report_generator.generate_ramachandran_report(data)
                        zipf.writestr(f"{item_dir_name}/ramachandran_report.txt", ramachandran_report)
                        
                        # Add angle data as CSV
                        if data.get('angle_data'):
                            angle_csv = self.file_formatter.format_ramachandran_angles_csv(data['angle_data'])
                            zipf.writestr(f"{item_dir_name}/phi_psi_angles.csv", angle_csv)

                else: # Fallback for unknown types or types not requiring special file handling
                    if data:
                         zipf.writestr(f"{item_dir_name}/data.json", json.dumps(data, indent=2))
                    else:
                        zipf.writestr(f"{item_dir_name}/info.txt", f"Item type '{typ}' had no specific data to zip.")

                # Add the full item data as JSON
                zipf.writestr(f"{item_dir_name}/full_item_data.json", json.dumps(item, indent=2))

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