#!/usr/bin/env python3
"""Record full viewer state while running the unchanged native AUTO test.

Run from the ArduPilot checkout using its autotest Python environment.
Arguments after -- are forwarded to compare_autotest.py. BUILDLOGS and
PG_CONTROLLER_CONFIG retain their usual meanings. This observer does not
modify commands, controller settings, model state, or test assertions.
"""
import argparse
import json
from pathlib import Path
import runpy
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--model-dir', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args, forwarded = parser.parse_known_args()
if forwarded[:1] == ['--']:
    forwarded = forwarded[1:]
sys.path.insert(0, str(args.model_dir.resolve()))
from json_backend import Backend

original = Backend.respond
last_time = -float('inf')
args.output.parent.mkdir(parents=True, exist_ok=True)
with args.output.open('x') as recording:
    def observe(self, packet):
        global last_time
        response = original(self, packet)
        if self.time >= last_time + 1 / 30:
            recording.write(json.dumps(self.viewer_state(), allow_nan=False) + '\n')
            last_time = self.time
        return response

    Backend.respond = observe
    sys.argv = [str(args.model_dir / 'compare_autotest.py'), *forwarded]
    try:
        runpy.run_path(sys.argv[0], run_name='__main__')
    finally:
        Backend.respond = original
