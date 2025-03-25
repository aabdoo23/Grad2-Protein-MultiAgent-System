import requests
import time

def submit_blast_search(sequence: str, program="blastp", database="nr"):
    # Submit BLAST query
    params = {
        "CMD": "Put",
        "PROGRAM": program,
        "DATABASE": database,
        "QUERY": sequence
    }
    response = requests.get("https://blast.ncbi.nlm.nih.gov/Blast.cgi", params=params)
    # Parse RID from response (this is a simplified example – you’ll need to extract the RID from the HTML/text response)
    rid = None
    for line in response.text.splitlines():
        if "RID =" in line:
            rid = line.split("=")[-1].strip()
            break
    if not rid:
        raise Exception("Failed to retrieve RID from BLAST response")
    return rid

def check_blast_status(rid: str):
    params = {
        "CMD": "Get",
        "FORMAT_OBJECT": "SearchInfo",
        "RID": rid
    }
    response = requests.get("https://blast.ncbi.nlm.nih.gov/Blast.cgi", params=params)
    return response.text

def get_blast_results(rid: str, format_type="XML"):
    params = {
        "CMD": "Get",
        "FORMAT_TYPE": format_type,
        "RID": rid
    }
    response = requests.get("https://blast.ncbi.nlm.nih.gov/Blast.cgi", params=params)
    return response.text

# Example usage:
protein_sequence = """
>test test_protein
QIKDLLVSSSTDLDTTLVLVNAIYFKGMWKTAFNAEDTREMPFHVTKQESKPVQMMCMNNSFNVATLPAEKMKILELPFASGDLSMLVLLPDEVSDLERIEKTINFEKLTEWTNPNTMEKRRVKVYLPQMKIEEKYNLTSVLMALGMTDLFIPSANLTGISSAESLKISQAVHGAFMELSEDGIEMAGSTGVIEDIKHSPESEQFRADHPFLFLIKHNPTNTIVYFGRYWSP"""
try:
    rid = submit_blast_search(protein_sequence)
    print("BLAST search submitted. RID:", rid)

    # Polling until the search is complete.
    while True:
        status_info = check_blast_status(rid)
        # print(rid)
        if "Status=READY" in status_info:
            print("BLAST search complete.")
            break
        elif "Status=WAITING" in status_info:
            print("BLAST search still running. Waiting...")
            time.sleep(10)
        else:
            print("Unexpected status:", status_info)
            break

    results_xml = get_blast_results(rid)
    print("BLAST Results (XML):")
    print(results_xml)
except Exception as e:
    print("Error during BLAST search:", e)
