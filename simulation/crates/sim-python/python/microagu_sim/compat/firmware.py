"""Locate an explicitly selected external ArduPilot checkout."""
import os
from pathlib import Path


def checkout():
    value = os.environ.get('ARDUPILOT_ROOT')
    if not value:
        raise RuntimeError('Set ARDUPILOT_ROOT to your ArduPilot checkout; see simulation/README.md')
    root = Path(value).expanduser().resolve()
    if not (root / 'Tools/autotest/autotest.py').is_file():
        raise RuntimeError(f'Not an ArduPilot checkout: {root}')
    return root
