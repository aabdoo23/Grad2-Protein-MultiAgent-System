from datetime import datetime
from typing import Dict, Any, List

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
        report.append("=" * 80)
        report.append("Multiple Items Download Report")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("\n")
        
        for idx, item in enumerate(items, start=1):
            report.append(f"Item {idx} {item.get('outputType')}:")
            report.append("-" * 40)
            
            # Get item type and data
            item_type = item.get('outputType', 'Unknown')
            data = item.get('data', {})
            results = data.get('results', {})
            search_type = data.get('search_type', 'unknown')
            
            # Basic item information
            report.append(f"Type: {item_type}")
            if data.get('description'):
                report.append(f"Description: {data['description']}")
            report.append(f"Search Type: {search_type.upper()}")
            
            # Add results summary if available
            if results:
                report.append("\nResults Summary:")
                
                # Add metadata if available
                if results.get('metadata'):
                    metadata = results['metadata']
                    report.append(f"  Query Length: {metadata.get('query_info', {}).get('length', 'Unknown')}")
                    report.append(f"  Timestamp: {metadata.get('timestamp', 'Unknown')}")
                
                # Add MSA summary if available
                if results.get('msa', {}).get('sequences'):
                    msa = results['msa']
                    report.append(f"  Total Sequences: {len(msa['sequences'])}")
                    
                    # Group sequences by database
                    db_counts = {}
                    for seq in msa['sequences']:
                        db = seq.get('database', 'unknown')
                        db_counts[db] = db_counts.get(db, 0) + 1
                    
                    report.append("  Sequences by Database:")
                    for db, count in db_counts.items():
                        report.append(f"    - {db}: {count} sequences")
                
                # Add database summaries
                if results.get('alignments', {}).get('databases'):
                    report.append("\n  Database Summaries:")
                    for db_name, db_data in results['alignments']['databases'].items():
                        report.append(f"\n    {db_name.upper()}:")
                        report.append(f"      Total Hits: {db_data.get('total_hits', 0)}")
                        
                        if db_data.get('hits'):
                            hits = db_data['hits']
                            # Calculate statistics
                            avg_identity = sum(hit.get('identity', 0) for hit in hits) / len(hits)
                            best_hit = max(hits, key=lambda x: x.get('identity', 0))
                            worst_hit = min(hits, key=lambda x: x.get('identity', 0))
                            
                            report.append(f"      Average Identity: {avg_identity:.2f}%")
                            report.append(f"      Best Hit: {best_hit.get('description', 'Unknown')}")
                            report.append(f"      Best Identity: {best_hit.get('identity', 0):.2f}%")
                            report.append(f"      Worst Identity: {worst_hit.get('identity', 0):.2f}%")
                            
                            # Add score statistics if available
                            if hits[0].get('score') is not None:
                                avg_score = sum(hit.get('score', 0) for hit in hits) / len(hits)
                                best_score = max(hits, key=lambda x: x.get('score', 0))
                                report.append(f"      Average Score: {avg_score:.2f}")
                                report.append(f"      Best Score: {best_score.get('score', 0)}")
            
            report.append("\n")  # Add extra newline between items
        
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