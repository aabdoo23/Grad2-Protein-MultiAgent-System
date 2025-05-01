from clustalo import serviceRun, serviceGetStatus, serviceGetResult, serviceGetResultTypes
import time

def test_clustalo():
    # Your email is required
    email = "aabdoo2304@gmail.com"
    
    # Sample protein sequences in FASTA format
    sequences = """>sp|P69905|HBA_HUMAN Hemoglobin subunit alpha OS=Homo sapiens GN=HBA1 PE=1 SV=2
MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR
>sp|P02088|HBA1_HORSE Hemoglobin subunit alpha OS=Equus caballus GN=HBA1 PE=1 SV=1
MVLSGEDKSNIKAAWGKIGGHGAEYGAEALERMFASFPTTKTYFPHFDVSHGSAQVKAHGKKVADALTKAVGHLDDLPGALSALSDLHAHKLRVDPVNFKLLSHCLLVTLASHHPADFTPAVHASLDKFLANVSTVLTSKYR
>sp|P01942|HBA1_PIG Hemoglobin subunit alpha OS=Sus scrofa GN=HBA1 PE=1 SV=1
MVLSGEDKANIKAAWGKIGGHGAEYGAEALERMFASFPTTKTYFPHFDVSHGSAQVKAHGKKVADALTKAVGHLDDLPGALSALSDLHAHKLRVDPVNFKLLSHCLLVTLASHHPADFTPAVHASLDKFLANVSTVLTSKYR"""

    # Parameters for the alignment
    params = {
        'email': email,
        'sequence': sequences,
        'outfmt': 'clustal_num',
        'stype': 'protein',
        'dealign': 'false',
        'guidetreeout': 'true',
        'mbed': 'true',
        'mbediteration': 'true'
    }

    print("Submitting job to Clustal Omega...")
    job_id = serviceRun(email, None, params)
    print(f"Job ID: {job_id}")

    # Wait for job to complete
    print("Waiting for job to complete...")
    status = "RUNNING"
    while status == "RUNNING":
        status = serviceGetStatus(job_id)
        print(f"Status: {status}")
        if status == "ERROR":
            print("Job failed")
            return
        if status != "FINISHED":
            time.sleep(5)  # Wait 5 seconds between checks

    # Get available result types
    print("\nAvailable result types:")
    result_types = serviceGetResultTypes(job_id)
    for result_type in result_types:
        print(f"- {result_type['identifier']}")

    # Get the alignment result
    print("\nGetting alignment result...")
    alignment_result = serviceGetResult(job_id, "aln-clustal_num")
    print("\nAlignment result:")
    print(alignment_result)

    # Get the guide tree if available
    print("\nGetting guide tree...")
    try:
        tree_result = serviceGetResult(job_id, "guidetree")
        print("\nGuide tree:")
        print(tree_result)
    except Exception as e:
        print(f"Could not get guide tree: {str(e)}")

if __name__ == "__main__":
    test_clustalo() 