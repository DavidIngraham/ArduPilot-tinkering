#!/usr/bin/env python3
"""Verify archived bytes or restore original scratch paths to a separate directory."""
import argparse
import concurrent.futures
import gzip
import hashlib
import json
import os
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def process(entry,destination):
    stored=ROOT/entry['stored_path']
    relative=Path(entry['original_path'])
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError('Unsafe manifest path')
    target=destination/relative if destination else None
    if target:
        target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists():
            raise FileExistsError(f'Refusing to overwrite {target}')
    digest=hashlib.sha256();size=0
    opener=gzip.open if entry['compression']=='gzip' else open
    with opener(stored,'rb') as source:
        if target:
            with target.open('xb') as output:
                while chunk:=source.read(1024**2):
                    digest.update(chunk);size+=len(chunk);output.write(chunk)
        else:
            while chunk:=source.read(1024**2):digest.update(chunk);size+=len(chunk)
    if size!=entry['original_bytes'] or digest.hexdigest()!=entry['sha256']:
        if target:target.unlink()
        raise ValueError(f'Checksum mismatch: {relative}')
    if target:target.chmod(entry['original_mode'])
    return size

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify',action='store_true',help='Read/decompress and verify every manifest entry without writing')
    parser.add_argument('--destination',type=Path,help='Restore scratch/ under this directory; existing files are never overwritten')
    parser.add_argument('--prefix',default='scratch/',help='Manifest path prefix to select, e.g. scratch/plane-trajectory/')
    args=parser.parse_args()
    if not args.verify and args.destination is None:parser.error('Specify --verify or --destination')
    entries=[e for e in json.loads((ROOT/'provenance/artifact-manifest.json').read_text())['files'] if e['original_path'].startswith(args.prefix)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        sizes=list(pool.map(lambda e:process(e,None if args.verify else args.destination.resolve()),entries))
    print(f'Verified {len(entries)} artifacts ({sum(sizes):,} original bytes)'+(' and restored original paths' if not args.verify else ''))
