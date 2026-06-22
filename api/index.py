"""
Vercel entrypoint for the AI Weld Inspector FastAPI backend.
Vercel looks for `app` in api/index.py and serves it as a Python serverless function.
"""
import sys
import os

# Ensure project root is on PYTHONPATH so `src.*` imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.api.server import app  # noqa: F401 — re-exported as `app` for Vercel
