"""Locate the reusable simulator for study entry points, from any working directory."""
from pathlib import Path
import os
import sys
SIMULATION=Path(os.environ.get('MICROAGU_SIM_ROOT',Path(__file__).resolve().parents[2]/'simulation')).resolve()
sys.path.insert(0,str(SIMULATION))
