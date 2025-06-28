# Fine-tuning configuration
import os

# Server configuration
FINETUNE_SERVER_URL = os.environ.get("FINETUNE_SERVER_URL", "http://localhost:8000")

# Request timeouts (in seconds)
TIMEOUT_SHORT = 10   # For health checks and quick operations
TIMEOUT_MEDIUM = 30  # For status checks and model listing
TIMEOUT_LONG = 60    # For starting jobs

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds

# Default values for fine-tuning requests
DEFAULT_FINETUNE_MODE = "qlora"
DEFAULT_N_TRIALS = 5
DEFAULT_MAX_NEW_TOKENS = 200

# Valid fine-tune modes
VALID_FINETUNE_MODES = ["qlora", "full"]

# Status mapping
JOB_STATUS_MAPPING = {
    "PENDING": "pending",
    "IN_QUEUE": "queued", 
    "IN_PROGRESS": "running",
    "COMPLETED": "completed",
    "FAILED": "failed",
    "CANCELLED": "cancelled"
}
