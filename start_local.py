"""
EduPulse — Python Local Runner (Delegates to unified start.py)
Starts both FastAPI Backend (port 8000) and Vite Frontend (port 5173).
"""

import os
import sys

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)
    from start import main
    if len(sys.argv) == 1:
        sys.argv.append("--local")
    main()

