"""Compatibility defaults exported from the authoritative Rust schema."""
import json
from microagu_sim import _native
DEFAULT = json.loads(_native.parameter_defaults_json())
