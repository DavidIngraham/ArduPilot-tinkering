import ast,json,subprocess
from pathlib import Path
root=Path(__file__).parent
repo=Path('/workspace/ardupilot')
v=next(v for v in json.loads((repo/'build/sitl/compile_commands.json').read_text()) if v['file'].endswith('/test_paraglider.cpp'))
a=v['arguments'][:]
a[a.index(v['file'])]=str(root/'simulate.cpp')
a[-1]='-o'+str(root/'simulate.o')
subprocess.run(a,cwd=v['directory'],check=True)
line=next(x for x in (root/'link-build.txt').read_text().splitlines() if 'runner [' in x and "'-otests/test_paraglider'" in x)
b=ast.literal_eval(line[line.index('['):])
b[b.index('libraries/SITL/tests/test_paraglider.cpp.4.o')]=str(root/'simulate.o')
b[b.index('-otests/test_paraglider')]='-o'+str(root/'simulate')
subprocess.run(b,cwd=v['directory'],check=True)
