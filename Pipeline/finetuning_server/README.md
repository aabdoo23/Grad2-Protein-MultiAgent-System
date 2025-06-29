# Protein Fine-tuning Server

A FastAPI-based server for fine-tuning protein language models and generating protein sequences.

## Quick Start (Local Development)

### Option 1: Using the startup scripts (Recommended)
```cmd
start_server.bat
```

### Option 2: Manual setup

1. **Create and activate virtual environment:**
   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1  # PowerShell
   # OR
   venv\Scripts\activate.bat  # Command Prompt
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   copy .env.example .env
   # Edit .env file with your values (optional for development mode)
   ```

4. **Start the server:**
   ```bash
   python main.py
   ```

## Server Modes

### Development Mode (Default)
- Uses in-memory storage instead of Redis
- Simulates RunPod jobs with mock responses
- Perfect for testing the API without external dependencies
- Automatically enabled when `DEVELOPMENT_MODE=true`

### Production Mode
- Requires Redis for job storage
- Requires RunPod API key and endpoint
- Set `DEVELOPMENT_MODE=false` and `USE_DEV_API=false`

## API Endpoints

Once the server is running, you can access:

- **API Documentation:** http://localhost:8000/docs
- **Alternative Docs:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health
- **Base Models:** http://localhost:8000/models/base

### Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/models/base` | GET | List available base models |
| `/models/finetuned/{user_id}` | GET | List user's fine-tuned models |
| `/finetune` | POST | Start a fine-tuning job |
| `/generate` | POST | Generate protein sequences |
| `/status/{job_id}` | GET | Get job status |
| `/jobs/user/{user_id}` | GET | Get all jobs for a user |

## Available Models

The server supports the following base models:

- `protgpt2` - ProtGPT2 model
- `progen2-small` - ProGen2 Small
- `progen2-medium` - ProGen2 Medium  
- `progen2-large` - ProGen2 Large
- `progen2-xlarge` - ProGen2 XLarge
- `RITA_s` - RITA Small
- `RITA_m` - RITA Medium
- `RITA_l` - RITA Large
- `RITA_xl` - RITA XLarge

## Example Usage

### Start a Fine-tuning Job

```bash
curl -X POST "http://localhost:8000/finetune" \
     -H "Content-Type: application/json" \
     -d '{
       "model_key": "protgpt2",
       "fasta_content": ">protein1\nMKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG",
       "user_id": "test_user",
       "finetune_mode": "qlora",
       "n_trials": 3
     }'
```

### Generate a Sequence

```bash
curl -X POST "http://localhost:8000/generate" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Generate a protein sequence",
       "base_model_key": "protgpt2",
       "user_id": "test_user",
       "max_new_tokens": 100
     }'
```

### Check Job Status

```bash
curl "http://localhost:8000/status/{job_id}"
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DEVELOPMENT_MODE` | Enable development mode | `true` | No |
| `USE_DEV_API` | Use development API | `true` | No |
| `RUNPOD_API_KEY` | RunPod API key | - | Production only |
| `FINETUNE_ENDPOINT_ID` | RunPod endpoint ID | - | Production only |
| `REDIS_HOST` | Redis host | `localhost` | Production only |
| `REDIS_PORT` | Redis port | `6379` | Production only |
| `HOST` | Server host | `127.0.0.1` | No |
| `PORT` | Server port | `8000` | No |
| `DEBUG` | Enable debug mode | `true` | No |

## Development Features

In development mode, the server includes:

- Mock job processing with realistic delays
- In-memory job storage
- Debug endpoints for inspecting storage
- Automatic job completion simulation
- No external dependencies required

## Troubleshooting

### Common Issues

1. **Import errors:** Make sure you've activated the virtual environment and installed dependencies
2. **Port already in use:** Change the PORT environment variable or stop other services using port 8000
3. **Missing environment variables:** Copy `.env.example` to `.env` and configure your settings

### Debug Endpoints (Development Mode Only)

- `/debug/storage` - View current in-memory storage contents

### Logs

The server provides detailed logging in debug mode. Check the console output for:
- Environment variable status
- Job processing updates
- Error messages and stack traces

## Production Deployment

For production deployment:

1. Set `DEVELOPMENT_MODE=false`
2. Set `USE_DEV_API=false`
3. Configure Redis connection
4. Set RunPod API credentials
5. Use a production WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker apis:app
```

## Contributing

When adding new features:

1. Test in development mode first
2. Ensure backward compatibility
3. Update API documentation
4. Add appropriate error handling
5. Consider both development and production modes
