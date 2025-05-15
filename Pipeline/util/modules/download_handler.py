import io
import json
import zipfile
from datetime import datetime
from typing import Dict, Any, List
from flask import send_file

from util.reports.report_generator import ReportGenerator
from util.utils.file_formatter import FileFormatter

class DownloadHandler:
    def __init__(self):
        self.report_generator = ReportGenerator()
        self.file_formatter = FileFormatter()

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
            # Create a report directory
            report_dir = "report"
            
            # Generate summary report for all items
            summary_report = self.report_generator.generate_multiple_items_report(items)
            zipf.writestr(f"{report_dir}/summary_report.txt", summary_report)
            
            # Process each item
            for idx, item in enumerate(items, start=1):
                # Create item-specific directory
                item_dir = f"item_{idx}"
                
                # Get item type and data
                typ = item.get('outputType')
                data = item.get('data', {})
                
                if typ == 'sequence':
                    # Handle sequence data
                    if data.get('sequence'):
                        # Create FASTA file
                        sequence_name = data.get('sequence_name') or f'seq{str(idx)}'
                        fasta = f">{sequence_name}\n{data.get('sequence')}\n"
                        zipf.writestr(f"{item_dir}/sequence.fasta", fasta)
                        
                        # Create sequence report
                        seq_report = self.report_generator.generate_sequence_report(data)
                        zipf.writestr(f"{item_dir}/sequence_report.txt", seq_report)
                
                elif typ == 'structure':
                    # Handle structure data
                    if data.get('pdb_file'):
                        pdb_path = os.path.join(STATIC_PDB_DIR, os.path.basename(data.get('pdb_file')))
                        if os.path.exists(pdb_path):
                            zipf.write(pdb_path, f"{item_dir}/structure.pdb")
                            
                            # Create structure report
                            struct_report = self.report_generator.generate_structure_report(data)
                            zipf.writestr(f"{item_dir}/structure_report.txt", struct_report)
                
                elif typ == 'results':
                    # Handle search results
                    if isinstance(data.get('results'), dict):
                        results = data['results']
                        
                        # Generate results report
                        results_report = self.report_generator.generate_search_report(
                            results, 
                            data.get('search_type', 'unknown')
                        )
                        zipf.writestr(f"{item_dir}/results_report.txt", results_report)
                        
                        # Process MSA sequences
                        if results.get('msa', {}).get('sequences'):
                            msa_content = self.file_formatter.format_fasta_sequences(results['msa']['sequences'])
                            zipf.writestr(f"{item_dir}/msa_sequences.fasta", msa_content)
                        
                        # Process alignments
                        if results.get('alignments', {}).get('databases'):
                            for db_name, db_data in results['alignments']['databases'].items():
                                hits_csv = self.file_formatter.generate_hits_csv(db_data['hits'])
                                zipf.writestr(f"{item_dir}/{db_name}_hits.csv", hits_csv)
                        
                        # Add original results
                        zipf.writestr(f"{item_dir}/original_results.json", json.dumps(results, indent=2))
                
                # Add item metadata
                metadata = {
                    'type': typ,
                    'timestamp': datetime.now().isoformat(),
                    'description': data.get('description', '')
                }
                zipf.writestr(f"{item_dir}/metadata.json", json.dumps(metadata, indent=2))
        
        zip_buffer.seek(0)
        return zip_buffer

    def send_zip_file(self, zip_buffer: io.BytesIO, filename: str) -> Any:
        """Send a zip file as a download response."""
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=filename
        ) 