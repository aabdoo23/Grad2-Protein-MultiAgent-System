from typing import Dict, Any, List

class FileFormatter:
    @staticmethod
    def group_sequences_by_database(sequences: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group sequences by their database."""
        grouped = {}
        for seq in sequences:
            db = seq.get('database', 'unknown')
            if db not in grouped:
                grouped[db] = []
            grouped[db].append(seq)
        return grouped

    @staticmethod
    def format_fasta_sequences(sequences: List[Dict[str, Any]]) -> str:
        """Format sequences into FASTA format."""
        fasta = []
        for seq in sequences:
            header = f">{seq.get('name', seq.get('id', 'Unknown'))}"
            if seq.get('identity') is not None:
                header += f" [{seq['identity']:.2f}%]"
            fasta.append(header)
            fasta.append(seq.get('sequence', ''))
        return "\n".join(fasta)

    @staticmethod
    def generate_hits_csv(hits: List[Dict[str, Any]]) -> str:
        """Generate a CSV file with hit information."""
        headers = ['Accession', 'Description', 'Length', 'Identity', 'Score', 'E-value']
        rows = [headers]
        
        for hit in hits:
            row = [
                hit.get('accession', ''),
                hit.get('description', ''),
                str(hit.get('length', '')),
                f"{hit.get('identity', 0):.2f}",
                str(hit.get('score', '')),
                str(hit.get('evalue', ''))
            ]
            rows.append(row)
        
        return "\n".join(",".join(row) for row in rows)

    @staticmethod
    def format_alignment_details(hit: Dict[str, Any]) -> str:
        """Format detailed alignment information for a hit."""
        details = []
        details.append(f"Hit: {hit.get('accession', 'Unknown')}")
        details.append(f"Description: {hit.get('description', 'Unknown')}")
        details.append(f"Length: {hit.get('length', 'Unknown')}")
        details.append(f"Identity: {hit.get('identity', 0):.2f}%")
        details.append(f"Score: {hit.get('score', 'Unknown')}")
        details.append(f"E-value: {hit.get('evalue', 'Unknown')}")
        details.append("\nAlignments:")
        
        for alignment in hit.get('alignments', []):
            details.append("\nAlignment Details:")
            details.append(f"Query: {alignment.get('query_seq', '')}")
            details.append(f"Match: {alignment.get('midline', '')}")
            details.append(f"Target: {alignment.get('target_seq', '')}")
            details.append(f"Query Range: {alignment.get('query_start', '')}-{alignment.get('query_end', '')}")
            details.append(f"Target Range: {alignment.get('target_start', '')}-{alignment.get('target_end', '')}")
        
        return "\n".join(details) 