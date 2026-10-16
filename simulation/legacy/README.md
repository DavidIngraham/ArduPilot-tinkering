# Frozen C++ parity reference

This is the pre-Rust kernel, retained only as an independent numerical oracle.
Production Python and browser simulation use `sim-core`. Do not add physics here.

Build with `sh build.sh` (requires a C++17 compiler and Eigen3), then run
`uv run python tests/parity/compare_legacy.py` from `simulation/`.

The propeller table literals in Rust were imported without numerical changes.
