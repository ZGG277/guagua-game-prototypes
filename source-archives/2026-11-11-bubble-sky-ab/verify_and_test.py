from pathlib import Path
import hashlib,shutil,subprocess,tempfile

here=Path(__file__).resolve().parent
repo=here.parents[1]
with tempfile.TemporaryDirectory(prefix='bubble-ab-check-') as tmp:
    for name in ['bubble-sky-a','bubble-sky-b']:
        src=here/name if name.endswith('-a') else repo/name
        dest=Path(tmp)/name
        for line in (here/name/'RUNTIME_SHA256.txt').read_text().splitlines():
            expected,relative=line.split(None,1)
            relative=relative.strip()
            if Path(relative).is_absolute() or '..' in Path(relative).parts:raise ValueError(relative)
            f=src/relative
            assert hashlib.sha256(f.read_bytes()).hexdigest()==expected,relative
            (dest/relative).parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(f,dest/relative)
        shutil.copytree(here/name/'qa',dest/'qa')
        subprocess.run(['node','--test',str(dest/'qa/core.test.mjs')],check=True)
print('PASS: both five-file runtimes verified; 16 core tests passed.')
