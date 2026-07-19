#!/usr/bin/env python3
"""
Local development server runner for the Sanddock backend.
Requires: Redis running on localhost:6379
"""
import os
import sys
import subprocess

# Load environment variables from .env.local
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
load_dotenv(env_path)

print("=" * 70)
print("SANDDOCK BACKEND - LOCAL DEVELOPMENT SERVER")
print("=" * 70)
print()
print("Starting FastAPI WebSocket server on http://localhost:8000")
print()
print("Required services:")
print("  ✓ Redis must be running on localhost:6379")
print("  ✓ Next.js frontend runs on localhost:3000")
print()
print("Environment loaded from:", env_path)
print()
print("=" * 70)
print()

# Run uvicorn
cmd = [
    sys.executable, "-m", "uvicorn",
    "api.main:app",
    "--host", "0.0.0.0",
    "--port", "8000",
    "--reload"
]

os.chdir(os.path.dirname(__file__))
os.environ["REDIS_URL"] = os.environ.get("REDIS_URL", "redis://localhost:6379")

print(f"Command: {' '.join(cmd)}")
print(f"REDIS_URL: {os.environ['REDIS_URL']}")
print()

subprocess.run(cmd)
