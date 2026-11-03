// Run-local progress and reward accounting. All positions are absolute physics
// coordinates; rendering-origin changes must never be passed as locomotion.
import {CHUNK_LENGTH,courseSeed} from './terrain.js';
const EPS=1e-8,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DEFAULT_RIDER_COLLIDER=Object.freeze({halfWidth:2,halfLength:2.1,bottom:-.75,top:3});
const position=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.y??0)&&Number.isFinite(p.progress??p.z)?{x:p.x,y:p.y??0,z:p.z,heading:Number.isFinite(p.heading)?p.heading:0,progress:p.progress??p.z}:null;
const shortAngle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

// The rider center must cross from strictly behind to in front. At the exact
// swept crossing, test the entire oriented finite collider against the opening.
// Starting inside, reverse entry, tangency, and above/below passes never pay.
export function sweptGateCrossing(previous,next,gate,collider=DEFAULT_RIDER_COLLIDER){
 const a=position(previous),b=position(next);if(!a||!b||!gate)return null;
 let nx=gate.normalX??0,nz=gate.normalZ??1;const norm=Math.hypot(nx,nz);if(!Number.isFinite(norm)||norm<EPS)return null;nx/=norm;nz/=norm;
 const ax=a.x-gate.x,az=a.z-gate.z,bx=b.x-gate.x,bz=b.z-gate.z,da=ax*nx+az*nz,db=bx*nx+bz*nz;
 if(!(da<-EPS&&db>=0&&db-da>EPS))return null;
 const t=-da/(db-da),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t,heading=a.heading+shortAngle(a.heading,b.heading)*t;
 const tx=nz,tz=-nx,lateral=(x-gate.x)*tx+(z-gate.z)*tz;
 const c={...DEFAULT_RIDER_COLLIDER,...collider};
 if(![c.halfWidth,c.halfLength,c.bottom,c.top,gate.openingHalfWidth??gate.halfWidth,gate.y??0,gate.bottom??0,gate.top??5].every(Number.isFinite)||c.halfWidth<0||c.halfLength<0||c.top<c.bottom||(gate.openingHalfWidth??gate.halfWidth)<=0)return null;
 const extent=Math.abs(tx*Math.cos(heading)-tz*Math.sin(heading))*c.halfWidth+Math.abs(tx*Math.sin(heading)+tz*Math.cos(heading))*c.halfLength;
 const bottom=y+c.bottom-(gate.y??0),top=y+c.top-(gate.y??0);
 if(Math.abs(lateral)+extent>(gate.openingHalfWidth??gate.halfWidth)+EPS||bottom<(gate.bottom??0)-EPS||top>(gate.top??5)+EPS)return null;
 return{t,x,y,z,lateral,extent};
}

// R18 proximity magnet: continuous sweep prevents missed gems at speed. The
// generous horizontal reach is intentionally separate from the vertical band.
export const GEM_MAGNET_RADIUS=4.4;
export function sweptGemPickup(previous,next,gem){
 const a=position(previous),b=position(next);if(!a||!b||!gem||![gem.x,gem.y,gem.z].every(Number.isFinite))return null;
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 const t=length>1e-14?clamp(((gem.x-a.x)*dx+(gem.z-a.z)*dz)/length,0,1):0;
 const height=a.y+(b.y-a.y)*t+1.35,distance=Math.hypot(a.x+dx*t-gem.x,a.z+dz*t-gem.z);
 return distance<=GEM_MAGNET_RADIUS&&Math.abs(height-gem.y)<=2.8?{t,distance}:null;
}

export class JourneyState{
 constructor({seed=courseSeed,capacity=16,maxSpeed=120,maxStep=.25}={}){
  if(!Number.isInteger(capacity)||capacity<2||capacity>1024)throw new RangeError('Reward capacity must be 2..1024');
  if(!Number.isFinite(maxSpeed)||maxSpeed<=0||!Number.isFinite(maxStep)||maxStep<=0)throw new RangeError('Physical step bounds must be positive');
  this.seed=seed>>>0;this.capacity=capacity;this.maxSpeed=maxSpeed;this.maxStep=maxStep;
  this.rewardChunks=new Float64Array(capacity);this.rewardBits=new Uint32Array(capacity);this.reset();
 }
 reset(p=null){
  this.distance=0;this.rewardCount=0;this.highWater=-Infinity;this.retiredBefore=-Infinity;this.nextMilestone=100;this.runId=(this.runId??0)+1;
  this.magnets=new Map();this.rewardChunks.fill(NaN);this.rewardBits.fill(0);this.previous=null;this.reanchor(p);return this;
 }
 // Advancing the anchor also advances the exclusion high-water: teleporting
 // forward grants no distance now or when the next genuine physical step occurs.
 reanchor(p){this.magnets?.clear();this.previous=position(p);if(this.previous)this.highWater=Math.max(this.highWater,this.previous.progress);return this;}
 retireBefore(index){
  if(!Number.isSafeInteger(index))return;
  this.retiredBefore=Math.max(this.retiredBefore,index);
  for(let i=0;i<this.capacity;i++)if(this.rewardChunks[i]<this.retiredBefore){this.rewardChunks[i]=NaN;this.rewardBits[i]=0;}
 }
 gemPosition(gem){return this.magnets.get(gem.id)?.position??gem;}
 isAttracting(gem){return this.magnets.has(gem.id);}
 isCollected(gate){
  if(!Number.isSafeInteger(gate?.chunkIndex)||!Number.isInteger(gate?.rewardIndex)||gate.rewardIndex<0||gate.rewardIndex>31)return true;
  if(gate.chunkIndex<this.retiredBefore)return true;
  const slot=((gate.chunkIndex%this.capacity)+this.capacity)%this.capacity;
  return this.rewardChunks[slot]===gate.chunkIndex&&!!(this.rewardBits[slot]&(1<<gate.rewardIndex));
 }
 claim(gate){
  if(this.isCollected(gate))return false;
  const index=gate.chunkIndex;this.retireBefore(index-this.capacity+1);
  if(index<this.retiredBefore)return false;
  const slot=((index%this.capacity)+this.capacity)%this.capacity;
  if(this.rewardChunks[slot]!==index){
   // Retiring an overwritten older chunk prevents it paying again if revisited.
   if(Number.isFinite(this.rewardChunks[slot]))this.retireBefore(this.rewardChunks[slot]+1);
   this.rewardChunks[slot]=index;this.rewardBits[slot]=0;
  }
  this.rewardBits[slot]|=1<<gate.rewardIndex;this.rewardCount++;return true;
 }
 accept(p,{dt=0,active=true,continuous=true,gates=[],collider=DEFAULT_RIDER_COLLIDER}={}){
  const next=position(p),previous=this.previous,gained=[],milestones=[];
  const result=accepted=>({accepted,distance:this.distance,rewardCount:this.rewardCount,gained,milestones});
  if(!next){this.previous=null;return result(false);}
  const travel=previous?Math.hypot(next.x-previous.x,next.z-previous.z):0;
  const valid=active&&continuous&&previous&&Number.isFinite(dt)&&dt>0&&dt<=this.maxStep+EPS&&travel<=this.maxSpeed*dt+1e-5;
  if(!valid){this.reanchor(next);return result(false);}
  const delta=next.progress-previous.progress,fresh=Math.max(0,next.progress-this.highWater);
  if(delta>EPS&&fresh>0)this.distance+=travel*clamp(fresh/delta,0,1);
  this.highWater=Math.max(this.highWater,next.progress);this.previous=next;
  for(const gate of gates){
   if(this.isCollected(gate))continue;
   if(gate.type!=='gem'){if(delta>EPS&&sweptGateCrossing(previous,next,gate,collider)&&this.claim(gate))gained.push(gate);continue;}
   let magnet=this.magnets.get(gate.id);
   if(!magnet&&sweptGemPickup(previous,next,gate)){magnet={age:0,origin:{x:gate.x,y:gate.y,z:gate.z},position:{x:gate.x,y:gate.y,z:gate.z}};this.magnets.set(gate.id,magnet);}
   if(magnet){magnet.age+=dt;const p=magnet.position,o=magnet.origin,t=clamp(magnet.age/.24,0,1),blend=t*t*(3-2*t);p.x=o.x+(next.x-o.x)*blend;p.y=o.y+(next.y+1.35-o.y)*blend;p.z=o.z+(next.z-o.z)*blend;
    if(magnet.age>=.24||(magnet.age>=.06&&Math.hypot(p.x-next.x,p.y-next.y-1.35,p.z-next.z)<.48)){this.magnets.delete(gate.id);if(this.claim(gate))gained.push(gate);}
   }
  }
  const liveIds=new Set(gates.map(g=>g.id));for(const id of this.magnets.keys())if(!liveIds.has(id))this.magnets.delete(id);
  while(this.distance+EPS>=this.nextMilestone){
   milestones.push(this.nextMilestone);this.nextMilestone=this.nextMilestone===100?250:this.nextMilestone===250?500:this.nextMilestone===500?1000:this.nextMilestone+1000;
  }
  // Reclaim on physical route progress even when every gate was missed. The
  // state is fixed-size and old rewards remain unavailable after regeneration.
  this.retireBefore(Math.floor(this.highWater/CHUNK_LENGTH)-this.capacity+1);
  return result(true);
 }
 get liveRewardChunks(){let count=0;for(const index of this.rewardChunks)if(Number.isFinite(index))count++;return count;}
}
export const createJourney=options=>new JourneyState(options);
export function formatDistance(meters){const n=Math.max(0,Number.isFinite(meters)?meters:0);return n<1000?`${Math.floor(n)} m`:`${(n/1000).toFixed(n<10000?2:1)} km`;}
