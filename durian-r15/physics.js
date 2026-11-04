import{Canopy}from'./canopy.js?v=r15';
import{DifficultyController}from'./difficulty.js?v=r15';
import{sweepBody,studyBodyPose}from'./body-collision.js?v=r15';
import{LANDING,nextRandom}from'./random.js?v=r15';
import{castHand,driveGrip,curve,makeLoadedSweep,loadedCloth,READY_HAND,GROUND_CENTER_Y}from'./circle-motion.js?v=r15';
export const STEP=1/240;
export function classifyImpact(e){if(e.caught)return'intact';return e.speed>=650||(!e.hadClothContact&&e.dropDistance>700)?'shattered':'partial'}
export const MATERIAL={clothDamping:.996,fruitInverseMass:.018,gravity:600};
export function integrateParticle(p,dt,damp,gravity=MATERIAL.gravity){let x=p.x,y=p.y,z=p.z;p.x+=(p.x-p.px)*damp;p.y+=(p.y-p.py)*damp+gravity*dt*dt;p.z+=(p.z-p.pz)*damp;p.px=x;p.py=y;p.pz=z}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Study{
 constructor({seed=12345,adaptive=false}={}){this.difficulty=adaptive?new DifficultyController():null;this.canopy=new Canopy();this.rngState=seed>>>0;this.canopyRngState=(seed^0x51633e2d)>>>0;this.pulpRngState=(seed^0x9e3779b9)>>>0;this.coins=0;this.coinEvents=[];this.coinSerial=0;this.injurySerial=0;this.injuryEvents=[];this.totals={whole:0,pulp:0,snacks:0};this.round=0;this.reset()}
 reset(){this.selectedFruitId=null;this.releaseProof=null;this.returnProgress=0;this.dropTimeOffset=0;this.basketDelivered=false;this.groundDelivered=false;this.groundSettled=false;this.settledAt=null;this.groundSettledAt=null;this.groundContactAt=null;this.stanceGroundX=null;this.deliveredAt=null;this.collected=false;this.injured=false;this.injury=null;this.pulpCount=1;this.controller=null;this.circleStart=null;this.alignment=0;this.alignmentTarget=0;this.circleCancelled=false;this.catchLocked=false;this.controlledPlacement=false;this.groundContactSpeed=null;this.catchProof=null;this.bounce=null;this.impactTier=null;this.impactEvidence=null;this.lastContactY=null;this.lastContactTime=null;this.supportReleaseY=null;this.dropOriginY=-850;this.partialCredited=false;this.snagHoldTime=0;this.stage="ready";this.outcome=null;this.eaten=false;this.collectReady=false;this.collection=null;this.credited=false;this.impactSpeed=0;this.arrivalSpeed=0;this.peakFruitSpeed=0;this.time=0;this.acc=0;this.running=false;this.demo=false;this.contactTime=null;this.maxStrain=0;this.broken=false;this.success=false;this.grounded=false;this.wrapEstablished=false;this.supportTime=0;this.strictSupportTime=0;this.lastSupportEvidence=-Infinity;this.unsupportedTime=0;this.contactHand=null;this.heldTime=0;this.yielded=false;this.snagCooldown=new Map();this.checkpoint=false;this.continueMode=false;this.hand={...READY_HAND};this.target={...this.hand};this.nodes=[];this.links=[];this.snags=[];this.fruit={x:408,y:-850,z:0,px:408,py:-850,pz:0,r:19,w:MATERIAL.fruitInverseMass};this.cols=9;this.rows=12;
 for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++){let x=335+(j<=6?j*6:36+(j-6)*10)+Math.sin(i*1.8+j*.7),y=425+j*.1+Math.sin(i*1.8+j*.7)*1.5,z=(i-4)*12;this.nodes.push({x,y,z,px:x,py:y,pz:z,w:j===0&&(i===0||i===8)?0:1});}
 for(let i of[0,8])Object.assign(this.nodes[i],{x:335,px:335,y:425,py:425,z:(i-4)*6,pz:(i-4)*6});
 const add=(a,b,k=1)=>{let p=this.nodes[a],q=this.nodes[b];this.links.push({a,b,d:Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z),k})};
 for(let j=0;j<12;j++)for(let i=0;i<9;i++){let a=j*9+i;if(i<8)add(a,a+1);if(j<11)add(a,a+9);if(i<8&&j<11){add(a,a+10,.25);add(a+1,a+9,.25)}if(j<10)add(a,a+18,.002)}
 // Preserve the original rest lengths, then rigidly rotate the same mesh from
 // its construction plane into a loose, low hanging preparation.
 for(const p of this.nodes){const dx=p.x-335,dy=p.y-425,x=READY_HAND.x+dx*Math.cos(1.32)-dy*Math.sin(1.32),y=READY_HAND.y+dx*Math.sin(1.32)+dy*Math.cos(1.32);p.x=p.px=x;p.y=p.py=y;}

 }
 start(demo=false,{landingX,slotId}={}){const priorAlignment=this.alignment||0,priorNodes=this.outcome&&!this.resetClothOnStart?this.nodes:null,priorLinks=priorNodes?this.links:null,priorHand=priorNodes?{...this.hand}:null;this.resetClothOnStart=false;const sample=nextRandom(this.rngState);this.rngState=sample.state;this.reset();this.alignment=this.alignmentTarget=priorAlignment;this.hand.x+=priorAlignment;this.target.x+=priorAlignment;for(const p of this.nodes){p.x+=priorAlignment;p.px+=priorAlignment;}if(priorNodes){this.nodes=priorNodes;this.links=priorLinks;this.hand=priorHand;}this.profile=this.difficulty?.profile||null;this.fruitGravity=this.profile?.fruitGravity||600;this.round++;const pulp=nextRandom(this.pulpRngState);this.pulpRngState=pulp.state;this.pulpCount=1+Math.floor(pulp.value*5);
  if(landingX!==undefined){this.landingX=landingX;this.fruit.x=this.fruit.px=landingX;}
  else{const pick=nextRandom(this.canopyRngState);this.canopyRngState=pick.state;const radius=this.profile?.landingRadius??70,choices=this.canopy.eligible(radius);let value=pick.value;if(slotId!==undefined){const index=choices.findIndex(p=>p.id===slotId);if(index<0)throw Error('Requested fruit is not hanging and reachable');value=(index+.5)/choices.length;}const slot=this.canopy.select(value,radius);this.selectedFruitId=slot.id;this.landingX=slot.x;this.dropOriginY=slot.y;for(const k of['x','y','z'])this.fruit[k]=this.fruit['p'+k]=slot[k];this.releaseProof=Object.freeze({id:slot.id,generation:slot.generation,x:slot.x,y:slot.y,z:slot.z,r:slot.r,vx:0,vy:0,vz:0});}
  // Height-aware gesture clock only: actual gravity, zero release velocity and collision integration are unchanged.
  this.fallRate=Math.sqrt(this.fruitGravity/600);this.dropTimeOffset=Math.sqrt(2*(300-this.dropOriginY)/this.fruitGravity)-Math.sqrt(2*1150/this.fruitGravity);this.running=true;this.demo=demo;this.isDemoRound=demo;this.stage="falling"}

 castTime(baselineTime){return baselineTime/(this.fallRate||1)+(this.dropTimeOffset||0)}
 setAlignment(landingX){if(this.collection||this.outcome)return;this.alignmentTarget=clamp((Math.round((landingX-LANDING.center)*1e6)/1e6)||0,-70,70)}
 get inputOpen(){return this.running&&this.time>=this.castTime(this.profile?1:1.45)&&!this.collection&&!this.bounce&&!this.catchLocked&&!this.outcome}
 get canEat(){return this.outcome==="pulp"&&!this.eaten}
 get catchClock(){return Math.max(0,(this.time-this.castTime(1.45))/.6)}
 resetTotals(){this.resetClothOnStart=true;this.alignment=this.alignmentTarget=0;this.difficulty?.reset();this.canopy.reset();this.coins=0;this.coinEvents=[];this.totals={whole:0,pulp:0,snacks:0}}
 eat(){if(!this.canEat)return false;this.eaten=true;if(!this.isDemoRound){this.totals.pulp=Math.max(0,this.totals.pulp-1);this.totals.snacks++;}return true}
 requestCollect(){if(!this.catchLocked||this.outcome||this.collection||!this.running)return false;this.collectReady=false;this.collection={time:0,origin:{x:this.fruit.x,y:this.fruit.y,z:this.fruit.z},handOrigin:{...this.hand},target:{x:275+this.alignment,y:GROUND_CENTER_Y,z:0},settle:0,automatic:true,catchProof:this.catchProof,sweep:makeLoadedSweep(this)};this.stage="collecting";this.snags=[];this.broken=true;return true}

 award(amount,reason){if(this.isDemoRound||!amount)return;this.coins+=amount;this.coinEvents.push(Object.freeze({id:++this.coinSerial,amount,reason,round:this.round,time:this.time}));}
 hurt(hit){if(this.catchLocked||this.injured||this.outcome)return false;this.injured=true;this.injury=Object.freeze({...hit,id:++this.injurySerial,time:this.time,round:this.round,demo:!!this.isDemoRound});this.injuryEvents.push(this.injury);return true;}
 finish(outcome){if(outcome==='whole'&&!this.groundDelivered)return;if(this.outcome||this.catchLocked&&outcome!=='whole')return;this.outcome=outcome;this.stage=outcome==='whole'&&this.basketDelivered?"ready":"result";this.running=false;this.collectReady=false;if(outcome==="whole"&&!this.credited){this.credited=true;if(!this.isDemoRound)this.totals.whole++;this.award(20,'whole');}if(outcome==='pulp'&&!this.partialCredited){this.partialCredited=true;if(!this.isDemoRound)this.totals.pulp++;this.award(10,'pulp');}this.difficulty?.record(outcome,{demo:this.isDemoRound});/* Settled fruit is at the basket/ground; renew only while the crown is offscreen, before the camera returns. */if(this.selectedFruitId)this.canopy.prepareNext(this.difficulty?.profile.landingRadius??70);}
 aim(x,y){if(!this.inputOpen)return false;this.target={x:clamp(x,225,470),y:clamp(y,265,475)};return true}
 cancel(){if(this.collection||this.outcome)return;this.circleCancelled=true;this.alignmentTarget=this.alignment;this.target={...this.hand};this.demo=false}
 demoTarget(t){t=(t-1.45)/.6;const points=[[0,315,405],[.28,315,410],[.58,423,285],[.77,428,305],[1.14,320,430],[1.5,280,470],[3,300,400],[6,300,400]];for(let i=1;i<points.length;i++){if(t<=points[i][0]){let a=points[i-1],b=points[i],u=clamp((t-a[0])/(b[0]-a[0]),0,1);u=u*u*(3-2*u);return{x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u}}}return{x:300,y:400}}
 advance(dt){this.acc+=Math.min(dt,.1);while(this.acc>=STEP){this.step();this.acc-=STEP}}
 step(){if(!this.running)return;const dt=STEP;this.time+=dt;this.alignment+=clamp(this.alignmentTarget-this.alignment,-200*dt,200*dt);if(this.controller)this.controller.update(this,dt);
 if(this.bounce){this.stepBounce(dt);return;}if(this.collection){this.stepCollection(dt);return;}
 this.stage=this.time<this.castTime(1.45)?'falling':this.contactTime===null?'window':'catching';
 if(this.demo){this.setAlignment(this.landingX);if(this.time>=this.castTime(1.82))this.circleStart??=this.castTime(1.82);this.target=castHand(this.time,this.circleStart,this.alignment);}else if(!this.circleStart&&!this.controller)this.target=castHand(this.time,null,this.alignment);let dx=this.target.x-this.hand.x,dy=this.target.y-this.hand.y,d=Math.hypot(dx,dy),f=Math.min(1,1100*dt/(d||1));this.handVelocity={x:dx*f/dt,y:dy*f/dt};this.hand.x+=dx*f;this.hand.y+=dy*f;
 const bodyFrom={...this.fruit};
 driveGrip(this,dt);
 const integrate=(p,damp)=>integrateParticle(p,dt,damp);for(const p of this.nodes)if(p.w)integrate(p,MATERIAL.clothDamping);integrateParticle(this.fruit,dt,1,this.fruitGravity||600);
 const pin=()=>{for(const i of [0,8]){let p=this.nodes[i];p.x=this.hand.x;p.y=this.hand.y;p.z=(i-4)*6}};
 pin();for(const sn of this.snags){const p=this.nodes[sn.i],distance=Math.hypot(p.x-this.fruit.x,p.y-this.fruit.y,p.z-this.fruit.z);sn.localContact=distance<=24;if(distance>27||this.time-sn.created>2.2){sn.dead=true;this.snagCooldown.set(sn.i,this.time+.15)}}this.snags=this.snags.filter(sn=>!sn.dead);let hit=[],pressing=new Map();for(let it=0;it<7;it++){for(const l of this.links){const a=this.nodes[l.a],b=this.nodes[l.b],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1,w=a.w+b.w;if(!w)continue;let s=(d-l.d)/d*l.k/w;a.x+=dx*s*a.w;a.y+=dy*s*a.w;a.z+=dz*s*a.w;b.x-=dx*s*b.w;b.y-=dy*s*b.w;b.z-=dz*s*b.w}
 const fruit=this.fruit;for(let i=0;i<this.nodes.length;i++){let p=this.nodes[i],dx=p.x-fruit.x,dy=p.y-fruit.y,dz=p.z-fruit.z,d=Math.hypot(dx,dy,dz),r=fruit.r+3;if(d<r&&d>.001){if(!hit.includes(i))hit.push(i);if(it===0){const rx=fruit.x-fruit.px-p.x+p.px,ry=fruit.y-fruit.py-p.y+p.py,rz=fruit.z-fruit.pz-p.z+p.pz,relative=Math.hypot(rx,ry,rz)/dt,approach=(rx*dx+ry*dy+rz*dz)/d/dt;if(this.circleStart!==null&&this.time-this.circleStart<.48&&(p.x-p.px)/dt>20&&approach>25&&approach/Math.max(1,relative)>.08)pressing.set(i,{approach,fraction:approach/Math.max(1,relative)});}let s=(r-d)/d/(p.w+fruit.w);p.x+=dx*s*p.w;p.y+=dy*s*p.w;p.z+=dz*s*p.w;fruit.x-=dx*s*fruit.w;fruit.y-=dy*s*fruit.w;fruit.z-=dz*s*fruit.w;if(it===0){const nx=dx/d,ny=dy/d,nz=dz/d,rx=(p.x-p.px)-(fruit.x-fruit.px),ry=(p.y-p.py)-(fruit.y-fruit.py),rz=(p.z-p.pz)-(fruit.z-fruit.pz),vn=rx*nx+ry*ny+rz*nz,tx=rx-vn*nx,ty=ry-vn*ny,tz=rz-vn*nz,ft=Math.min(.18,(r-d)*.45/(Math.hypot(tx,ty,tz)||1)),w=p.w+fruit.w;p.px+=tx*ft*p.w/w;p.py+=ty*ft*p.w/w;p.pz+=tz*ft*p.w/w;fruit.px-=tx*ft*fruit.w/w;fruit.py-=ty*ft*fruit.w/w;fruit.pz-=tz*ft*fruit.w/w}}}
 for(const sn of this.snags){let p=this.nodes[sn.i],dx=p.x-fruit.x,dy=p.y-fruit.y,dz=p.z-fruit.z,d=Math.hypot(dx,dy,dz)||1;const stretch=d-sn.d;this.maxStrain=Math.max(this.maxStrain,stretch);if(stretch>32){sn.dead=true;this.broken=true;continue}let s=stretch/d*.33/(p.w+fruit.w);p.x-=dx*s*p.w;p.y-=dy*s*p.w;p.z-=dz*s*p.w;fruit.x+=dx*s*fruit.w;fruit.y+=dy*s*fruit.w;fruit.z+=dz*s*fruit.w}
 pin();for(let p of this.nodes)if(p.y>548){p.y=548;p.px=p.x-(p.x-p.px)*.75}if(fruit.y>533){if(!this.grounded)this.impactSpeed=Math.hypot(fruit.x-fruit.px,fruit.y-fruit.py,fruit.z-fruit.pz)/dt;fruit.y=533;fruit.py=533;fruit.px=fruit.x-(fruit.x-fruit.px)*.8;this.grounded=true;this.snags=[];if(this.catchLocked){this.beginBounce();return;}}}
 if(hit.length){this.lastContactY=this.fruit.y;this.lastContactTime=this.time;}
 if(hit.length&&this.contactTime===null){this.contactTime=this.time;this.contactHand={...this.hand};this.arrivalSpeed=Math.hypot(this.fruit.x-this.fruit.px,this.fruit.y-this.fruit.py,this.fruit.z-this.fruit.pz)/dt;}
 const near=this.nodes.filter(p=>Math.hypot(p.x-this.fruit.x,p.y-this.fruit.y,p.z-this.fruit.z)<26);
 const ext=k=>[Math.min(...near.map(p=>p[k]-this.fruit[k])),Math.max(...near.map(p=>p[k]-this.fruit[k]))];
 const ex=ext('x'),ez=ext('z');const below=near.filter(p=>p.y-this.fruit.y>7).length;
 const strictSupport=near.length>=9&&below>=3&&ex[0]<-7&&ex[1]>7;
 if(this.contactTime!==null&&this.time-this.contactTime>=.25){this.strictSupportTime=strictSupport?this.strictSupportTime+dt:0;if(this.strictSupportTime>=.04)this.lastSupportEvidence=this.time;}
 this.supported=near.length>=8&&below>=3&&((ex[0]<-6&&ex[1]>6)||(ez[0]<-6&&ez[1]>6));
 if(this.contactTime!==null&&this.time-this.contactTime>.85&&!this.wrapEstablished&&!this.broken){if(this.time-this.lastSupportEvidence<=.12)this.wrapEstablished=true;else{this.snags=[];this.broken=true;}}
 if(this.wrapEstablished){this.unsupportedTime=this.supported?0:this.unsupportedTime+dt;if(this.unsupportedTime>.22){this.snags=[];this.broken=true;}}
 
 if(!this.grounded&&!this.broken&&(!this.wrapEstablished||this.supported)&&this.snags.length<5){for(let i of hit){if(!pressing.has(i))continue;if(this.snags.some(s=>s.i===i)||(this.snagCooldown.get(i)||0)>this.time)continue;let p=this.nodes[i];this.snags.push({i,approach:pressing.get(i).approach,normalFraction:pressing.get(i).fraction,created:this.time,localContact:true,expires:this.time+.22,d:Math.hypot(p.x-this.fruit.x,p.y-this.fruit.y,p.z-this.fruit.z)});if(this.snags.length===5)break}}
 for(const sn of this.snags){if(sn.localContact&&(!this.wrapEstablished||this.supported))sn.expires=this.time+.22;}
 this.snags=this.snags.filter(s=>!s.dead&&s.expires>=this.time);
 const localSnags=this.snags.filter(sn=>sn.localContact&&Math.hypot(this.nodes[sn.i].x-this.fruit.x,this.nodes[sn.i].y-this.fruit.y,this.nodes[sn.i].z-this.fruit.z)<=24);
 this.snagHoldTime=localSnags.length&&!this.grounded?this.snagHoldTime+dt:0;
 if(!this.catchLocked&&this.contactTime!==null&&localSnags.length>0&&!this.grounded){this.catchLocked=true;this.catchProof={at:this.time,contactTime:this.contactTime,persistentTime:this.snagHoldTime,tethers:localSnags.map(sn=>({node:sn.i,created:sn.created,approach:sn.approach,normalFraction:sn.normalFraction,distance:Math.hypot(this.nodes[sn.i].x-this.fruit.x,this.nodes[sn.i].y-this.fruit.y,this.nodes[sn.i].z-this.fruit.z)})),fruit:{...this.fruit},hand:{...this.hand}};this.collectReady=true;this.requestCollect();return;}

 if(!this.injured){const hit=sweepBody(bodyFrom,this.fruit,studyBodyPose(this),this.fruit.r);if(hit)this.hurt(hit);}
 const yielded=this.contactHand&&this.hand.y-this.contactHand.y>65&&this.contactHand.x-this.hand.x>65;
 if(yielded)this.yielded=true;
 const speed=Math.hypot(this.fruit.x-this.fruit.px,this.fruit.y-this.fruit.py,this.fruit.z-this.fruit.pz)/dt;
 this.heldTime=this.wrapEstablished&&this.supported&&this.yielded&&speed<140&&!this.grounded?this.heldTime+dt:0;
 this.peakFruitSpeed=Math.max(this.peakFruitSpeed,speed);
 this.collectReady=this.heldTime>.5&&this.supported&&!this.grounded;
 this.success=false;
 if(this.grounded){this.recordImpact();this.finish(this.impactTier==='shattered'?'smashed':'pulp');return;}
 if(this.demo&&this.collectReady)this.requestCollect();
 }
 recordImpact(){const release=this.supportReleaseY??this.lastContactY??this.dropOriginY;this.impactEvidence={speed:this.impactSpeed,energy:.5*this.impactSpeed*this.impactSpeed,dropDistance:Math.max(0,533-release),lastContactHeight:this.lastContactY===null?null:533-this.lastContactY,releaseHeight:533-release,hadClothContact:this.contactTime!==null,caught:this.catchLocked&&!!this.catchProof};this.impactTier=classifyImpact(this.impactEvidence);}
 beginBounce(){this.recordImpact();this.impactTier='intact';const f=this.fruit;f.y=533;const rebound=Math.min(180,Math.max(0,this.impactSpeed*.4));f.py=f.y+rebound*STEP;f.px=f.x-(f.x-f.px)*.5;this.collection=null;this.collectReady=false;this.stage='ground-recovery';this.bounce={time:0,settle:0,rebounded:true};}
 stepBounce(dt){const f=this.fruit,b=this.bounce;b.time+=dt;integrateParticle(f,dt,.995);if(f.y>=533){f.y=533;f.py=533;f.px=f.x-(f.x-f.px)*.75;b.settle+=dt;}else b.settle=0;if(b.settle>.15){this.bounce=null;this.grounded=false;this.requestCollect();this.collection.recoveredFromGround=true;}}
 stepCollection(dt){
  const c=this.collection,f=this.fruit;c.time+=dt;
  const goal=curve(c.sweep.fruitPath,c.time),hand=curve(c.sweep.handPath,c.time);
  c.phase=c.time<.08?'brace':c.time<.4?'yield':this.grounded?'ground':'brake';
  this.stage=this.grounded?'ground-settle':'collecting';
  // Only collision-created adhesion enters this path. Preserve real contact
  // velocity and integrate every following position, never move to a waypoint.
  if(!this.groundDelivered)for(const k of['x','y','z']){
   const pk='p'+k,v=(f[k]-f[pk])/dt,old=f[k],acc=clamp(goal.acc[k]+80*(goal.p[k]-f[k])+18*(goal.v[k]-v),-12000,k==='y'?600:12000);
   if(k==='y'){c.gravity=600;c.tension=600-acc;}
   f[k]+=v*dt+acc*dt*dt;f[pk]=old;
  }
  this.hand.x=hand.p.x;this.hand.y=hand.p.y;
  let speed=Math.hypot(f.x-f.px,f.y-f.py,f.z-f.pz)/dt;
  if(this.grounded||f.y>=GROUND_CENTER_Y){
   if(this.groundContactAt===null){this.groundContactAt=this.time;this.groundContactSpeed=speed;}
   f.y=GROUND_CENTER_Y;f.py=GROUND_CENTER_Y;this.grounded=true;
   speed=Math.hypot(f.x-f.px,f.z-f.pz)/dt;
  }
  const distance=Math.hypot(f.x-c.target.x,f.y-c.target.y,f.z-c.target.z);
  c.settle=this.grounded&&distance<2&&speed<10?c.settle+dt:0;
  if(c.settle>=.15&&c.releaseTime===undefined){
   this.stanceGroundX=c.target.x;this.groundDelivered=true;this.groundSettled=true;this.settledAt=this.time;this.groundSettledAt=this.time;
   // Compatibility flag for the existing reward/camera loop. It means a
   // completed harvest; no fruit is transported or teleported to the basket.
   this.basketDelivered=true;this.collected=true;this.deliveredAt=this.time;this.controlledPlacement=true;
   c.deliveredAt=this.time;c.releaseTime=c.time;c.recoveryHand={...this.hand};c.recoveryAlignment=this.alignment;
   f.px=f.x;f.py=f.y;f.pz=f.z;this.impactSpeed=this.groundContactSpeed;this.recordImpact();
  }
  if(c.releaseTime!==undefined){
   const u=Math.min(1,(c.time-c.releaseTime)/.65),e=u*u*(3-2*u);
   this.alignment=c.recoveryAlignment;this.alignmentTarget=this.alignment;
   this.hand.x=c.recoveryHand.x+(READY_HAND.x+this.alignment-c.recoveryHand.x)*e;
   this.hand.y=c.recoveryHand.y+(READY_HAND.y-c.recoveryHand.y)*e;
   c.phase='recover';this.stage='returning';
  }
  loadedCloth(this,dt,c.releaseTime!==undefined);
  if(c.releaseTime!==undefined&&c.time-c.releaseTime>=.65){this.success=true;this.finish('whole');}
 }
}
