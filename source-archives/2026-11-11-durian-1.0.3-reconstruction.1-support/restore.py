from pathlib import Path
import sys,json,hashlib,shutil

here=Path(__file__).resolve().parent
repo=here.parents[1]
target=Path(sys.argv[1]).resolve()
if target.exists() and any(target.iterdir()):raise SystemExit('Destination must be new or empty.')
rows=json.loads((here/'RESTORE_MAP.json').read_text())['files']
checked=[]
for row in rows:
    relative=Path(row['path'])
    if relative.is_absolute() or '..' in relative.parts:raise ValueError(relative)
    src=repo/row['fromRepository'] if 'fromRepository' in row else here/row['fromArchive']
    assert hashlib.sha256(src.read_bytes()).hexdigest()==row['sha256'],row['path']
    checked.append((src,target/relative))
for src,dst in checked:
    dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
print('Restored and verified',len(rows),'historical build/test inputs into',target)
