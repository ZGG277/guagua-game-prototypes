/** R11.1 human-proportioned 2D visual rig. Physics is read-only: planted palms
 * and soles are the original R11 surface samples. This is not a 3D skeleton or
 * cloth solver. Side-biased elbows/knees replace the old radial frog fold. */
import {twoBone} from './wall-cling-pose.mjs?v=20261101-cling-r11';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const mean=ps=>({x:ps.reduce((s,p)=>s+p.x,0)/ps.length,y:ps.reduce((s,p)=>s+p.y,0)/ps.length});
const add=(a,b,s=1)=>({x:a.x+b.x*s,y:a.y+b.y*s});
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function chain(start,end,k,facing){
 const dx=end.x-start.x,dy=end.y-start.y,d=Math.hypot(dx,dy)||1;
 // Anatomical flexion side is fixed. Picking whichever elbow is closest to a
 // moving external pole caused 23px flips when a hand crossed shoulder height.
 return twoBone(start,end,12*k,12*k,{x:start.x+facing*dy/d*100*k,y:start.y-facing*dx/d*100*k});
}
function rig({foot,feet,hands,hip,shoulder,k,facing,...state}){
 const dx=hip.x-shoulder.x,dy=hip.y-shoulder.y,torsoLength=Math.hypot(dx,dy),u={x:dx/torsoLength,y:dy/torsoLength},lateral={x:u.y,y:-u.x};
 // A three-quarter view has narrow projected shoulder/hip spacing. It does not
 // spread a frontal pelvis across a side-on leaf. Bone lengths stay fixed.
 const shoulders=[-1,1].map(s=>add(shoulder,lateral,s*2.3*k)),hips=[-1,1].map(s=>add(hip,lateral,s*1.7*k));
 // Elbows flex behind/down; knees flex forward. Sharing their flexion side
 // was the old raised-elbow / mantis silhouette even when all lengths passed.
 const arms=hands.map((p,i)=>chain(shoulders[i],p,k,-facing));
 const legs=feet.map((p,i)=>chain(hips[i],p,k,facing));
 const n={x:-facing*lateral.x,y:-facing*lateral.y};
 const points=[...hands,...feet,...arms.map(a=>a.joint),...legs.map(a=>a.joint),add(shoulder,u,-16*k),add(hip,u,8*k)];
 const minX=Math.min(...points.map(p=>p.x))-8*k,maxX=Math.max(...points.map(p=>p.x))+8*k,minY=Math.min(...points.map(p=>p.y))-2*k,maxY=Math.max(...points.map(p=>p.y))+2*k;
 return{...state,k,facing,u,n,foot,feet,hands,hip,hips,shoulder,shoulders,torsoLength,origin:add(shoulder,u,torsoLength*.62),arms,legs,valid:arms.every(a=>a.reachable)&&legs.every(a=>a.reachable),bounds:{x:minX,y:minY,width:maxX-minX,height:maxY-minY},visibleWidth:maxX-minX,visibleHeight:maxY-minY};
}
export function clingingPose(wall,project,{width=390,overview=false,overviewScale=.45,releaseReference=null,releaseProgress=1}={}){
 const b=wall.body;if(!b.grounded||b.feet?.length!==2)return null;
 const k=Math.min(width,430)/390*(overview?overviewScale:1),feet=b.feet.map(project),foot=mean(feet),facing=b.supportLean||1,activeHands=b.hands?.length===2,acquiring=!activeHands&&b.plannedHands?.length===2;
 const reference=activeHands?b.hands.map(project):acquiring?b.plannedHands.map(project):releaseReference||[-1,1].map(s=>({x:foot.x+facing*9.36*k+s*2.86*k,y:foot.y-24*k}));
 const t=acquiring?clamp(b.clingAcquire||0,0,1):1,ease=smooth(t),fold=wall.input?wall.charge:clamp((b.compression||0)/.33,0,1);
 // Feet touch first. Over the existing 120ms unloaded reach the knees absorb
 // impact and the palms approach their unchanged physical anchors.
 const sink=(acquiring?3*ease:3)+fold*2.5*(acquiring?ease:1);
 const hip={x:foot.x-facing*3*k,y:foot.y-(22-sink)*k};
 const shoulder={x:foot.x+facing*1*k,y:hip.y-14.5*k};
 const relaxed=[-1,1].map(s=>({x:foot.x+facing*7*k+s*2.86*k,y:foot.y-22*k}));
 let hands=reference;
 if(acquiring)hands=reference.map((p,i)=>mix(relaxed[i],p,ease));
 else if(!activeHands)hands=reference.map((p,i)=>mix(p,relaxed[i],smooth(releaseProgress)));
 // Keep the fixed 24px chains inside their reach disks by a small pelvis /
 // torso lowering on short-screen or steep-foot projections. This moves only
 // the visual body, never a planted endpoint or a physical state.
 const dx=hip.x-shoulder.x,dy=hip.y-shoulder.y,d=Math.hypot(dx,dy),lat={x:dy/d,y:-dx/d};
 let away=0;
 for(let i=0;i<hands.length;i++){const start=add(shoulder,lat,(i?1:-1)*2.3*k),dy=hands[i].y-start.y,min=9.5*k;if(Math.abs(dy)<min)away=Math.max(away,Math.sqrt(min*min-dy*dy)-facing*(hands[i].x-start.x));}
 hip.x-=facing*away;shoulder.x-=facing*away;
 let lower=0;
 for(const [center,ends,spacing]of[[hip,feet,1.7],[shoulder,hands,2.3]])ends.forEach((end,i)=>{const start=add(center,lat,(i?1:-1)*spacing*k),reach=23.6*k,x=end.x-start.x;lower=Math.max(lower,end.y-Math.sqrt(Math.max(0,reach*reach-x*x))-start.y);});
 hip.y+=lower;shoulder.y+=lower;
 return rig({grounded:true,mode:activeHands?'four-contact-cling':acquiring?'acquiring-hands':'feet-only-release',phase:wall.input?'prepare':acquiring?'landing':b.phase,k,facing,foot,feet,hands,hip,shoulder,hand:mean(reference),reference,activeHands,acquiring,acquire:t,fold,bodyFit:lower,bodyAway:away,paintedFeet:feet.map(p=>({...p})),paintedHands:activeHands?hands.map(p=>({...p})):[]});
}
export function airbornePose(wall,project,{width=390,overview=false,overviewScale=.45,seed=null}={}){
 const b=wall.body,k=Math.min(width,430)/390*(overview?overviewScale:1),foot=project(b),age=Math.max(0,wall.time-wall.flightTime),facing=seed?.facing||b.supportLean||Math.sign(b.vx)||1;
 const fall=b.phase==='slipping'||wall.feedback.type==='slipped'||b.y<(wall.leaves[wall.lastLeaf]?.y??0)-.18;
 const rise=!fall&&b.vy>0,extend=Math.max(0,1-age/.14),tuck=fall?0:smooth((age-.10)/.15)*clamp(1+b.vy/2,0,1),blend=smooth(age/.14);
 const hipTarget={x:foot.x-facing*2*k,y:foot.y-(22+extend*1.5-tuck*4)*k};
 const shoulderTarget={x:foot.x+facing*1*k,y:hipTarget.y-17*k};
 const targetFeet=[-1,1].map((s,i)=>({x:foot.x+s*2.4*k+facing*tuck*2*k,y:foot.y-tuck*(i?5:7)*k}));
 const swing=fall?0:clamp(1+b.vy/2,0,1);
 const targetHands=[{x:shoulderTarget.x+facing*(7-10*swing)*k,y:shoulderTarget.y+20*k},{x:shoulderTarget.x+facing*(9+3*swing)*k,y:shoulderTarget.y+(15-23*swing)*k}];
 const shift=p=>({x:foot.x+p.x-seed.foot.x,y:foot.y+p.y-seed.foot.y});
 const from=(key,target)=>seed?mix(shift(seed[key]),target,blend):target;
 const hip=from('hip',hipTarget),shoulder=from('shoulder',shoulderTarget),hands=targetHands.map((p,i)=>{if(!seed)return p;const s=shift(seed.hands[i]),a=shift(seed.shoulder),v={x:s.x-a.x,y:s.y-a.y},z={x:p.x-shoulderTarget.x,y:p.y-shoulderTarget.y};let angle=Math.atan2(z.y,z.x)-Math.atan2(v.y,v.x);while(angle>Math.PI)angle-=2*Math.PI;while(angle<-Math.PI)angle+=2*Math.PI;const theta=Math.atan2(v.y,v.x)+angle*blend,r=Math.hypot(v.x,v.y)*(1-blend)+Math.hypot(z.x,z.y)*blend;return{x:shoulder.x+Math.cos(theta)*r,y:shoulder.y+Math.sin(theta)*r};}),feet=targetFeet.map((p,i)=>seed?mix(shift(seed.feet[i]),p,blend):p);
 return rig({grounded:false,mode:'free-flight',phase:fall?'fall':age<.14?'launch':rise?'air':'landing-reach',k,facing,foot,feet,hands,hip,shoulder,bootAngles:[facing*.10,facing*.06],activeHands:false,acquiring:false,fold:0,paintedFeet:[],paintedHands:[]});
}
