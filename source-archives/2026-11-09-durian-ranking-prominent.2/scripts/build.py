from pathlib import Path
import subprocess,shutil,json,zipfile,hashlib
r=Path(__file__).resolve().parents[1]
(r/'dist').mkdir(exist_ok=True)
(r/'dist/assets').mkdir(exist_ok=True)
shutil.copy(r/'assets/share-hero-reconstructed.jpg',r/'dist/assets/share-hero-reconstructed.jpg')
shutil.copy(r/'scripts/platform.js',r/'dist/platform.js')
for name in ['index.html','style.css','share-card.js','leaderboard.js']: shutil.copy(r/'source'/name,r/'dist'/name)
esbuild=next((str(p) for p in [r/'node_modules/.bin/esbuild',r.parent/'catchball-release/r16-source/node_modules/.bin/esbuild'] if p.exists()),shutil.which('esbuild'))
if not esbuild: raise SystemExit('Run npm install to provide esbuild, then retry.')
(r/'reports/v102').mkdir(parents=True,exist_ok=True)
subprocess.run([esbuild,str(r/'source/app.js'),'--bundle','--format=iife','--target=es2017,chrome61','--outfile='+str(r/'dist/app.js')],check=True,cwd=str(r))
(r/'dist/mini_tool.json').write_text('{"is_high_consumption_scene":false}\n')
version=json.loads((r/'package.json').read_text())['version']
p=r/'durian-assassin-ranking-prominent-candidate.zip'
with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted((r/'dist').rglob('*')): 
  if f.is_file():
   info=zipfile.ZipInfo(str(f.relative_to(r/'dist')),(2026,11,9,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,f.read_bytes())
report={'file':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'version':version,'isOriginal':False,'name':'榴莲刺客','source':'source/* + scripts/platform.js + dist/assets/*','highConsumption':False}
(r/'reports/package.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(report,ensure_ascii=False))
