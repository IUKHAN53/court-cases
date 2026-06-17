"""Vercel Python serverless entry point.

Vercel's @vercel/python runtime serves the ASGI ``app`` exposed here. All routes
are forwarded to this function by ``vercel.json``.
"""
import os
import sys

# Ensure the backend root (which contains the ``app`` package) is importable.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402  (import after sys.path tweak)

__all__ = ["app"]
