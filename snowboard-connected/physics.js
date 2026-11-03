export {createSnowAudio} from './snow-audio.js';
export {createGestures} from './gestures.js';
export {deckLift} from './collision-avatar.js';
import {BOARD,boardYawInertiaDelta} from './board-model.js';
export {BOARD,boardSection} from './board-model.js';
import {detailedMove,hasDetailedWorld,hasDetailedTrailNear,snapshotPose,setDetailedWorld,isDetailedPoseClear,isDetailedPosePathClear} from './collision-detailed.js';
export {setDetailedWorld,isDetailedPoseClear,isDetailedPosePathClear};
import {moveWithCollisions} from './collision.js';
import {surfaceAt,TERRAIN,COURSE,COLLIDERS,tangentVector,tangentComponents,chartVelocity,transportTangent} from './terrain.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const MODEL=Object.freeze({mass:75,gravity:9.81,...TERRAIN,edgeResponse:28,comResponse:20,halfStance:BOARD.halfStance,yawInertia:32+boardYawInertiaDelta,glide:.027,flatShear:.065,edgeShear:.82,sidecut:.115,airDrag:.0045,solverIterations:8});
export function initial(mode='straight',stance=1){return {x:0,z:8,vx:0,vz:0,stance,protectionReason:null,collisionCount:0,lastCollision:null,lookAlong:1,heading:mode==='heel'?stance*Math.PI/2:mode==='toe'?-stance*Math.PI/2:mode==='turn'?.45:0,yawRate:0,edge:0,twist:0,com:0,weightTransfer:0,frontLoad:.5,rearLoad:.5,frontForce:0,rearForce:0,yawTorque:0,snowWork:0,slip:0,distance:0,frictionWork:0,frictionEnergyDelta:0,gripUse:0,maxContactEnergyIncrease:0,normalLoad:0,gravityDown:0,grade:0,curvature:0,catchRisk:0,catchExposure:0,caught:0,airHeight:0,vy:0,airborne:false,pitch:0,jumpTime:0,jumpKind:null,jumpCount:0,landingCount:0,compression:0,gestureCompression:0,frontEdge:0,rearEdge:0,frontPressure:0,rearPressure:0,_accumulator:0};}
const energy=(s,m,I)=>.5*m*(s.vx*s.vx+s.vz*s.vz)+.5*I*s.yawRate*s.yawRate;
// Finite leg-powered impulses, never horizontal thrust or position teleport.
export function requestJump(s,kind){if(s.caught||s.airborne)return false;if(s.jumpKind){if(kind==='jump'&&['front','rear'].includes(s.jumpKind)&&s.jumpTime<=.15){s.jumpKind='jump';s.jumpTime=0;return true;}return false;}s.jumpKind=kind;s.jumpTime=0;s.jumpCount++;return true;}
function advanceJump(s,h,p){
 if(!s.jumpKind)return;
 s.jumpTime+=h;const t=s.jumpTime;
 if(s.jumpKind==='front'||s.jumpKind==='rear'){
  // Bound feet stay attached: lift the requested end around the opposite end.
  s.pitch=(s.jumpKind==='front'?1:-1)*.13*Math.sin(Math.PI*Math.min(1,t/.48));
  if(t>=.48){s.pitch=0;s.jumpKind=null;}return;
 }
 const ollie=s.jumpKind==='ollie',load=ollie?.19:.11;
 // Continuous load → tail-pop → level/tuck → prepare-to-land wave. Pitch is
 // part of the authoritative board collision pose, never a detached animation.
 const flight=Math.max(0,t-load);
 if(ollie){if(t<load)s.pitch=.23*Math.sin(t/load*Math.PI/2);else if(flight<.14)s.pitch=.23+.045*Math.sin(flight/.14*Math.PI);else if(flight<.54){const u=(flight-.14)/.4;s.pitch=.23*(1-u*u*(3-2*u));}else s.pitch=-.055*Math.sin(Math.PI*Math.min(1,(flight-.54)/.55));}
 else s.pitch=s.airborne?.045*Math.sin(Math.PI*Math.min(1,flight/.8)):0;
 s.jumpCompression=t<load?(ollie?.95:.68)*Math.sin(t/load*Math.PI/2):ollie?(flight<.14?.95*(1-flight/.14):.58*Math.sin(Math.PI*Math.min(1,(flight-.14)/.82))):.32*Math.sin(Math.PI*Math.min(1,flight/.8));
 if(!s.airborne&&t>=load&&t<load+h*1.5){const terrain=surfaceAt(s.x,s.z,p),impulse=ollie?5.15:4.55,worldVz=s.vz/terrain.metric,world=tangentVector(terrain,s.vx,s.vz);s.takeoffSpeed=Math.hypot(s.vx,s.vz);s.airborne=true;s.airHeight=.00001;s.vy=world.y+impulse*terrain.normalY;s.vx=world.x+impulse*terrain.normalX;s.vz=(world.z+impulse*terrain.normalZ)*terrain.metric;s.jumpEnergy=.5*p.mass*impulse**2;}
 if(t>load+1.8&&!s.airborne){s.jumpKind=null;s.pitch=0;s.jumpCompression=0;}
}
function airTick(s,h,p,startBoard,startPose){
 const collisionBefore=s.collisionCount,surf=surfaceAt(s.x,s.z,p),worldY=surfaceAt(startBoard.x,startBoard.z,p).height+s.airHeight;
 const worldVz=s.vz/surf.metric;const air=1/(1+p.airDrag*Math.hypot(s.vx,worldVz,s.vy)*h);s.vx*=air;s.vy=(s.vy-p.gravity*h)*air;s.yawRate*=Math.exp(-.35*h);
 s.heading+=s.yawRate*h;const target={x:startBoard.x+s.vx*h,z:startBoard.z+worldVz*air*h};s.airHeight=worldY+s.vy*h-surfaceAt(target.x,target.z,p).height;s.vz=worldVz*air*surfaceAt(target.x,target.z,p).metric;if(s.airHeight<=0){s.airHeight=0;s.pitch=0;}
 s.normalLoad=0;s.frontForce=0;s.rearForce=0;s.snowWork=0;s.slip=0;s.frictionWork=0;s.frictionEnergyDelta=0;s.catchRisk=0;
 let b=target;if(p.collisions!==false){if((s.riderBodyReady||hasDetailedTrailNear(startBoard,target))&&hasDetailedWorld()&&!p.obstacles)b=detailedMove(s,startPose,startBoard,target,h,p);else{const targetMetric=surfaceAt(target.x,target.z,p).metric;s.x=startBoard.x;s.z=startBoard.z;s.vz/=targetMetric;s.collisionCount+=moveWithCollisions(s,h,1,p.obstacles||COLLIDERS,{x:target.x-startBoard.x,z:target.z-startBoard.z});b={x:s.x,z:s.z};s.vz*=surfaceAt(b.x,b.z,p).metric;s.airHeight=Math.max(0,worldY+s.vy*h-surfaceAt(b.x,b.z,p).height);}}placeComAtBoard(s,b,p);
 if(s.airHeight<=1e-9){s.airHeight=0;const landingSurface=surfaceAt(b.x,b.z,p);const landed=tangentComponents(landingSurface,{x:s.vx,y:s.vy,z:s.vz/landingSurface.metric});s.vx=landed.x;s.vz=landed.z;s.airborne=false;s.vy=0;s.pitch=0;s.jumpKind=null;s.jumpCompression=0;s.landingCount++;s.landingCompression=1;}
 // Bounded legal recovery for a multi-contact airborne wedge. Do not bank
 // invisible falling energy while the articulated CCD cannot advance.
 const actualTravel=Math.hypot(b.x-startBoard.x,b.z-startBoard.z,surfaceAt(b.x,b.z,p).height+s.airHeight-worldY),requestedTravel=Math.hypot(target.x-startBoard.x,target.z-startBoard.z,s.vy*h);
 if(s.airborne&&s.collisionCount>collisionBefore&&actualTravel<1e-5&&requestedTravel>1e-4){s.airBlocked=(s.airBlocked||0)+h;s.vy=0;if(s.airBlocked>.12){s.vx=0;s.vz=0;s.yawRate=0;s.caught=1;s.protectionReason='air-contact';}}else s.airBlocked=0;
 s.distance+=Math.hypot(s.vx,s.vz)*h;delete s.pausedCollisionPose;
}
function tick(s,u,h,p){
 const startBoard=boardCenter(s,p),startPose=s.pausedCollisionPose||snapshotPose(s);advanceJump(s,h,p);s.landingCompression=Math.max(0,(s.landingCompression||0)-h*3.2);s.compression=Math.max(s.gestureCompression||0,s.landingCompression||0,s.jumpKind?(s.jumpCompression||0):0);if(s.airborne){airTick(s,h,p,startBoard,startPose);return;}
 const along=s.vx*Math.sin(s.heading)+s.vz*Math.cos(s.heading);s.lookAlong??=1;if(Math.abs(along)>.35)s.lookAlong+=((along>0?1:-1)-s.lookAlong)*(1-Math.exp(-h*3));
 const fY=clamp(u.frontY||0,-1,1),rY=clamp(u.rearY||0,-1,1),fX=clamp(u.frontX||0,-1,1),rX=clamp(u.rearX||0,-1,1),k=1-Math.exp(-h*(u.coast?4:p.edgeResponse));
 const sign=s.stance||1;
 // The feet request pressure/edge changes through one torsionally stiff deck.
 // Opposite ankle requests cannot roll the two bindings independently by 56 degrees.
 // Contact-pressure effort is not the deck torsion angle: each ankle can release
 // or load its snow contact while the stiff board keeps both boots nearly level.
 // A smooth finite-slope response makes normal 12–20px thumb travel useful.
 const rawFront=Math.sin(fY*Math.PI/2),rearRequest=Math.sin(rY*Math.PI/2);
 // Extra leading-foot pressure at partial travel; full braking and paired edging stay unchanged.
 const lead=clamp((Math.abs(rawFront)-Math.abs(rearRequest))*4,0,1);
 const frontRequest=rawFront+.65*rawFront*(1-Math.abs(rawFront))*lead;
 const meanRequest=sign*(frontRequest+rearRequest)*.5,twistRequest=sign*(frontRequest-rearRequest)*.5*.06;
 s.frontPressure??=s.frontEdge;s.rearPressure??=s.rearEdge;
 s.frontPressure+=(sign*frontRequest-s.frontPressure)*(u.frontReleased?1-Math.exp(-h*8):k);s.rearPressure+=(sign*rearRequest-s.rearPressure)*(u.rearReleased?1-Math.exp(-h*8):k);
 const releasing=u.frontReleased||u.rearReleased;
 const meanPressure=releasing?(s.frontPressure+s.rearPressure)*.5:meanRequest,twistPressure=releasing?(s.frontPressure-s.rearPressure)*.5*.06:twistRequest;
 s.frontEdge+=(meanPressure+twistPressure-s.frontEdge)*k;s.rearEdge+=(meanPressure-twistPressure-s.rearEdge)*k;
 s.edge=(s.frontEdge+s.rearEdge)*.5;s.twist=(s.frontEdge-s.rearEdge)*.5;
 s.com+=(clamp(.30*(fX+rX)*.5+.055*(fX-rX),-.34,.34)-s.com)*(1-Math.exp(-h*(u.coast?4:p.comResponse)));
 // Coordinated same-direction thumb motion selects the load-biased leading end.
 // Opposed or one-foot horizontal requests keep their existing COM-only meaning.
 const commonX=fX*rX>0?Math.sign(fX)*Math.min(Math.abs(fX),Math.abs(rX)):0;
 s.weightTransfer??=0;s.weightTransfer+=(commonX-s.weightTransfer)*(1-Math.exp(-h*(u.coast?4:p.comResponse)));
 placeComAtBoard(s,startBoard,p);
 s.frontEdge=clamp(s.edge+s.twist,-1,1);s.rearEdge=clamp(s.edge-s.twist,-1,1);
 const terrain=surfaceAt(s.x,s.z,p),m=p.mass,I=p.yawInertia,flow=chartVelocity(terrain,s.vx,s.vz),normalCurve=(terrain.dxx*flow.x*flow.x+2*terrain.dxz*flow.x*flow.z+terrain.dzz*flow.z*flow.z)/terrain.normalMetric,N=m*(p.gravity*terrain.normalY+normalCurve),normalX=Math.cos(s.heading),normalZ=-Math.sin(s.heading),tX=Math.sin(s.heading),tZ=Math.cos(s.heading);
 s.frontLoad=s.pitch>.001&&!s.airborne?0:s.pitch<-.001&&!s.airborne?1:clamp(.5+s.com/(2*p.halfStance),.18,.82);s.rearLoad=1-s.frontLoad;
 if(!Number.isFinite(N)){s.caught=1;s.protectionReason='contact';return;}if(N<=0){s.airborne=true;s.airHeight=.00001;const w=tangentVector(terrain,s.vx,s.vz);s.vy=w.y;s.vx=w.x;s.vz=w.z*terrain.metric;airTick(s,h,p,startBoard,startPose);return;}
 s.normalLoad=N;s.grade=-terrain.dz;s.curvature=terrain.curvature;s.gravityDown=-p.gravity*terrain.dz/terrain.metric;s.vx-=p.gravity*terrain.xy*h;s.vz+=s.gravityDown*h;
 const before=energy(s,m,I),longSpeed=s.vx*tX+s.vz*tZ,sideSpeed=s.vx*normalX+s.vz*normalZ;
 const carveBlend=Math.abs(longSpeed)/(Math.abs(longSpeed)+Math.abs(sideSpeed)*3+.8);
 // Firm toe/heel input takes priority immediately, including during edge buildup.
 // Fade the paired weight aid smoothly from light to firm edging; release also
 // waits for the existing edge to relax, avoiding an abrupt brake-to-pivot change.
 const firmEdge=Math.max(Math.abs(frontRequest),Math.abs(rearRequest),Math.abs(s.frontPressure),Math.abs(s.rearPressure));
 const edgeFade=clamp((firmEdge-.35)/.40,0,1),weightEffort=Math.abs(s.weightTransfer)*(1-edgeFade*edgeFade*(3-2*edgeFade));
 // Pressure is distributed around each binding over the longer/wider deck.
 // Total load and friction limits are conserved: area is not a friction multiplier.
 const contacts=[[1,s.frontLoad,s.frontPressure],[-1,s.rearLoad,s.rearPressure]].flatMap(([sign,footLoad,e],role)=>[-1,1].flatMap(long=>[-(s.stance||1),s.stance||1].map(side=>{
  const r=(Math.abs(s.pitch)>.001?-Math.sign(s.pitch)*(BOARD.halfLength-.12):sign*p.halfStance+long*BOARD.contactHalfSpan)-s.com,across=side*BOARD.halfWidth*.72;
  // across follows the solver normal; board-local +Z points the opposite way.
  const edge=role===0?s.frontEdge:s.rearEdge;
  // Leading-ankle edge transfer releases its old sideways grip first.
  // This bounded gameplay approximation avoids interpreting opposite-edge
  // front-foot input as more braking torque in the previous turn direction.
  // Rear support and all impulses remain passive; no yaw target is injected.
  const frontDominance=clamp((Math.abs(s.frontPressure)-Math.abs(s.rearPressure))*2,0,1);
  const transferRelease=role===0?frontDominance*clamp(-e*sideSpeed/.5,0,1):0;
  const transferShear=(p.flatShear+p.edgeShear*e*e)*(1-transferRelease)+.012*transferRelease;
  // Same-way weight transfer relaxes the leading-end snow grip and leaves a
  // bounded trailing support. Only passive contact impulses may rotate the board:
  // there is no heading target, nose thrust or rotation while motionless on flat snow.
  // Firm toe/heel edging removes this approximation before the brake builds.
  const selectedEnd=sign*s.weightTransfer>0;
  const weightRelease=selectedEnd?weightEffort*.85:0;
  const shear=transferShear*(1-weightRelease)+(selectedEnd?0:.30*weightEffort);
  const load=footLoad*.5*(.5-.45*side*edge),theta=s.heading-sign*p.sidecut*e*carveBlend;
  return {role,r,across,load,e,transferRelease,shear,t:{x:Math.sin(theta),z:Math.cos(theta)},n:{x:Math.cos(theta),z:-Math.sin(theta)},jt:0,jn:0,maxT:N*load*(p.glide+.013*Math.abs(e))*h,maxN:N*load*shear*h,work:0};
 })));
 const arm=(c,a)=>c.r*(a.x*normalX+a.z*normalZ)-c.across*(a.x*tX+a.z*tZ);
 const project=(c,axis)=>{const a=c[axis],lever=arm(c,a),speed=s.vx*a.x+s.vz*a.z+s.yawRate*lever,old=axis==='t'?c.jt:c.jn,max=axis==='t'?c.maxT:c.maxN,other=axis==='t'?c.jn:c.jt,otherMax=axis==='t'?c.maxN:c.maxT;
  const room=Math.sqrt(Math.max(0,1-Math.pow(other/(otherMax||1e-30),2)))*max,target=clamp(old-speed/(1/m+lever*lever/I),-room,room),delta=target-old;
  if(axis==='t')c.jt=target;else c.jn=target;s.vx+=delta*a.x/m;s.vz+=delta*a.z/m;s.yawRate+=delta*lever/I;
 };
 for(let iter=0;iter<p.solverIterations;iter++){const list=iter%2?contacts:[...contacts].reverse();for(const c of list){project(c,'n');project(c,'t');}}
 const after=energy(s,m,I);s.frictionEnergyDelta=after-before;s.maxContactEnergyIncrease=Math.max(s.maxContactEnergyIncrease,after-before);s.frictionWork=Math.max(0,before-after)/h;s.snowWork=0;s.slip=0;s.gripUse=0;let torque=0;
 s.frontForce=0;s.rearForce=0;
 contacts.forEach(c=>{const vx=s.vx+s.yawRate*(c.r*normalX-c.across*tX),vz=s.vz+s.yawRate*(c.r*normalZ-c.across*tZ),slip=vx*c.n.x+vz*c.n.z;s.slip+=Math.abs(slip)*c.load;s.snowWork+=Math.abs(c.jn*slip)/h;s.gripUse=Math.max(s.gripUse,Math.hypot(c.jn/(c.maxN||1),c.jt/(c.maxT||1)));const f=Math.hypot(c.jt,c.jn)/h;if(c.role===0)s.frontForce+=f;else s.rearForce+=f;torque+=(c.jt*arm(c,c.t)+c.jn*arm(c,c.n))/h;});s.yawTorque=torque;
 s.contactSupport={halfLength:BOARD.halfLength,halfWidth:BOARD.halfWidth,patches:contacts.map(c=>({role:c.role,along:c.r+s.com,across:c.across,load:c.load}))};
 const postSide=s.vx*normalX+s.vz*normalZ,wrong=contacts.reduce((sum,c)=>sum+c.load*Math.max(0,-c.e*(postSide+s.yawRate*c.r)),0),crossRatio=Math.abs(postSide)/(Math.hypot(s.vx,s.vz)+.01);
 s.catchRisk=wrong>1.4&&Math.abs(postSide)>2&&crossRatio>.55?1:0;
 s.catchExposure=s.catchRisk?s.catchExposure+h:Math.max(0,s.catchExposure-h*3);
 // Wrong-edge risk is a sustained visual cue only. This contact model has no fall dynamics;
 // a single twisted foot is not evidence of a fall and must not freeze steering.
 s.catchRisk=s.catchExposure>.3?1:0;
 // Passive small angular damping and aerodynamic drag. No nose thrust or speed clamp.
 // Passive ground yaw budget: a finite contact footprint needs translational
 // travel to turn, and snow's lateral force limits curvature at speed. This
 // removes angular energy only; it never steers toward an arbitrary heading.
 const speed=Math.hypot(s.vx,s.vz),edgeGrip=Math.max(contacts.reduce((v,c)=>v+c.load*(p.flatShear+p.edgeShear*c.e*c.e),0),contacts.reduce((v,c)=>v+c.load*c.shear,0));
 const yawLimit=Math.min(1.05,speed/(2*BOARD.halfLength),N/m*edgeGrip/(speed+.5));
 s.groundYawLimit=yawLimit;s.yawRate=clamp(s.yawRate,-yawLimit,yawLimit);
 s.yawRate*=Math.exp(-.35*h);const air=1/(1+p.airDrag*Math.hypot(s.vx,s.vz)*h);s.vx*=air;s.vz*=air;
 s.heading+=s.yawRate*h;const flowAfter=chartVelocity(terrain,s.vx,s.vz);s.x+=flowAfter.x*h;s.z+=flowAfter.z*h;if(p.collisions!==false){const target=boardCenter(s,p);if((s.riderBodyReady||hasDetailedTrailNear(startBoard,target))&&hasDetailedWorld()&&!p.obstacles){const b=detailedMove(s,startPose,startBoard,target,h,p);placeComAtBoard(s,b,p);}else{s.x=startBoard.x;s.z=startBoard.z;s.collisionCount+=moveWithCollisions(s,h,terrain.metric,p.obstacles||COLLIDERS,{x:target.x-startBoard.x,z:target.z-startBoard.z},terrain);placeComAtBoard(s,{x:s.x,z:s.z},p);}}const nextSurface=surfaceAt(s.x,s.z,p);if(terrain.dx!==0||nextSurface.dx!==0){const v=transportTangent(terrain,nextSurface,s.vx,s.vz),f=transportTangent(terrain,nextSurface,Math.sin(s.heading),Math.cos(s.heading));s.vx=v.x;s.vz=v.z;const angle=Math.atan2(f.x,f.z);s.heading+=Math.atan2(Math.sin(angle-s.heading),Math.cos(angle-s.heading));}delete s.pausedCollisionPose;s.distance+=Math.hypot(s.vx,s.vz)*h;
}
export function step(s,input,dt,options=MODEL){if(s.caught){s._accumulator=0;return s;}if(![s.x,s.z,s.vx,s.vz,s.heading,s.yawRate,s.edge,s.twist,s.com,s.weightTransfer??0,s.frontEdge,s.rearEdge,s.frontPressure??0,s.rearPressure??0,s._accumulator,s.vy,s.airHeight,s.pitch,s.jumpTime,s.compression].every(Number.isFinite)){s.caught=1;s.protectionReason='numeric';s._accumulator=0;return s;}const p=options===MODEL?MODEL:{...MODEL,...options};s._accumulator+=clamp(Number.isFinite(dt)?dt:0,0,.25);const h=1/240;while(s._accumulator>=h-1e-12){tick(s,input,h,p);s._accumulator-=h;if(s.caught){s._accumulator=0;break;}}return s;}

// The protected shape is board-centered. Rebalancing moves the body over the board,
// never the board through an obstacle. Both conversions use the same local metric.
export function boardCenter(s,p=TERRAIN){let x=s.x,z=s.z;for(let i=0;i<5;i++){const d=chartVelocity(surfaceAt(x,z,p),Math.sin(s.heading),Math.cos(s.heading));x=s.x-s.com*d.x;z=s.z-s.com*d.z;}return{x,z};}
function placeComAtBoard(s,b,p){const d=chartVelocity(surfaceAt(b.x,b.z,p),Math.sin(s.heading),Math.cos(s.heading));s.x=b.x+s.com*d.x;s.z=b.z+s.com*d.z;}
