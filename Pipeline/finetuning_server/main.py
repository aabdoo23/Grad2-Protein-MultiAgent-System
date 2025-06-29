#!/usr/bin/env python3
"""
Local development server for the Protein Fine-tuning API.
Run this file to start the server locally for testing.
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent))

try:
    import uvicorn
    from dotenv import load_dotenv
    # Use development version by default, or production version if specified
    use_dev = os.getenv("USE_DEV_API", "true").lower() == "true"
    if use_dev:
        from apis_dev import app
        print("Using development API (with mock services)")
    else:
        from apis import app
        print("Using production API (requires Redis and RunPod)")
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Please install dependencies with: pip install -r requirements.txt")
    sys.exit(1)

def main():
    """Main function to start the development server."""
    
    # Load environment variables from .env file if it exists
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        print(f"Loaded environment variables from {env_file}")
    else:
        print(f"No .env file found at {env_file}")
        print("You can copy .env.example to .env and configure your settings")
    
    # Check if required environment variables are set
    required_vars = ["RUNPOD_API_KEY", "FINETUNE_ENDPOINT_ID"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("\n⚠️  WARNING: Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nThe server will start but some functionality may not work.")
        print("Please set these variables in your .env file or environment.\n")
    else:
        print("✅ All required environment variables are set.")
    
    # Get server configuration
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    print(f"\n🚀 Starting Protein Fine-tuning API server...")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   URL: http://{host}:{port}")
    print(f"   Docs: http://{host}:{port}/docs")
    print(f"   Redoc: http://{host}:{port}/redoc")
      # Start the server
    app_module = "apis_dev:app" if use_dev else "apis:app"
    uvicorn.run(
        app_module,
        host=host,
        port=port,
        reload=debug,
        log_level="debug" if debug else "info"
    )

if __name__ == "__main__":
    main()
