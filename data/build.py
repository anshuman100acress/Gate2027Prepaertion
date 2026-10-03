"""Regenerate the structured lesson library and topic checks."""
import runpy
import sys
from pathlib import Path
content=Path(__file__).resolve().parent/'content'
sys.path.insert(0,str(content))
runpy.run_path(str(content/'build.py'),run_name='__main__')
