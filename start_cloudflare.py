"""
EduPulse — Cloudflare Tunnel Launcher (Delegates to unified start.py)
Starts FastAPI Backend (port 8000), Vite Frontend (port 5173),
and exposes the entire system via a secure Cloudflare Tunnel (https://*.trycloudflare.com).
"""

import os
import sys

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)
    from start import main
    main()

