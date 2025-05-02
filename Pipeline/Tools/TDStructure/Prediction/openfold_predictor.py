import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ----------------------------
# parameters
# ----------------------------
key = os.getenv("NVCF_RUN_KEY") or input("Paste the Run Key: ")
url = "https://health.api.nvidia.com/v1/biology/openfold/openfold2/predict-structure-from-msa-and-template"
output_file = Path("output1.json")
selected_models = [1, 2, 3, 4, 5]
sequence = (
    "GGSKENEISHHAKEIERLQKEIERHKQSIKKLKQSEQSNPPPNPEG"
    "TRQARRNRRRRWRERQRQKENEISHHAKEIERLQKEIERHKQSIKKLKQSEC"
)


data = {
    "sequence": sequence,
    "selected_models": selected_models,
    "relax_prediction": False,
}
print(data)

# ---------------------------------------------------------
# Submit
# ---------------------------------------------------------
headers = {
    "content-type": "application/json",
    "Authorization": f"Bearer {key}",
    "NVCF-POLL-SECONDS": "300",
}
print("Making request...")
response = requests.post(url, headers=headers, json=data)

# ---------------------------------------------------------
# View response
# ---------------------------------------------------------
if response.status_code == 200:
    output_file.write_text(response.text)
    print(f"Response output to file: {output_file}")

else:
    print(f"Unexpected HTTP status: {response.status_code}")
    print(f"Response: {response.text}")
