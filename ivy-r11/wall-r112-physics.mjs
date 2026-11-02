/** R11.2: unchanged R11 jump/slide law plus a small, actual-edge rescue.
 * This subclass keeps historical R11 fixtures intact. No centre snap, remote
 * catch, repeated midair retry or progress award before real two-foot support. */
import {Wall,worldSurface,launchVelocity,CHARGE_TIME,DT,clamp} from './wall-physics.mjs';
import {reviseCourse} from './wall-r112-course.mjs';
export const EDGE_RESCUE=Object.freeze({reach:.08333333333333333,catch:.08,pull:.18,step:.22,settle:.10,maxSpeedX:2.2,startVyMin:-.8,startVyMax:.8,lockVyMin:-2.2,lockVyMax:.8,startGapMin:.10,startGapMax:.20,lockGapMin:.10,lockGapMax:.26,maxOutside:.24,minOutside:.025,palmInset:.018,footInset:.11,maxArmPx:22});
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const sample=(l,p)=>{const s=worldSurface(l,p.x,p.z);return s?{...p,...s,leafId:l.id}:null;};
/** Nearest real lateral silhouette at a fixed depth. Only search inward from
 * an outside point; a blade interior or lobe notch is not an invisible ledge. */
function inwardEdge(l,x,z,side){
 if(worldSurface(l,x,z))return null;
 let outside=x,inside=null;
 for(let distance=.012;distance<=.276;distance+=.012){const probe=x-side*distance;if(worldSurface(l,probe,z)){inside=probe;break;}outside=probe;}
 if(inside===null)return null;
 for(let i=0;i<10;i++){const middle=(inside+outside)/2;if(worldSurface(l,middle,z))inside=middle;else outside=middle;}
 const at=worldSurface(l,inside,z);return at?{x:inside,z,...at}:null;
}
export class WallR112 extends Wall{
 constructor(){super({hundred:true});}
 reset(){super.reset();reviseCourse(this.leaves);this.edgeReach=null;this.edgeAttempt=null;this.contacts();return this;}
 launch(vx,vy){super.launch(vx,vy);this.edgeReach=null;this.edgeAttempt=null;}
 tick(dt){super.tick(dt);if(this.body.grounded){this.edgeReach=null;}else if(this.edgeReach&&!this.grip){this.body.phase='edge-reaching';this.body.plannedHands=this.edgeReach.hands.map(p=>sample(this.leaves[this.edgeReach.leafId],p)).filter(Boolean);this.body.reachProgress=clamp((this.time-this.edgeReach.started)/EDGE_RESCUE.reach,0,1);}}
 edgeCandidate(){
  const b=this.body,c=EDGE_RESCUE,id=this.lastLeaf+1,l=this.leaves[id];
  if(!l||b.grounded||this.completed||b.vy<c.startVyMin||b.vy>c.startVyMax||Math.abs(b.vx)>c.maxSpeedX||this.edgeAttempt===id)return null;
  const middle=l.x+Math.tan(l.rotation)*(b.z-l.z),side=b.x>=middle?1:-1;
  if(b.vx*(-side)<.04)return null; // moving away/tangential misses stay misses
  const edge=inwardEdge(l,b.x,b.z,side);if(!edge)return null;
  const gap=edge.y-b.y,outside=(b.x-edge.x)*side;if(gap<c.startGapMin||gap>c.startGapMax||outside<c.minOutside||outside>c.maxOutside)return null;
  const hands=[-.025,.025].map(dz=>{const hz=b.z-.03+dz,e=inwardEdge(l,b.x,hz,side);return e?sample(l,{x:e.x-side*c.palmInset,z:hz}):null;});
  if(hands.some(h=>!h))return null;
  const feet=[-.065,.065].map(dx=>sample(l,{x:edge.x-side*c.footInset+dx,z:b.z-.03}));if(feet.some(f=>!f))return null;
  const plan={kind:'edge-rescue',leafId:id,sourceId:this.lastLeaf,side,edge:{x:edge.x,z:edge.z},hands:hands.map(({x,z})=>({x,z})),feet:feet.map(({x,z})=>({x,z})),started:this.time};
  return this.edgeReachable(plan,false)?plan:null;
 }
 edgeReachable(g,locking){
  const b=this.body,c=EDGE_RESCUE,l=this.leaves[g.leafId],hands=g.hands.map(p=>sample(l,p)),feet=g.feet.map(p=>sample(l,p));if(hands.some(h=>!h)||feet.some(f=>!f))return null;
  // Both samples remain close to the actual silhouette, not buried deep inside
  // a newly rotated/deformed blade. Their XZ anchors never drift during a grip.
  const edge=sample(l,g.edge);if(!edge)return null;
  const gap=(hands[0].y+hands[1].y)/2-b.y,outside=(b.x-g.edge.x)*g.side;
  if(gap<(locking?c.lockGapMin:.07)||gap>c.lockGapMax||outside<c.minOutside||outside>c.maxOutside||b.vy<c.lockVyMin||b.vy>c.lockVyMax||Math.abs(b.vx)>c.maxSpeedX||b.vx*(-g.side)<.02)return null;
  const shoulder={x:b.x-g.side*.05,y:b.y+.18,z:b.z};
  if(hands.some(h=>Math.hypot((h.x-shoulder.x)*52,-(h.y-shoulder.y)*230+(h.z-shoulder.z)*28)>c.maxArmPx))return null;
  return{hands,feet,edge,gap,outside};
 }
 tryCatch(){
  if(this.body.grounded||this.grip)return false;
  if(this.edgeReach){const g=this.edgeReach,targets=this.edgeReachable(g,true);if(!targets){this.edgeReach=null;this.body.plannedHands=[];this.body.reachProgress=0;return false;}
   if(this.time-g.started+1e-10<EDGE_RESCUE.reach)return false;
   const b=this.body;this.cancel();this.edgeReach=null;
   this.grip={...g,phase:'catch',phaseProgress:0,firstFootIndex:g.side>0?1:0,age:0,lockedAt:this.time,start:{x:b.x,y:b.y,z:b.z},incoming:{vx:b.vx,vy:b.vy,vz:b.vz},handTargets:targets.hands,footTargets:targets.feet};
   b.hands=targets.hands;b.plannedHands=[];b.feet=[null,null];b.plannedFeet=targets.feet;b.handLoad=1;b.clingStrength=1;b.reachProgress=1;b.climbProgress=0;b.vx=0;b.vy=0;b.vz=0;b.phase='edge-catch';this.status='climbing';this.feedback={type:'edge-caught',leaf:g.leafId,time:this.time};return true;
  }
  const g=this.edgeCandidate();if(!g)return false;
  this.edgeAttempt=g.leafId;this.edgeReach=g;this.body.plannedHands=g.hands.map(p=>sample(this.leaves[g.leafId],p));this.body.reachProgress=0;return false;
 }
 abortEdge(){const b=this.body,target=this.grip?.leafId??this.edgeReach?.leafId;this.grip=null;this.edgeReach=null;const vx=b.vx,vy=Math.min(b.vy,-.2);super.launch(vx,vy);this.edgeAttempt=target;b.phase='falling';this.status='flying';this.feedback={type:'edge-lost',time:this.time};}
 tickGrip(dt){
  const g=this.grip;if(g?.kind!=='edge-rescue')return super.tickGrip(dt);
  const b=this.body,l=this.leaves[g.leafId],c=EDGE_RESCUE,hands=g.hands.map(p=>sample(l,p)),feet=g.feet.map(p=>sample(l,p));
  if(hands.some(h=>!h)||feet.some(f=>!f)){this.abortEdge();return;}
  g.age+=dt;g.handTargets=hands;g.footTargets=feet;
  const top=(feet[0].y+feet[1].y)/2,landingX=(feet[0].x+feet[1].x)/2,landingZ=(feet[0].z+feet[1].z)/2,old={x:b.x,y:b.y,z:b.z};
  const catchEnd=c.catch,pullEnd=catchEnd+c.pull,stepEnd=pullEnd+c.step,total=stepEnd+c.settle;
  let first=false,second=false,held=true;
  if(g.age<catchEnd){g.phase='catch';g.phaseProgress=clamp(g.age/c.catch,0,1);const t=smooth(g.phaseProgress);b.x=g.start.x;b.z=g.start.z;b.y=g.start.y-.012*t;}
  else if(g.age<pullEnd){g.phase='pull';g.phaseProgress=clamp((g.age-catchEnd)/c.pull,0,1);const t=smooth(g.phaseProgress);b.x=g.start.x;b.z=g.start.z;b.y=mix(g.start.y-.012,top-.075,t);}
  else if(g.age<stepEnd){g.phase='step';const p=clamp((g.age-pullEnd)/c.step,0,1),t=smooth(p);g.phaseProgress=p;b.x=mix(g.start.x,landingX,t);b.z=mix(g.start.z,landingZ,t);b.y=mix(top-.075,top-.015,t);first=p>=.28;second=p>=.78;held=p<.42;b.handLoad=held?clamp((.42-p)/.14,0,1):0;}
  else{g.phase='settle';g.phaseProgress=clamp((g.age-stepEnd)/c.settle,0,1);const t=smooth(g.phaseProgress);b.x=landingX;b.z=landingZ;b.y=mix(top-.015,top,t);first=true;second=true;held=false;}
  b.hands=held?hands:[];b.handLoad=held?(g.phase==='step'?b.handLoad:1):0;b.clingStrength=b.handLoad;b.feet=feet.map((f,i)=>(i===g.firstFootIndex?first:second)?f:null);b.plannedFeet=feet;b.plannedHands=[];b.phase='edge-'+g.phase;b.climbProgress=clamp(g.age/total,0,1);b.vx=(b.x-old.x)/dt;b.vy=(b.y-old.y)/dt;b.vz=(b.z-old.z)/dt;
  if(g.age+1e-10>=total){
   this.standId=l.id;this.grip=null;b.grounded=true;b.vx=0;b.vy=0;b.vz=0;b.compression=.22;b.stanceWidth=.065;b.phase='landing';this.landTime=this.time;this.status='grounded';this.contacts();b.plannedFeet=[];b.reachProgress=0;b.climbProgress=0;this.bestHeight=Math.max(this.bestHeight,this.height);this.bestLeafId=Math.max(this.bestLeafId,l.id);this.feedback={type:'edge-climbed',leaf:l.id,time:this.time};if(l.goal){this.completed=true;this.status='won';b.phase='celebrate';this.feedback={type:'complete',time:this.time};}
  }
 }
 previewRelease({power=this.charge,aim=this.aimValue}={}){
  if(!this.stable||this.grip)return null;power=clamp(Number.isFinite(power)?power:0,0,1);aim=clamp(Number.isFinite(aim)?aim:0,-1,1);
  const predicted=Object.assign(Object.create(WallR112.prototype),structuredClone(this)),sourceId=this.standId,sourceY=this.currentLeaf.y,start=this.time,falls=this.falls,targetId=predicted.guidance()?.targetId??null;
  predicted._previewLazyGeometry=true;predicted.cancel();predicted.aim(aim);predicted.down(0,power);predicted.up();
  const points=[{x:predicted.body.x,y:predicted.body.y,z:predicted.body.z,time:0}];let usedGrip=false;
  for(let n=0;n<360&&!predicted.body.grounded;n++){predicted.step(DT);usedGrip||=!!predicted.grip;if(predicted.falls>falls)break;if(n%6===5||predicted.body.grounded)points.push({x:predicted.body.x,y:predicted.body.y,z:predicted.body.z,time:predicted.time-start});}
  const landing=predicted.falls===falls&&predicted.body.grounded?{leafId:predicted.standId,x:predicted.body.x,y:predicted.body.y,z:predicted.body.z}:null,outcome=predicted.falls>falls?'fall':!landing?'airborne':landing.leafId===sourceId?'return':predicted.currentLeaf.y<sourceY-.1?'lower':'land';
  return{kind:'release-now-simulation',power,aim,targetId,outcome,onTarget:landing?.leafId===targetId,landing,points,seconds:predicted.time-start,usedGrip};
 }
}
