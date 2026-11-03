// One world-coordinate contract for snow, route guides, map, area and recovery.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));};
export const NETWORK=Object.freeze({version:2,start:8,descentEnd:8208,end:10008,forkStart:2008,forkOpen:2608,mergeStart:4208,forkEnd:4808,maxX:340});
export const REGIONS=Object.freeze([
 {id:'spruce',name:'云杉缓坡',start:8,end:2208,color:'#77b8a1',oldLength:220},
 {id:'grove',name:'林间双线',start:2208,end:4808,color:'#529c92',oldLength:260},
 {id:'ridge',name:'雪脊谷地',start:4808,end:10008,descentEnd:8208,color:'#c79779',oldLength:340}
]);
export function regionAt(z){return REGIONS.find(r=>z<r.end)||REGIONS.at(-1);}
export function centerAt(z){const t=(z-4808)/3400;if(t<=0||t>=1)return 0;return 20*Math.sin(Math.PI*t)**4*Math.sin(2*Math.PI*t);}
export function forkAt(z){return 78*smooth((z-NETWORK.forkStart)/600)*(1-smooth((z-NETWORK.mergeStart)/600));}
export function routesAt(z){const c=centerAt(z),f=forkAt(z);return f>.01?[
 {id:'forest',name:'松林缓线',x:c-f,width:31,color:'#70bfa1'},
 {id:'crest',name:'雪脊线',x:c+f,width:25,color:'#dfa77a'}
 ]:[{id:z<2208?'spruce':z<4808?'merge':z<8208?'ridge':'valley',name:z<2208?'宽缓雪道':z<4808?'汇合坡':z<8208?'雪脊长坡':'谷底缓冲区',x:c,width:38,color:z<4808?'#70bfa1':'#dfa77a'}];}
export function locationAt(x,z){const routes=routesAt(z),route=routes.reduce((a,b)=>Math.abs(x-a.x)<Math.abs(x-b.x)?a:b);return {world:{x,z},region:regionAt(z),route,offPiste:Math.abs(x-route.x)>route.width,choices:routes.map(r=>({id:r.id,name:r.name,x:r.x})),nextChoice:z<2008?{z:2008,distance:2008-z,names:['松林缓线','雪脊线']}:z<4808?{z:4808,distance:4808-z,names:['汇合坡']}:{z:8208,distance:Math.max(0,8208-z),names:['谷底缓冲区']}};}
export function safePoint(z=8,preferredX=0){z=clamp(z,8,9008);const rs=routesAt(z),r=rs.reduce((a,b)=>Math.abs(a.x-preferredX)<Math.abs(b.x-preferredX)?a:b);const ahead=routesAt(z+.1).find(q=>q.id===r.id)||routesAt(z+.1)[0],behind=routesAt(z-.1).find(q=>q.id===r.id)||routesAt(z-.1)[0];return {x:r.x,z,heading:Math.atan2((ahead.x-behind.x)/.2,1),route:r.id,region:regionAt(z).id};}
export const RESORT_KEY='altay.resort.v2',LEGACY_KEY='altay.progress.v1';
function storage(){try{return globalThis.__snowPrefs||globalThis.localStorage;}catch{return null;}}
export class ResortProgress{
 constructor(store=storage()){
  this.store=store;this.anchor=safePoint();this.visited=[];this.saved=false;this.readOnly=false;this.migrated=false;this.pending=false;this.serial=0;
  try{const raw=store?.getItem(RESORT_KEY);if(raw){const p=JSON.parse(raw);if(p?.version>2){this.readOnly=true;return;}if(p?.version===2&&Number.isFinite(p.anchor?.x)&&Number.isFinite(p.anchor?.z)&&p.anchor.z>=8&&p.anchor.z<=9008&&Math.abs(p.anchor.x)<340){this.anchor=safePoint(p.anchor.z,p.anchor.x);this.visited=Array.isArray(p.visited)?p.visited.filter(id=>REGIONS.some(r=>r.id===id)):[];this.saved=true;return;}}
   const legacy=JSON.parse(store?.getItem(LEGACY_KEY)||'null');if(legacy?.version===1){const completed=Array.isArray(legacy.completed)?legacy.completed:[],wanted=legacy.current,region=wanted==='summit'||completed.includes('ridge')?2:wanted==='ridge'||completed.includes('spruce')?1:0;this.anchor=safePoint(REGIONS[region].start);this.migrated=true;}
  }catch{} // Bad/unavailable storage never prevents riding. Old bytes are never removed.
 }
 accept(a,b,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.06||![a.x,a.z,b.x,b.z].every(Number.isFinite)||Math.hypot(b.x-a.x,b.z-a.z)>120*dt+1e-5)return false;
  const region=regionAt(b.z);if(!this.visited.includes(region.id))this.visited.push(region.id);
  if(b.caught||b.airborne||b.z<8||b.z>9200)return false;
  const checkpoint=Math.max(region.start,region.start+Math.floor((b.z-region.start)/200)*200),loc=locationAt(b.x,b.z);
  // At most one previous 200m interval; never move the player to this point during normal riding.
  if(!loc.offPiste&&(region.id!==this.anchor.region||checkpoint>this.anchor.z+1)){this.anchor=safePoint(checkpoint,b.x);this.saved=false;return true;}return false;
 }
 save(){
  if(this.readOnly||this.pending)return false;const payload={version:2,anchor:this.anchor,visited:this.visited},seq=++this.serial;
  try{if(!this.store)throw Error('unavailable');const result=this.store.setItem(RESORT_KEY,JSON.stringify(payload));this.pending=!!result?.then;this.saved=!this.pending;if(this.pending)Promise.resolve(result).then(()=>{if(seq===this.serial){this.pending=false;this.saved=true;}},()=>{if(seq===this.serial){this.pending=false;this.saved=false;}});return true;}catch{this.saved=false;return false;}
 }
 snapshot(){return {anchor:{...this.anchor},visited:[...this.visited],saved:this.saved,pending:this.pending,readOnly:this.readOnly,migrated:this.migrated,storageKey:RESORT_KEY};}
}
