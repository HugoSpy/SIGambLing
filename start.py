#!/usr/bin/env python3
"""
Quick-start script for SIGambling backend.
Run from the project root: python start.py
"""
import os
import sys
import subprocess

backend_dir = os.path.join(os.path.dirname(__file__), "backend")
python = sys.executable

subprocess.run(
    [python, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
    cwd=backend_dir,
)
