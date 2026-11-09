/** R11.2 slightly longer human-proportioned 2D visual rig. Physics is read-only: planted palms
 * and soles are the original R11 surface samples. This is not a 3D skeleton or
 * cloth solver. Side-biased elbows/knees replace the old radial frog fold. */
import {twoBone} from './wall-cling-pose.mjs?v=20261101-cling-r11';
import {worldSurface} from './wall-physics.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const mean=ps=>({x:ps.reduce((s,p)=>s+p.x,0)/ps.length,y:ps.reduce((s,p)=>s+p.y,0)/ps.length});
const add=(a,b,s=1)=>({x:a.x+b.x*s,y:a.y+b.y*s});
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function chain(start,end,k,facing,turn=0){
 const dx=end.x-start.x,dy=end.y-start.y,d=Math.hypot(dx,dy)||1;
 // Anatomical flexion side is fixed. Picking whichever elbow is closest to a
 // moving external pole caused 23px flips when a hand crossed shoulder height.
 const a=twoBone(start,end,13*k,13*k,{x:start.x+facing*dy/d*100*k,y:start.y-facing*dx/d*100*k});
 if(turn>0){const middle={x:(start.x+end.x)/2,y:(start.y+end.y)/2},v={x:a.joint.x-middle.x,y:a.joint.y-middle.y},c=Math.cos(Math.PI*turn);a.joint={x:middle.x+v.x*c,y:middle.y+v.y*c};a.jointDepth=Math.hypot(v.x,v.y)*Math.sin(Math.PI*turn);}
 return a;
}
function rig({foot,feet,hands,hip,shoulder,k,facing,turn=0,...state}){
 const dx=hip.x-shoulder.x,dy=hip.y-shoulder.y,torsoLength=Math.hypot(dx,dy),u={x:dx/torsoLength,y:dy/torsoLength},lateral={x:u.y,y:-u.x};
 // A three-quarter view has narrow projected shoulder/hip spacing. It does not
 // spread a frontal pelvis across a side-on leaf. Bone lengths stay fixed.
 const shoulders=[-1,1].map(s=>add(shoulder,lateral,s*2.3*k)),hips=[-1,1].map(s=>add(hip,lateral,s*1.7*k));
 // Elbows flex behind/down; knees flex forward. Sharing their flexion side
 // was the old raised-elbow / mantis silhouette even when all lengths passed.
 const arms=hands.map((p,i)=>chain(shoulders[i],p,k,-facing,turn));
 const legs=feet.map((p,i)=>chain(hips[i],p,k,facing,turn));
 const turnScale=Math.cos(Math.PI*turn),n={x:-facing*lateral.x*turnScale,y:-facing*lateral.y*turnScale};
 // Bounds include the new rear needle sword, not just hands and feet.
 const pinTip=add(add(shoulder,n,29*k),u,torsoLength*.62+7*k);
 const points=[...hands,...feet,...arms.map(a=>a.joint),...legs.map(a=>a.joint),add(shoulder,u,-16*k),add(hip,u,10*k),pinTip];
 const minX=Math.min(...points.map(p=>p.x))-8*k,maxX=Math.max(...points.map(p=>p.x))+8*k,minY=Math.min(...points.map(p=>p.y))-2*k,maxY=Math.max(...points.map(p=>p.y))+2*k;
 return{...state,k,facing,turn,u,n,foot,feet,hands,hip,hips,shoulder,shoulders,torsoLength,origin:add(shoulder,u,torsoLength*.62),arms,legs,valid:arms.every(a=>a.reachable)&&legs.every(a=>a.reachable),bounds:{x:minX,y:minY,width:maxX-minX,height:maxY-minY},visibleWidth:maxX-minX,visibleHeight:maxY-minY};
}
export function clingingPose(wall,project,{width=390,overview=false,overviewScale=.45,releaseReference=null,releaseProgress=1}={}){
 const b=wall.body;if(!b.grounded||b.feet?.length!==2)return null;
 const k=Math.min(width,430)/390*(overview?overviewScale:1),feet=b.feet.map(project),foot=mean(feet),facing=b.supportLean||1,activeHands=b.hands?.length===2,acquiring=!activeHands&&b.plannedHands?.length===2;
 const reference=activeHands?b.hands.map(project):acquiring?b.plannedHands.map(project):releaseReference||[-1,1].map(s=>({x:foot.x+facing*9.36*k+s*2.86*k,y:foot.y-24*k}));
 const t=acquiring?clamp(b.clingAcquire||0,0,1):1,ease=smooth(t),fold=wall.input?wall.charge:clamp((b.compression||0)/.33,0,1);
 // Feet touch first. Over the existing 120ms unloaded reach the knees absorb
 // impact and the palms approach their unchanged physical anchors.
 const sink=(acquiring?3*ease:3)+fold*2.8*(acquiring?ease:1);
 const hip={x:foot.x-facing*3*k,y:foot.y-(23-sink)*k};
 const shoulder={x:foot.x+facing*1*k,y:hip.y-17.5*k};
 const relaxed=[-1,1].map(s=>({x:foot.x+facing*7*k+s*2.86*k,y:foot.y-22*k}));
 let hands=reference;
 if(acquiring)hands=reference.map((p,i)=>mix(relaxed[i],p,ease));
 else if(!activeHands)hands=reference.map((p,i)=>mix(p,relaxed[i],smooth(releaseProgress)));
 // Keep the fixed 26px chains inside their reach disks by a small pelvis /
 // torso lowering on short-screen or steep-foot projections. This moves only
 // the visual body, never a planted endpoint or a physical state.
 const dx=hip.x-shoulder.x,dy=hip.y-shoulder.y,d=Math.hypot(dx,dy),lat={x:dy/d,y:-dx/d};
 let away=0;
 for(let i=0;i<hands.length;i++){const start=add(shoulder,lat,(i?1:-1)*2.3*k),dy=hands[i].y-start.y,min=10.4*k;if(Math.abs(dy)<min)away=Math.max(away,Math.sqrt(min*min-dy*dy)-facing*(hands[i].x-start.x));}
 hip.x-=facing*away;shoulder.x-=facing*away;
 let lower=0;
 for(const [center,ends,spacing]of[[hip,feet,1.7],[shoulder,hands,2.3]])ends.forEach((end,i)=>{const start=add(center,lat,(i?1:-1)*spacing*k),reach=25.6*k,x=end.x-start.x;lower=Math.max(lower,end.y-Math.sqrt(Math.max(0,reach*reach-x*x))-start.y);});
 hip.y+=lower;shoulder.y+=lower;
 return rig({grounded:true,mode:activeHands?'four-contact-cling':acquiring?'acquiring-hands':'feet-only-release',phase:wall.input?'prepare':acquiring?'landing':b.phase,k,facing,foot,feet,hands,hip,shoulder,hand:mean(reference),reference,activeHands,acquiring,acquire:t,fold,bodyFit:lower,bodyAway:away,paintedFeet:feet.map(p=>({...p})),paintedHands:activeHands?hands.map(p=>({...p})):[]});
}
export function airbornePose(wall,project,{width=390,overview=false,overviewScale=.45,seed=null}={}){
 const b=wall.body,k=Math.min(width,430)/390*(overview?overviewScale:1),foot=project(b),age=Math.max(0,wall.time-wall.flightTime),facing=seed?.facing||b.supportLean||Math.sign(b.vx)||1;
 const fall=b.phase==='slipping'||wall.feedback.type==='slipped'||b.y<(wall.leaves[wall.lastLeaf]?.y??0)-.18;
 const rise=!fall&&b.vy>0,extend=Math.max(0,1-age/.14),tuck=fall?0:smooth((age-.10)/.15)*clamp(1+b.vy/2,0,1),blend=smooth(age/.14);
 const hipTarget={x:foot.x-facing*2*k,y:foot.y-(24+extend*1.5-tuck*4)*k};
 const shoulderTarget={x:foot.x+facing*1*k,y:hipTarget.y-18*k};
 const targetFeet=[-1,1].map((s,i)=>({x:foot.x+s*2.4*k+facing*tuck*2*k,y:foot.y-tuck*(i?5:7)*k}));
 const swing=fall?0:clamp(1+b.vy/2,0,1);
 const targetHands=[{x:shoulderTarget.x+facing*(7-10*swing)*k,y:shoulderTarget.y+20*k},{x:shoulderTarget.x+facing*(9+3*swing)*k,y:shoulderTarget.y+(15-23*swing)*k}];
 const shift=p=>({x:foot.x+p.x-seed.foot.x,y:foot.y+p.y-seed.foot.y});
 const from=(key,target)=>seed?mix(shift(seed[key]),target,blend):target;
 const hip=from('hip',hipTarget),shoulder=from('shoulder',shoulderTarget),hands=targetHands.map((p,i)=>{if(!seed)return p;const s=shift(seed.hands[i]),a=shift(seed.shoulder),v={x:s.x-a.x,y:s.y-a.y},z={x:p.x-shoulderTarget.x,y:p.y-shoulderTarget.y};let angle=Math.atan2(z.y,z.x)-Math.atan2(v.y,v.x);while(angle>Math.PI)angle-=2*Math.PI;while(angle<-Math.PI)angle+=2*Math.PI;const theta=Math.atan2(v.y,v.x)+angle*blend,r=Math.hypot(v.x,v.y)*(1-blend)+Math.hypot(z.x,z.y)*blend;return{x:shoulder.x+Math.cos(theta)*r,y:shoulder.y+Math.sin(theta)*r};}),feet=targetFeet.map((p,i)=>seed?mix(shift(seed.feet[i]),p,blend):p);
 return rig({grounded:false,mode:'free-flight',phase:fall?'fall':age<.14?'launch':rise?'air':'landing-reach',k,facing,foot,feet,hands,hip,shoulder,bootAngles:[facing*.10,facing*.06],activeHands:false,acquiring:false,fold:0,paintedFeet:[],paintedHands:[]});
}

const quadratic=(a,c,b,t)=>({x:(1-t)*(1-t)*a.x+2*(1-t)*t*c.x+t*t*b.x,y:(1-t)*(1-t)*a.y+2*(1-t)*t*c.y+t*t*b.y});
/** Six-stage reference is reconstructed from the real fixed palm/sole targets.
 * The artwork is not cut into animation frames. Unplanted feet may swing; a
 * planted hand/foot is never interpolated away from its physical surface. */
export function edgePose(wall,project,options={}){
 const g=wall.grip?.kind==='edge-rescue'?wall.grip:null,reach=wall.edgeReach;
 if(!g&&!reach)return null;
 const b=wall.body,k=Math.min(options.width||390,430)/390*(options.overview?(options.overviewScale??.45):1),facing=-(g?.side??reach.side),foot=project(b);
 const targets=(g?.handTargets||b.plannedHands).map(project),hand=mean(targets);
 if(!g){
  const free=airbornePose(wall,project,options),t=smooth(b.reachProgress||0),hangShoulder={x:hand.x+reach.side*8*k,y:hand.y+8*k};
  const shoulder=mix(free.shoulder,hangShoulder,t),hip=mix(free.hip,{x:hand.x+reach.side*11*k,y:hand.y+26*k},t);
  const hands=targets.map((h,i)=>{const a={x:free.hands[i].x-free.shoulder.x,y:free.hands[i].y-free.shoulder.y},z={x:h.x-hangShoulder.x,y:h.y-hangShoulder.y};let delta=Math.atan2(z.y,z.x)-Math.atan2(a.y,a.x);while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;const theta=Math.atan2(a.y,a.x)+delta*t,length=Math.hypot(a.x,a.y)*(1-t)+Math.hypot(z.x,z.y)*t;return{x:shoulder.x+Math.cos(theta)*length,y:shoulder.y+Math.sin(theta)*length};});
  const feet=free.feet.map((f,i)=>mix(f,{x:hand.x+reach.side*10*k+(i?1:-1)*2.4*k,y:hand.y+48*k},t));
  return rig({...free,phase:'edge-reaching',mode:'edge-reaching',hands,feet,hip,shoulder,facing,paintedHands:[],paintedFeet:[]});
 }
 const phase=g.phase,p=g.phaseProgress||0,feetTarget=g.footTargets.map(project),targetFoot=mean(feetTarget),first=g.firstFootIndex??(g.side>0?1:0),pull=g.phase==='catch'?0:g.phase==='pull'?smooth(p):1;
 const hangHip={x:hand.x+g.side*11*k,y:hand.y+26*k},hangShoulder={x:hand.x+g.side*8*k,y:hand.y+8*k};
 const mantleHip={x:hand.x+g.side*7*k,y:hand.y-13*k},mantleShoulder={x:hand.x-facing*-9*k,y:hand.y-21*k};
 let shoulder=quadratic(hangShoulder,{x:hand.x+g.side*20*k,y:hand.y-18*k},mantleShoulder,pull);
 const turn=pull*Math.atan2(g.side*16,8);let hip={x:shoulder.x+Math.sin(turn+Math.atan2(g.side*3,18))*18.25*k,y:shoulder.y+Math.cos(turn+Math.atan2(g.side*3,18))*18.25*k};
 const landingNormal=worldSurface(wall.leaves[g.leafId],(g.feet[0].x+g.feet[1].x)/2,(g.feet[0].z+g.feet[1].z)/2)?.normal||g.footTargets[0].normal,goalFacing=landingNormal.x<=0?1:-1;
 const goalWall={...wall,input:null,body:{...b,supportLean:goalFacing,grounded:true,feet:g.footTargets,hands:[],plannedHands:[],compression:.22,phase:'landing'}};
 const goal=clingingPose(goalWall,project,options),release=g.phase==='step'?smooth((p-.42)/.58):g.phase==='settle'?1:0;
 if(release){hip=mix(hip,goal.hip,release);shoulder=mix(shoulder,goal.shoulder,release);}
 const hands=b.hands.length===2?b.hands.map(project):targets.map((h,i)=>mix(h,goal.hands[i],release));
 const feet=[0,1].map(i=>{
  if(b.feet?.[i])return project(b.feet[i]);
  const start={x:hand.x+g.side*(9+(i===first?-1:1))*k,y:hand.y+8*k},control={x:hand.x+g.side*7*k,y:hand.y-15*k};
  const hang={x:hand.x+g.side*10*k+(i?1:-1)*2.4*k,y:hand.y+48*k};
  if(g.phase==='catch')return hang;
  if(g.phase==='pull'){const f=mix(hang,start,pull),dx=f.x-hip.x,dy=f.y-hip.y,d=Math.hypot(dx,dy);return d>24*k?{x:hip.x+dx/d*24*k,y:hip.y+dy/d*24*k}:f;}
  const t=i===first?clamp(p/.28,0,1):clamp((p-.42)/.36,0,1);
  return quadratic(start,control,feetTarget[i],smooth(t));
 });
 const pose=rig({turn:goalFacing!==facing?release:0,grounded:false,mode:'edge-rescue',phase:'edge-'+phase,k,facing,foot,feet,hands,hip,shoulder,activeHands:b.hands.length===2,acquiring:false,fold:0,paintedFeet:(b.feet||[]).map(f=>f?project(f):null),paintedHands:b.hands.map(project),bootAngles:[0,0],hand,reference:targets});
 pose.bootAngles=feet.map((_,i)=>{const f=b.feet?.[i];if(!f)return facing*.1;const a=project(f),q=project({x:f.x+f.normal.y,y:f.y-f.normal.x,z:f.z});return Math.atan2(q.y-a.y,q.x-a.x);});
 return pose;
}
