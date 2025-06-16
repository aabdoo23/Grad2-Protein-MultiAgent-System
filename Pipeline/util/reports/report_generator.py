from datetime import datetime
from typing import Dict, Any, List
import os

class ReportGenerator:
    @staticmethod
    def generate_search_report(results: Dict[str, Any], search_type: str) -> str:
        """Generate a text report for search results."""
        report = []
        report.append("=" * 80)
        report.append(f"Search Results Report - {search_type.upper()}")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("\n")
        
        # Add metadata
        if results.get('metadata'):
            report.append("Metadata:")
            report.append(f"  Search Type: {results['metadata'].get('search_type', 'Unknown')}")
            report.append(f"  Query Length: {results['metadata'].get('query_info', {}).get('length', 'Unknown')}")
            report.append("\n")
        
        # Add MSA summary
        if results.get('msa', {}).get('sequences'):
            report.append("Multiple Sequence Alignment Summary:")
            report.append(f"  Total Sequences: {len(results['msa']['sequences'])}")
            report.append("\n")
        
        # Add database summaries
        if results.get('alignments', {}).get('databases'):
            report.append("Database Summaries:")
            for db_name, db_data in results['alignments']['databases'].items():
                report.append(f"\n{db_name.upper()}:")
                report.append(f"  Total Hits: {db_data.get('total_hits', 0)}")
                if db_data.get('hits'):
                    avg_identity = sum(hit.get('identity', 0) for hit in db_data['hits']) / len(db_data['hits'])
                    report.append(f"  Average Identity: {avg_identity:.2f}%")
                    report.append(f"  Best Hit: {db_data['hits'][0].get('description', 'Unknown')}")
                    report.append(f"  Best Identity: {db_data['hits'][0].get('identity', 0):.2f}%")
        
        return "\n".join(report)

    @staticmethod
    def generate_html_report(results: Dict[str, Any], search_type: str) -> str:
        """Generate an HTML report for search results."""
        html = []
        html.append("<!DOCTYPE html>")
        html.append("<html>")
        html.append("<head>")
        html.append("<title>Search Results Report</title>")
        html.append("<style>")
        html.append("body { font-family: Arial, sans-serif; margin: 20px; }")
        html.append("table { border-collapse: collapse; width: 100%; }")
        html.append("th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }")
        html.append("th { background-color: #f2f2f2; }")
        html.append("tr:nth-child(even) { background-color: #f9f9f9; }")
        html.append("</style>")
        html.append("</head>")
        html.append("<body>")
        
        # Add header
        html.append(f"<h1>Search Results Report - {search_type.upper()}</h1>")
        html.append(f"<p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>")
        
        # Add metadata section
        if results.get('metadata'):
            html.append("<h2>Metadata</h2>")
            html.append("<table>")
            html.append("<tr><th>Property</th><th>Value</th></tr>")
            html.append(f"<tr><td>Search Type</td><td>{results['metadata'].get('search_type', 'Unknown')}</td></tr>")
            html.append(f"<tr><td>Query Length</td><td>{results['metadata'].get('query_info', {}).get('length', 'Unknown')}</td></tr>")
            html.append("</table>")
        
        # Add database sections
        if results.get('alignments', {}).get('databases'):
            for db_name, db_data in results['alignments']['databases'].items():
                html.append(f"<h2>{db_name.upper()} Results</h2>")
                html.append("<table>")
                html.append("<tr><th>Hit</th><th>Description</th><th>Identity</th><th>Score</th><th>E-value</th></tr>")
                
                for hit in db_data.get('hits', []):
                    html.append("<tr>")
                    html.append(f"<td>{hit.get('accession', 'Unknown')}</td>")
                    html.append(f"<td>{hit.get('description', 'Unknown')}</td>")
                    html.append(f"<td>{hit.get('identity', 0):.2f}%</td>")
                    html.append(f"<td>{hit.get('score', 0)}</td>")
                    html.append(f"<td>{hit.get('evalue', 0)}</td>")
                    html.append("</tr>")
                
                html.append("</table>")
        
        html.append("</body>")
        html.append("</html>")
        
        return "\n".join(html)

    @staticmethod
    def generate_multiple_items_report(items: List[Dict[str, Any]]) -> str:
        """Generate a summary report for multiple items."""
        report = []
        report.append("Multiple Items Download Report")
        report.append("=" * 30)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Total Items: {len(items)}")
        report.append("\nItems Summary:")
        report.append("-" * 20)
        
        for idx, item in enumerate(items, start=1):
            typ = item.get('outputType', 'unknown')
            data = item.get('data', {})
            report.append(f"\nItem {idx}:")
            report.append(f"Type: {typ}")
            if data.get('description'):
                report.append(f"Description: {data['description']}")
        
        return "\n".join(report)

    @staticmethod
    def generate_sequence_report(data: Dict[str, Any]) -> str:
        """Generate a report for a sequence item."""
        report = []
        report.append("=" * 80)
        report.append("Sequence Report")
        report.append("=" * 80)
        report.append(f"Name: {data.get('sequence_name', 'Unknown')}")
        report.append(f"Length: {len(data.get('sequence', ''))}")
        report.append(f"Description: {data.get('description', 'No description available')}")
        return "\n".join(report)

    @staticmethod
    def generate_structure_report(data: Dict[str, Any]) -> str:
        """Generate a report for a structure item."""
        report = []
        report.append("=" * 80)
        report.append("Structure Report")
        report.append("=" * 80)
        report.append(f"File: {data.get('pdb_file', 'Unknown')}")
        report.append(f"Description: {data.get('metrics', 'No description available')}")
        return "\n".join(report)

    def generate_database_report(self, data: Dict[str, Any]) -> str:
        """Generate a report for a BLAST database."""
        report = []
        report.append("BLAST Database Report")
        report.append("=" * 30)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if data.get('database'):
            db_info = data['database']
            report.append(f"\nDatabase Name: {db_info.get('name', 'Unknown')}")
            report.append(f"Database Path: {db_info.get('path', 'Unknown')}")
            
            # Add file sizes
            db_path = db_info.get('path')
            if db_path:
                total_size = 0
                for ext in ['.phr', '.pin', '.psq']:
                    file_path = f"{db_path}{ext}"
                    if os.path.exists(file_path):
                        size = os.path.getsize(file_path)
                        total_size += size
                        report.append(f"{ext[1:].upper()} File Size: {self._format_size(size)}")
                report.append(f"Total Database Size: {self._format_size(total_size)}")
        
        return "\n".join(report)

    def generate_fasta_report(self, data: Dict[str, Any]) -> str:
        """Generate a report for a FASTA file."""
        report = []
        report.append("FASTA File Report")
        report.append("=" * 30)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if data.get('fasta_file'):
            fasta_path = data['fasta_file']
            if os.path.exists(fasta_path):
                report.append(f"\nFile Path: {fasta_path}")
                report.append(f"File Size: {self._format_size(os.path.getsize(fasta_path))}")
                
                # Count sequences
                try:
                    with open(fasta_path, 'r') as f:
                        sequence_count = sum(1 for line in f if line.startswith('>'))
                    report.append(f"Number of Sequences: {sequence_count}")
                except Exception as e:
                    report.append(f"Error counting sequences: {str(e)}")
        
        return "\n".join(report)

    @staticmethod
    def generate_docking_report(data: Dict[str, Any]) -> str:
        """Generate a summary report for docking results."""
        report_lines = []
        report_lines.append("=" * 80)
        report_lines.append("Docking Results Summary Report")
        report_lines.append("=" * 80)
        report_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        output_dir = data.get('output_dir')
        if output_dir:
            report_lines.append(f"Output Directory: {output_dir}")
        
        output_files = data.get('output_files', {})
        if output_files:
            report_lines.append("\nKey Output Files:")
            report_lines.append(f"  Protein PDBQT: {output_files.get('protein_pdbqt', 'N/A')}")
            report_lines.append(f"  Ligand PDBQT: {output_files.get('ligand_pdbqt', 'N/A')}")
            report_lines.append(f"  All Poses PDBQT: {output_files.get('all_poses_pdbqt', 'N/A')}")
            report_lines.append(f"  Log File: {output_files.get('log_file', 'N/A')}")
            report_lines.append(f"  Configuration File: {output_files.get('config_file', 'N/A')}")

        docking_poses = data.get('docking_poses', [])
        if docking_poses:
            report_lines.append("\nDocking Poses Summary:")
            report_lines.append("-" * 30)
            report_lines.append(f"Total Poses Generated: {len(docking_poses)}")
            
            # Sort poses by affinity (best first)
            sorted_poses = sorted(docking_poses, key=lambda p: p.get('affinity', 0))
            
            report_lines.append("\nTop Poses (Sorted by Affinity):")
            for i, pose in enumerate(sorted_poses[:5]): # Display top 5 or fewer
                report_lines.append(f"  Mode {pose.get('mode', 'N/A')}:")
                report_lines.append(f"    Affinity: {pose.get('affinity', 'N/A')} kcal/mol")
                report_lines.append(f"    RMSD L.B.: {pose.get('rmsd_lb', 'N/A')} Å")
                report_lines.append(f"    RMSD U.B.: {pose.get('rmsd_ub', 'N/A')} Å")
                report_lines.append(f"    Complex PDB: {os.path.basename(pose.get('complex_pdb_file', 'N/A'))}")
                report_lines.append(f"    Ligand PDB: {os.path.basename(pose.get('ligand_pdb_file', 'N/A'))}")
        else:
            report_lines.append("\nNo docking poses information available.")
        
        report_lines.append("\n" + "=" * 80)
        return "\n".join(report_lines)

    @staticmethod
    def generate_ramachandran_report(data: Dict[str, Any]) -> str:
        """Generate a text report for Ramachandran plot analysis."""
        report = []
        report.append("=" * 80)
        report.append("Ramachandran Plot Analysis Report")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("\n")
        
        # Basic information
        pdb_file = data.get('pdb_file', 'Unknown')
        report.append(f"PDB File: {os.path.basename(pdb_file)}")
        report.append(f"Timestamp: {data.get('timestamp', 'Unknown')}")
        report.append(f"Total Residues Analyzed: {data.get('residue_count', 0)}")
        report.append("\n")
        
        # Secondary structure statistics
        statistics = data.get('statistics', {})
        if statistics:
            report.append("Secondary Structure Distribution:")
            report.append(f"  Alpha Helix: {statistics.get('alpha_helix', 0)} residues ({statistics.get('alpha_percentage', 0):.1f}%)")
            report.append(f"  Beta Sheet: {statistics.get('beta_sheet', 0)} residues ({statistics.get('beta_percentage', 0):.1f}%)")
            report.append(f"  Other/Extended: {statistics.get('other', 0)} residues ({statistics.get('other_percentage', 0):.1f}%)")
            report.append("\n")
        
        # Analysis summary
        report.append("Analysis Summary:")
        report.append("The Ramachandran plot shows the distribution of phi and psi dihedral angles")
        report.append("for each amino acid residue in the protein backbone. This analysis helps")
        report.append("assess the stereochemical quality of the protein structure.")
        report.append("\n")
        
        # Interpretation
        alpha_pct = statistics.get('alpha_percentage', 0)
        beta_pct = statistics.get('beta_percentage', 0)
        other_pct = statistics.get('other_percentage', 0)
        
        report.append("Interpretation:")
        if alpha_pct > 50:
            report.append("  - High alpha-helical content suggests a predominantly helical structure")
        elif beta_pct > 30:
            report.append("  - Significant beta-sheet content indicates extended strand regions")
        
        if other_pct > 20:
            report.append("  - High percentage of 'other' conformations may indicate:")
            report.append("    * Flexible loops and turns")
            report.append("    * Potential structural irregularities")
            report.append("    * Need for further structural validation")
        
        report.append("\n")
        report.append("Files included:")
        report.append("  - ramachandran_plot.png: Visual representation of phi/psi angles")
        report.append("  - ramachandran_data.json: Complete analysis data")
        report.append("  - phi_psi_angles.csv: Tabular data of all dihedral angles")
        
        return "\n".join(report)

    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"