"""Compatibility entry point; use `uvicorn app.main:app` from backend/."""
try:
    from .app.main import app
except ImportError:
    from app.main import app
