#!/usr/bin/env bash
# Usage: bash tools/encode_showcase.sh input.webm output-directory [basename]
set -euo pipefail
input=$1
output=$2
name=${3:-reversing-turn}
mkdir -p "$output"
# Refuse to replace existing deliverables accidentally.
ffmpeg -n -v warning -i "$input" -an -c:v libx264 -crf 22 -preset slow \
  -pix_fmt yuv420p -movflags +faststart -r 30 "$output/$name.mp4"
ffmpeg -n -v warning -i "$input" -an -c:v libvpx-vp9 -crf 34 -b:v 0 \
  -r 30 "$output/$name.webm"
ffmpeg -n -v error -ss 12 -i "$input" -frames:v 1 -q:v 2 \
  -update 1 "$output/$name.jpg"
