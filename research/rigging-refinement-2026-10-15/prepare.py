# AP_FLAKE8_CLEAN
from pathlib import Path
import tarfile,hashlib,json,subprocess
root=Path(__file__).resolve().parent
model=root/'model';model.mkdir(exist_ok=True)
with tarfile.open(root/'model-source.tar.gz') as archive:archive.extractall(model,filter='data')
for name,digest in json.loads((root/'source-hashes.json').read_text()).items():
    assert hashlib.sha256((model/name).read_bytes()).hexdigest()==digest,name
subprocess.run(['sh','build.sh'],cwd=model,check=True)
