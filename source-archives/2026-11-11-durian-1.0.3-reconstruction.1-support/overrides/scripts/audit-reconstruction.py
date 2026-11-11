"""Independent deterministic audit. Not the unavailable platform skill helper."""
from pathlib import Path
from html.parser import HTMLParser
import json, re, zipfile, hashlib
r=Path(__file__).resolve().parents[1]
dist=r/'dist'; package=r/'durian-reconstruction-candidate.zip'
errors=[]; warnings=[]
files=sorted(p for p in dist.rglob('*') if p.is_file())
allowed={'.html','.css','.js','.png','.jpg','.jpeg','.gif','.webp','.svg','.woff','.woff2','.json'}
for p in files:
 if p.suffix not in allowed: errors.append('Disallowed extension: '+str(p.relative_to(dist)))
 if any(x in p.parts for x in ['node_modules','.git']):errors.append('Development directory in dist')
 if p.suffix in ['.html','.css','.js','.json'] and p.stat().st_size>2*1024*1024:warnings.append('Large text file: '+p.name)
text_bytes=sum(p.stat().st_size for p in files if p.suffix in ['.html','.css','.js','.json'])
if text_bytes>5*1024*1024:warnings.append('Large aggregate text')
class HTMLAudit(HTMLParser):
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['iframe','object','base']:errors.append('Forbidden element: '+tag)
  if tag=='script' and (not a.get('src') or a.get('type')=='module'):errors.append('Non-classic or inline script')
  for key,value in attrs:
   if key.startswith('on'):errors.append('Inline event handler')
   if key in ['src','href'] and value and not value.startswith('data:'):
    if re.match(r'^(?:https?:|//|/)',value):errors.append('External or root resource: '+value)
    elif not (dist/value).is_file():errors.append('Missing resource: '+value)
HTMLAudit().feed((dist/'index.html').read_text())
for p in files:
 if p.suffix=='.js':
  s=p.read_text()
  for pattern in [r'\bfetch\s*\(',r'\bXMLHttpRequest\b',r'new\s+(?:WebSocket|Worker|SharedWorker|OffscreenCanvas)\s*\(',r'\beval\s*\(',r'new\s+Function\s*\(',r'\bWebAssembly\.',r'window\.open\s*\(',r'navigator\.(?:clipboard|geolocation|serviceWorker)']:
   if re.search(pattern,s):errors.append(p.name+': '+pattern)
assert (dist/'assets/share-hero-reconstructed.jpg').is_file()
manifest=json.loads((dist/'mini_tool.json').read_text());assert manifest=={'is_high_consumption_scene':False}
with zipfile.ZipFile(package) as z:
 names=z.namelist()
 if len(names)!=len(set(names)):errors.append('Duplicate ZIP entries')
 if 'index.html' not in names:errors.append('Missing root index.html')
 for p in files:
  name=p.relative_to(dist).as_posix()
  if name not in names or z.read(name)!=p.read_bytes():errors.append('ZIP/dist mismatch: '+name)
 if len(names)!=len(files):errors.append('Unexpected ZIP entries')
if package.stat().st_size>10*1024*1024:errors.append('ZIP exceeds 10 MiB')
elif package.stat().st_size>2*1024*1024:warnings.append('ZIP exceeds recommended 2 MiB')
result={'passed':not errors,'files':len(files),'textBytes':text_bytes,'zipBytes':package.stat().st_size,'sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'errors':errors,'warnings':warnings,'method':'Independent static audit with Python standard library; official skill helper could not be loaded','highConsumptionReview':'Canvas 2D game and temporary DOM Canvas export only; no Worker, OffscreenCanvas, WebAssembly, Unity, Cocos, or other game engine','notVerified':['platform simulator','Android device','iOS device','Chrome 61 execution','real sound listening','device performance']}
(r/'reports/static-audit.json').write_text(json.dumps(result,indent=2,ensure_ascii=False));print(json.dumps(result,ensure_ascii=False));raise SystemExit(bool(errors))
