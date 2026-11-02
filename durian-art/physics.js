import{LANDING,nextRandom}from'./random.js?v=r11';
import{castHand,driveGrip,curve,makeLoadedSweep,loadedCloth}from'./circle-motion.js?v=r11';
export const STEP=1/240;
export function classifyImpact(e){if(e.caught)return'intact';return e.speed>=650||(!e.hadClothContact&&e.dropDistance>700)?'shattered':'partial'}
export const MATERIAL={clothDamping:.996,fruitInverseMass:.018,gravity:600};
export function integrateParticle(p,dt,damp,gravity=MATERIAL.gravity){let x=p.x,y=p.y,z=p.z;p.x+=(p.x-p.px)*damp;p.y+=(p.y-p.py)*damp+gravity*dt*dt;p.z+=(p.z-p.pz)*damp;p.px=x;p.py=y;p.pz=z}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Study{
 constructor({seed=12345}={}){this.rngState=seed>>>0;this.totals={whole:0,pulp:0,snacks:0};this.round=0;this.reset()}
 reset(){this.controller=null;this.circleStart=null;this.alignment=0;this.alignmentTarget=0;this.circleCancelled=false;this.catchLocked=false;this.controlledPlacement=false;this.groundContactSpeed=null;this.catchProof=null;this.bounce=null;this.impactTier=null;this.impactEvidence=null;this.lastContactY=null;this.lastContactTime=null;this.supportReleaseY=null;this.dropOriginY=-850;this.partialCredited=false;this.snagHoldTime=0;this.stage="ready";this.outcome=null;this.eaten=false;this.collectReady=false;this.collection=null;this.credited=false;this.impactSpeed=0;this.arrivalSpeed=0;this.peakFruitSpeed=0;this.time=0;this.acc=0;this.running=false;this.demo=false;this.contactTime=null;this.maxStrain=0;this.broken=false;this.success=false;this.grounded=false;this.wrapEstablished=false;this.supportTime=0;this.strictSupportTime=0;this.lastSupportEvidence=-Infinity;this.unsupportedTime=0;this.contactHand=null;this.heldTime=0;this.yielded=false;this.snagCooldown=new Map();this.checkpoint=false;this.continueMode=false;this.hand={x:335,y:425};this.target={...this.hand};this.nodes=[];this.links=[];this.snags=[];this.fruit={x:408,y:-850,z:0,px:408,py:-850,pz:0,r:19,w:MATERIAL.fruitInverseMass};this.cols=9;this.rows=12;
 for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++){let x=335+(j<=6?j*6:36+(j-6)*10)+Math.sin(i*1.8+j*.7),y=425+j*.1+Math.sin(i*1.8+j*.7)*1.5,z=(i-4)*12;this.nodes.push({x,y,z,px:x,py:y,pz:z,w:j===0&&(i===0||i===8)?0:1});}
 for(let i of[0,8])Object.assign(this.nodes[i],{x:335,px:335,y:425,py:425,z:(i-4)*6,pz:(i-4)*6});
 const add=(a,b,k=1)=>{let p=this.nodes[a],q=this.nodes[b];this.links.push({a,b,d:Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z),k})};
 for(let j=0;j<12;j++)for(let i=0;i<9;i++){let a=j*9+i;if(i<8)add(a,a+1);if(j<11)add(a,a+9);if(i<8&&j<11){add(a,a+10,.25);add(a+1,a+9,.25)}if(j<10)add(a,a+18,.002)}
 }
 start(demo=false,{landingX}={}){const sample=nextRandom(this.rngState);this.rngState=sample.state;this.reset();this.round++;this.landingX=landingX??LANDING.min+(LANDING.max-LANDING.min)*sample.value;this.fruit.x=this.fruit.px=this.landingX;this.running=true;this.demo=demo;this.isDemoRound=demo;this.stage="falling"}
 setAlignment(landingX){if(this.collection||this.outcome)return;this.alignmentTarget=clamp(landingX-LANDING.center,-70,70)}
 get inputOpen(){return this.running&&this.time>=1.45&&!this.collection&&!this.bounce&&!this.catchLocked&&!this.outcome}
 get canEat(){return this.outcome==="pulp"&&!this.eaten}
 get catchClock(){return Math.max(0,(this.time-1.45)/.6)}
 resetTotals(){this.totals={whole:0,pulp:0,snacks:0}}
 eat(){if(!this.canEat)return false;this.eaten=true;if(!this.isDemoRound){this.totals.pulp=Math.max(0,this.totals.pulp-1);this.totals.snacks++;}return true}
 requestCollect(){if(!this.catchLocked||this.outcome||this.collection||!this.running)return false;this.collectReady=false;this.collection={time:0,origin:{x:this.fruit.x,y:this.fruit.y,z:this.fruit.z},handOrigin:{...this.hand},target:{x:this.fruit.x-128,y:533,z:0},settle:0,automatic:true,catchProof:this.catchProof,sweep:makeLoadedSweep(this)};this.stage="collecting";this.snags=[];this.broken=true;return true}

 finish(outcome){if(this.outcome||this.catchLocked&&outcome!=='whole')return;this.outcome=outcome;this.stage="result";this.running=false;this.collectReady=false;if(outcome==="whole"&&!this.credited){this.credited=true;if(!this.isDemoRound)this.totals.whole++;}if(outcome==='pulp'&&!this.partialCredited){this.partialCredited=true;if(!this.isDemoRound)this.totals.pulp++;}}
 aim(x,y){if(!this.inputOpen)return false;this.target={x:clamp(x,225,470),y:clamp(y,265,475)};return true}
 cancel(){if(this.collection||this.outcome)return;this.circleCancelled=true;this.alignmentTarget=this.alignment;this.target={...this.hand};this.demo=false}
 demoTarget(t){t=(t-1.45)/.6;const points=[[0,315,405],[.28,315,410],[.58,423,285],[.77,428,305],[1.14,320,430],[1.5,280,470],[3,300,400],[6,300,400]];for(let i=1;i<points.length;i++){if(t<=points[i][0]){let a=points[i-1],b=points[i],u=clamp((t-a[0])/(b[0]-a[0]),0,1);u=u*u*(3-2*u);return{x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u}}}return{x:300,y:400}}
 advance(dt){this.acc+=Math.min(dt,.1);while(this.acc>=STEP){this.step();this.acc-=STEP}}
 step(){if(!this.running)return;const dt=STEP;this.time+=dt;this.alignment+=clamp(this.alignmentTarget-this.alignment,-200*dt,200*dt);if(this.controller)this.controller.update(this,dt);
 if(this.bounce){this.stepBounce(dt);return;}if(this.collection){this.stepCollection(dt);return;}
 this.stage=this.time<1.45?'falling':this.contactTime===null?'window':'catching';
 if(this.demo){this.setAlignment(this.landingX);if(this.time>=1.82)this.circleStart??=1.82;this.target=castHand(this.time,this.circleStart,this.alignment);}else if(!this.circleStart&&!this.controller)this.target={x:335+this.alignment,y:425};let dx=this.target.x-this.hand.x,dy=this.target.y-this.hand.y,d=Math.hypot(dx,dy),f=Math.min(1,780*dt/(d||1));this.handVelocity={x:dx*f/dt,y:dy*f/dt};this.hand.x+=dx*f;this.hand.y+=dy*f;
 driveGrip(this,dt);
 const integrate=(p,damp)=>integrateParticle(p,dt,damp);for(const p of this.nodes)if(p.w)integrate(p,MATERIAL.clothDamping);integrate(this.fruit,1);
 const pin=()=>{for(const i of [0,8]){let p=this.nodes[i];p.x=this.hand.x;p.y=this.hand.y;p.z=(i-4)*6}};
 pin();for(const sn of this.snags){const p=this.nodes[sn.i],distance=Math.hypot(p.x-this.fruit.x,p.y-this.fruit.y,p.z-this.fruit.z);sn.localContact=distance<=24;if(distance>27||this.time-sn.created>2.2){sn.dead=true;this.snagCooldown.set(sn.i,this.time+.15)}}this.snags=this.snags.filter(sn=>!sn.dead);let hit=[],pressing=new Map();for(let it=0;it<7;it++){for(const l of this.links){const a=this.nodes[l.a],b=this.nodes[l.b],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1,w=a.w+b.w;if(!w)continue;let s=(d-l.d)/d*l.k/w;a.x+=dx*s*a.w;a.y+=dy*s*a.w;a.z+=dz*s*a.w;b.x-=dx*s*b.w;b.y-=dy*s*b.w;b.z-=dz*s*b.w}
 const fruit=this.fruit;for(let i=0;i<this.nodes.length;i++){let p=this.nodes[i],dx=p.x-fruit.x,dy=p.y-fruit.y,dz=p.z-fruit.z,d=Math.hypot(dx,dy,dz),r=fruit.r+2;if(d<r&&d>.001){if(it===0){hit.push(i);const rx=fruit.x-fruit.px-p.x+p.px,ry=fruit.y-fruit.py-p.y+p.py,rz=fruit.z-fruit.pz-p.z+p.pz,relative=Math.hypot(rx,ry,rz)/dt,approach=(rx*dx+ry*dy+rz*dz)/d/dt;if(this.circleStart!==null&&this.time-this.circleStart<.48&&(p.x-p.px)/dt>20&&approach>25&&approach/Math.max(1,relative)>.08)pressing.set(i,{approach,fraction:approach/Math.max(1,relative)});}let s=(r-d)/d/(p.w+fruit.w);p.x+=dx*s*p.w;p.y+=dy*s*p.w;p.z+=dz*s*p.w;fruit.x-=dx*s*fruit.w;fruit.y-=dy*s*fruit.w;fruit.z-=dz*s*fruit.w;if(it===0){const nx=dx/d,ny=dy/d,nz=dz/d,rx=(p.x-p.px)-(fruit.x-fruit.px),ry=(p.y-p.py)-(fruit.y-fruit.py),rz=(p.z-p.pz)-(fruit.z-fruit.pz),vn=rx*nx+ry*ny+rz*nz,tx=rx-vn*nx,ty=ry-vn*ny,tz=rz-vn*nz,ft=Math.min(.18,(r-d)*.45/(Math.hypot(tx,ty,tz)||1)),w=p.w+fruit.w;p.px+=tx*ft*p.w/w;p.py+=ty*ft*p.w/w;p.pz+=tz*ft*p.w/w;fruit.px-=tx*ft*fruit.w/w;fruit.py-=ty*ft*fruit.w/w;fruit.pz-=tz*ft*fruit.w/w}}}
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
 if(!this.catchLocked&&this.contactTime!==null&&localSnags.length>0&&!this.grounded){this.catchLocked=true;this.catchProof={at:this.time,contactTime:this.contactTime,persistentTime:this.snagHoldTime,tethers:localSnags.map(sn=>({node:sn.i,created:sn.created,distance:Math.hypot(this.nodes[sn.i].x-this.fruit.x,this.nodes[sn.i].y-this.fruit.y,this.nodes[sn.i].z-this.fruit.z)})),fruit:{...this.fruit},hand:{...this.hand}};this.collectReady=true;this.requestCollect();return;}

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
 stepBounce(dt){const f=this.fruit,b=this.bounce;b.time+=dt;integrateParticle(f,dt,.995);if(f.y>=533){f.y=533;f.py=533;f.px=f.x-(f.x-f.px)*.75;b.settle+=dt;}else b.settle=0;if(b.settle>.25){this.success=true;this.finish('whole');}}
 stepCollection(dt){
  const c=this.collection,f=this.fruit;c.time+=dt;const goal=curve(c.sweep.fruitPath,c.time),hand=curve(c.sweep.handPath,c.time);c.phase=this.grounded?'settling':c.time<.08?'brace':c.time<.4?'recoil':'unload';
  for(const k of['x','y','z']){const pk='p'+k,v=(f[k]-f[pk])/dt,old=f[k],acc=Math.max(-12000,Math.min(k==='y'?600:12000,goal.acc[k]+80*(goal.p[k]-f[k])+18*(goal.v[k]-v)));if(k==='y'){c.gravity=600;c.tension=600-acc;}if(!(k==='y'&&this.grounded)){f[k]+=v*dt+acc*dt*dt;f[pk]=old;}}
  if(!this.grounded&&f.y>=533){this.groundContactSpeed=Math.hypot(f.x-f.px,f.y-f.py,f.z-f.pz)/dt;this.controlledPlacement=true;this.grounded=true;f.y=533;f.py=533;}
  this.hand.x=hand.p.x;this.hand.y=hand.p.y;
  const speed=Math.hypot(f.x-f.px,f.y-f.py,f.z-f.pz)/dt;c.settle=this.grounded&&speed<10?c.settle+dt:0;
  if(c.settle>.3&&c.releaseTime===undefined){c.releaseTime=c.time;c.recoveryHand={...this.hand};}
  if(c.releaseTime!==undefined){const u=Math.min(1,(c.time-c.releaseTime)/.65),e=u*u*(3-2*u);this.hand.x=c.recoveryHand.x+(335+this.alignment-c.recoveryHand.x)*e;this.hand.y=c.recoveryHand.y+(425-c.recoveryHand.y)*e;c.phase='recover';}
  loadedCloth(this,dt,c.releaseTime!==undefined);
  if(c.releaseTime!==undefined&&c.time-c.releaseTime>=.65){this.success=true;this.finish('whole');}

 }
}
