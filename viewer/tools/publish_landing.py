"""Compatibility command; the publisher consumes the generated build manifest."""
import argparse
from pathlib import Path
import subprocess
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('destination',type=Path)
a=p.parse_args()
subprocess.run(['node','--import','tsx','tools/publish/publish.ts','--destination',str(a.destination.resolve()),*['--app', 'landing']],cwd=Path(__file__).resolve().parents[1],check=True)
