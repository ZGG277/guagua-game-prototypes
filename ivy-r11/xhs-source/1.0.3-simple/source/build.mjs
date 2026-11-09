import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';import {parse} from 'acorn';
const root=path.dirname(fileURLToPath(import.meta.url)),source=path.join(root,'build-source'),out=path.join(root,'app');
await build({entryPoints:[path.join(source,'wall-r112-main.mjs')],outfile:path.join(out,'app.js'),bundle:true,format:'iife',target:['es2017','chrome61'],define:{__XHS_MINITOOL__:'true'},minify:true,legalComments:'none',plugins:[{name:'offline',setup(b){b.onLoad({filter:/\.mjs$/},async args=>{let s=await fs.readFile(args.path,'utf8'),name=path.basename(args.path);
if(name==='wall-atlas.mjs')s=s.replace(/ walls:\[[^\n]+\],/,' walls:[],');
if(name==='wall-character3d.mjs'){
s=s.replace("import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';","import {loadOfflineCharacter} from './wall-offline-model.mjs';");s=s.replace('new GLTFLoader().loadAsync(CHARACTER_URL.href)','loadOfflineCharacter()');s=s.replace('Object.fromEntries(Object.entries(actions).map(([n,a])=>[n,{time:a.time,weight:a.getEffectiveWeight(),running:a.isRunning()}]))','{}');
s=s.replace('let sourceHeight=0,sourceMinY=0;',`let sourceHeight=0,sourceMinY=0;let lost=false,slow=0,quality=1;surface.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});surface.addEventListener('webglcontextrestored',()=>{lost=false;});`);
s=s.replace('if(!mixer||error)return false;','if(!mixer||error||lost)return false;');s=s.replace('advance(wall);renderer.render(scene,camera);',`const renderStart=performance.now();advance(wall);renderer.render(scene,camera);const cost=performance.now()-renderStart;slow=cost>35?slow+1:Math.max(0,slow-1);if(slow>60&&quality===1){renderer.setSize(128,160,false);quality=0;slow=0;}else if(slow>120&&quality===0){error='当前设备已切换轻量人物';return false;}`);
}
s=s.replace(/new URL\(([^,\n]+),import\.meta\.url\)/g,'($1)');
if(name==='wall-r112-main.mjs'){const imports=[];s=s.replace(/^import[^\n]+\n/gm,m=>{imports.push(m);return '';});s=s.replace('function frame(now){','function frame(now){if(document.hidden){last=0;requestAnimationFrame(frame);return;}');s=imports.join('')+'\n(async()=>{\n'+s+'\n})().catch(e=>{console.error(e);const b=document.querySelector("#start");if(b){b.disabled=true;b.textContent="加载失败，请重新打开";}});';}
return{contents:s,loader:'js',resolveDir:path.dirname(args.path)};});}}]});
let js=await fs.readFile(path.join(out,'app.js'),'utf8');parse(js,{ecmaVersion:2017,sourceType:'script'});
for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bnew\s+Worker\s*\(/,/\bimport\.meta\b/,/\bglobalThis\b/,/\beval\s*\(/,/new\s+Function\s*\(/])if(re.test(js))throw Error('Forbidden '+re);
let html=await fs.readFile(path.join(source,'index.html'),'utf8');html=html.replace(/<script type="module" src="[^"]+"><\/script>/,'<script src="./app.js"></script>').replace(/href="wall-r112.css[^"]*"/,'href="./app.css"').replace(/<div class="links">[\s\S]*?<\/div>/,'');await fs.writeFile(path.join(out,'index.html'),html);await fs.copyFile(path.join(source,'wall-r112.css'),path.join(out,'app.css'));
for(const name of ['character/texture-0.jpg','r10/ivy-leaves.webp','r10/girl-poses.webp','r10/light-speck.webp','r112/ivy-wall-a.webp','r112/ivy-wall-b.webp']){const target=path.join(out,'assets',name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(source,'assets',name),target);}
await fs.writeFile(path.join(out,'mini_tool.json'),JSON.stringify({is_high_consumption_scene:true})+'\n');
const licenses=await fs.readFile(path.join(source,'LICENSES.txt'),'utf8');
html=html.replace('<p class="aux" id="renderer">','<details class="aux"><summary>开源许可与完整署名</summary><pre style="white-space:pre-wrap;overflow-wrap:break-word;font:11px sans-serif;text-align:left">'+licenses.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</pre></details><p class="aux" id="renderer">');
await fs.writeFile(path.join(out,'index.html'),html);
console.log({out,scriptBytes:js.length,es2017:true,highConsumption:true});
