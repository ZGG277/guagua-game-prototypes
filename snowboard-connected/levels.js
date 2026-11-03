// R22 campaign data, validated additive storage, and active-play recovery clock.
export const LEVELS=Object.freeze([
 {id:'spruce',name:'云杉缓坡',start:8,end:228,width:34,grade:.24,hint:'宽缓直道 · 熟悉重心与立刃'},
 {id:'ridge',name:'林间回转',start:248,end:508,width:29,grade:.31,hint:'坡度增加 · 留意石头与倒木'},
 {id:'summit',name:'雪脊挑战',start:528,end:868,width:24,grade:.40,hint:'连续起伏 · 提前选线与控速'}
]);
export const PROGRESS_KEY='altay.progress.v1';
const ids=LEVELS.map(l=>l.id);
function storage(){try{return globalThis.__snowPrefs||globalThis.localStorage;}catch{return null;}}
export class Campaign {
 constructor(store=storage()){
  this.store=store;this.completed=[];this.current=0;this.saved=false;this.readOnly=false;
  try{const raw=store?.getItem(PROGRESS_KEY);if(raw){const p=JSON.parse(raw);
   if(p?.version>1){this.readOnly=true;return;}
   if(p?.version===1&&Array.isArray(p.completed)){
    // Only a contiguous prefix unlocks levels; malformed records cannot skip a stage.
    for(const id of ids){if(p.completed.includes(id))this.completed.push(id);else break;}
    const unlocked=Math.min(this.completed.length,LEVELS.length-1),wanted=ids.indexOf(p.current);
    this.current=wanted>=0&&wanted<=unlocked?wanted:unlocked;this.saved=true;
   }
  }}catch{}
 }
 get level(){return LEVELS[this.current];}
 get unlocked(){return Math.min(this.completed.length,LEVELS.length-1);}
 choose(index){if(!Number.isInteger(index)||index<0||index>this.unlocked)return false;this.current=index;return true;}
 complete(index){
  if(index!==this.current||index>this.completed.length)return false;
  if(index===this.completed.length)this.completed.push(ids[index]);
  // Keep current stage until Next is pressed; reopening resumes the next unlocked stage.
  if(this.readOnly){this.saved=false;return true;}
  try{if(!this.store)throw Error('storage unavailable');const write=this.store.setItem(PROGRESS_KEY,JSON.stringify({version:1,completed:this.completed,current:ids[Math.min(this.completed.length,ids.length-1)]}));
   this.pending=!!write?.then;this.saved=!this.pending;
   if(this.pending)Promise.resolve(write).then(()=>{this.pending=false;this.saved=true;},()=>{this.pending=false;this.saved=false;});
  }catch{this.pending=false;this.saved=false;}
  return true;
 }
 snapshot(){return {current:this.current,completed:[...this.completed],unlocked:this.unlocked,saved:this.saved,pending:!!this.pending,readOnly:this.readOnly};}
}
export class RecoveryWatch {
 constructor(){this.reset();}
 reset(){this.origin=null;this.still=0;this.steep=0;this.contacts=0;this.lastCollision=0;}
 update(s,dt,{active=true,input={},start=8,width=64,surface}={}){
  if(!active){this.origin=null;this.still=0;this.steep=0;this.contacts=0;this.lastCollision=s.collisionCount;return null;}
  if(!Number.isFinite(dt)||dt<=0||dt>.06)return null;
  if(![s.x,s.z,s.vx,s.vz,s.heading,s.airHeight].every(Number.isFinite))return 'numeric';
  if(s.caught)return s.protectionReason||'contact';
  const fresh=s.collisionCount>this.lastCollision;this.lastCollision=s.collisionCount;
  if(fresh&&(s.lastCollision?.impactSpeed||0)>1)return 'collision';
  this.contacts=fresh?this.contacts+dt:Math.max(0,this.contacts-dt);
  if(this.contacts>.35)return 'collision';
  const speed=Math.hypot(s.vx,s.vz),grade=surface?Math.hypot(surface.dx,surface.dz):0;
  this.steep=!s.airborne&&speed>6&&grade>.78?this.steep+dt:0;
  if(this.steep>.3)return 'steep';
  if(Math.abs(s.x)>width||s.z<start-18)return 'route';
  // Holding a deliberate firm brake, an airborne jump, menus and waiting at start
  // are not a stall. Otherwise require <1m of progress for eight active seconds.
  const braking=(Math.max(Math.abs(input.frontY||0),Math.abs(input.rearY||0))>.2&&speed<1)||(Math.abs(input.frontY||0)>.65&&Math.abs(input.rearY||0)>.65&&(input.frontY||0)*(input.rearY||0)>0);
  if(s.airborne||braking){this.origin=null;this.still=0;return null;}
  if(!this.origin||Math.hypot(s.x-this.origin.x,s.z-this.origin.z)>1){this.origin={x:s.x,z:s.z};this.still=0;}
  else this.still+=dt;
  return this.still>=8?'stuck':null;
 }
}
