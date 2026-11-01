export const STEP=1/240;
export const MATERIAL={clothDamping:.996,fruitInverseMass:.018,gravity:600};
export function integrateParticle(p,dt,damp,gravity=MATERIAL.gravity){let x=p.x,y=p.y,z=p.z;p.x+=(p.x-p.px)*damp;p.y+=(p.y-p.py)*damp+gravity*dt*dt;p.z+=(p.z-p.pz)*damp;p.px=x;p.py=y;p.pz=z}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Study{
 constructor(){this.totals={whole:0,snacks:0};this.round=0;this.reset()}
 reset(){this.controller=null;this.stage="ready";this.outcome=null;this.eaten=false;this.collectReady=false;this.collection=null;this.credited=false;this.impactSpeed=0;this.arrivalSpeed=0;this.peakFruitSpeed=0;this.time=0;this.acc=0;this.running=false;this.demo=false;this.contactTime=null;this.maxStrain=0;this.broken=false;this.success=false;this.grounded=false;this.wrapEstablished=false;this.supportTime=0;this.strictSupportTime=0;this.lastSupportEvidence=-Infinity;this.unsupportedTime=0;this.contactHand=null;this.heldTime=0;this.yielded=false;this.snagCooldown=new Map();this.checkpoint=false;this.continueMode=false;this.hand={x:315,y:405};this.target={...this.hand};this.nodes=[];this.links=[];this.snags=[];this.fruit={x:408,y:-850,z:0,px:408,py:-850,pz:0,r:19,w:MATERIAL.fruitInverseMass};this.cols=9;this.rows=12;
 for(let j=0;j<this.rows;j++)for(let i=0;i<this.cols;i++){let x=315+j*1.3+Math.sin(i*1.8+j*.7)*2,y=405+j*11,z=(i-4)*10;this.nodes.push({x,y,z,px:x,py:y,pz:z,w:j===0&&(i===0||i===8)?0:1});}
 const add=(a,b,k=1)=>{let p=this.nodes[a],q=this.nodes[b];this.links.push({a,b,d:Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z),k})};
 for(let j=0;j<12;j++)for(let i=0;i<9;i++){let a=j*9+i;if(i<8)add(a,a+1);if(j<11)add(a,a+9);if(i<8&&j<11){add(a,a+10,.25);add(a+1,a+9,.25)}if(j<10)add(a,a+18,.002)}
 }
 start(demo=false){this.reset();this.round++;this.running=true;this.demo=demo;this.isDemoRound=demo;this.stage="falling"}
 get inputOpen(){return this.running&&this.time>=1.45&&!this.collection&&!this.outcome}
 get canEat(){return this.outcome==="pulp"&&!this.eaten}
 get catchClock(){return Math.max(0,(this.time-1.45)/.6)}
 resetTotals(){this.totals={whole:0,snacks:0}}
 eat(){if(!this.canEat)return false;this.eaten=true;if(!this.isDemoRound)this.totals.snacks++;return true}
 requestCollect(){if(!this.collectReady||this.outcome||this.collection||!this.supported||!this.running)return false;this.collectReady=false;this.collection={time:0,origin:{x:this.fruit.x,y:this.fruit.y,z:this.fruit.z},target:{x:188,y:510,z:0},settle:0};this.stage="collecting";this.snags=[];this.broken=true;return true}
 finish(outcome){if(this.outcome)return;this.outcome=outcome;this.stage="result";this.running=false;this.collectReady=false;if(outcome==="whole"&&!this.credited){this.credited=true;if(!this.isDemoRound)this.totals.whole++;}}
 aim(x,y){if(!this.inputOpen)return false;this.target={x:clamp(x,245,455),y:clamp(y,265,475)};return true}
 cancel(){if(this.collection||this.outcome)return;this.target={...this.hand};this.demo=false}
 demoTarget(t){t=(t-1.45)/.6;const points=[[0,315,405],[.28,315,410],[.58,423,285],[.77,428,305],[1.14,320,430],[1.5,280,470],[3,300,400],[6,300,400]];for(let i=1;i<points.length;i++){if(t<=points[i][0]){let a=points[i-1],b=points[i],u=clamp((t-a[0])/(b[0]-a[0]),0,1);u=u*u*(3-2*u);return{x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u}}}return{x:300,y:400}}
 advance(dt){this.acc+=Math.min(dt,.1);while(this.acc>=STEP){this.step();this.acc-=STEP}}
 step(){if(!this.running)return;const dt=STEP;this.time+=dt;if(this.controller)this.controller.update(this,dt);
 if(this.collection){this.stepCollection(dt);return;}
 this.stage=this.time<1.45?'falling':this.contactTime===null?'window':'catching';
 if(this.demo)this.target=this.demoTarget(this.time);let dx=this.target.x-this.hand.x,dy=this.target.y-this.hand.y,d=Math.hypot(dx,dy),f=Math.min(1,780*dt/(d||1));this.hand.x+=dx*f;this.hand.y+=dy*f;
 const integrate=(p,damp)=>integrateParticle(p,dt,damp);for(const p of this.nodes)if(p.w)integrate(p,MATERIAL.clothDamping);integrate(this.fruit,1);
 const pin=()=>{for(const i of [0,8]){let p=this.nodes[i];p.x=this.hand.x;p.y=this.hand.y;p.z=(i-4)*6}};
 pin();for(const sn of this.snags){const p=this.nodes[sn.i],distance=Math.hypot(p.x-this.fruit.x,p.y-this.fruit.y,p.z-this.fruit.z);sn.localContact=distance<=24;if(distance>27||this.time-sn.created>2.2){sn.dead=true;this.snagCooldown.set(sn.i,this.time+.15)}}this.snags=this.snags.filter(sn=>!sn.dead);let hit=[];for(let it=0;it<7;it++){for(const l of this.links){const a=this.nodes[l.a],b=this.nodes[l.b],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1,w=a.w+b.w;if(!w)continue;let s=(d-l.d)/d*l.k/w;a.x+=dx*s*a.w;a.y+=dy*s*a.w;a.z+=dz*s*a.w;b.x-=dx*s*b.w;b.y-=dy*s*b.w;b.z-=dz*s*b.w}
 const fruit=this.fruit;for(let i=0;i<this.nodes.length;i++){let p=this.nodes[i],dx=p.x-fruit.x,dy=p.y-fruit.y,dz=p.z-fruit.z,d=Math.hypot(dx,dy,dz),r=fruit.r+2;if(d<r&&d>.001){if(it===0)hit.push(i);let s=(r-d)/d/(p.w+fruit.w);p.x+=dx*s*p.w;p.y+=dy*s*p.w;p.z+=dz*s*p.w;fruit.x-=dx*s*fruit.w;fruit.y-=dy*s*fruit.w;fruit.z-=dz*s*fruit.w;if(it===0){const nx=dx/d,ny=dy/d,nz=dz/d,rx=(p.x-p.px)-(fruit.x-fruit.px),ry=(p.y-p.py)-(fruit.y-fruit.py),rz=(p.z-p.pz)-(fruit.z-fruit.pz),vn=rx*nx+ry*ny+rz*nz,tx=rx-vn*nx,ty=ry-vn*ny,tz=rz-vn*nz,ft=Math.min(.18,(r-d)*.45/(Math.hypot(tx,ty,tz)||1)),w=p.w+fruit.w;p.px+=tx*ft*p.w/w;p.py+=ty*ft*p.w/w;p.pz+=tz*ft*p.w/w;fruit.px-=tx*ft*fruit.w/w;fruit.py-=ty*ft*fruit.w/w;fruit.pz-=tz*ft*fruit.w/w}}}
 for(const sn of this.snags){let p=this.nodes[sn.i],dx=p.x-fruit.x,dy=p.y-fruit.y,dz=p.z-fruit.z,d=Math.hypot(dx,dy,dz)||1;const stretch=d-sn.d;this.maxStrain=Math.max(this.maxStrain,stretch);if(stretch>32){sn.dead=true;this.broken=true;continue}let s=stretch/d*.33/(p.w+fruit.w);p.x-=dx*s*p.w;p.y-=dy*s*p.w;p.z-=dz*s*p.w;fruit.x+=dx*s*fruit.w;fruit.y+=dy*s*fruit.w;fruit.z+=dz*s*fruit.w}
 pin();for(let p of this.nodes)if(p.y>548){p.y=548;p.px=p.x-(p.x-p.px)*.75}if(fruit.y>533){if(!this.grounded)this.impactSpeed=Math.hypot(fruit.x-fruit.px,fruit.y-fruit.py,fruit.z-fruit.pz)/dt;fruit.y=533;fruit.py=533;fruit.px=fruit.x-(fruit.x-fruit.px)*.8;this.grounded=true;this.snags=[]}}
 if(hit.length&&this.contactTime===null){this.contactTime=this.time;this.contactHand={...this.hand};this.arrivalSpeed=Math.hypot(this.fruit.x-this.fruit.px,this.fruit.y-this.fruit.py,this.fruit.z-this.fruit.pz)/dt;}
 const near=this.nodes.filter(p=>Math.hypot(p.x-this.fruit.x,p.y-this.fruit.y,p.z-this.fruit.z)<26);
 const ext=k=>[Math.min(...near.map(p=>p[k]-this.fruit[k])),Math.max(...near.map(p=>p[k]-this.fruit[k]))];
 const ex=ext('x'),ez=ext('z');const below=near.filter(p=>p.y-this.fruit.y>7).length;
 const strictSupport=near.length>=9&&below>=3&&ex[0]<-7&&ex[1]>7;
 if(this.contactTime!==null&&this.time-this.contactTime>=.25){this.strictSupportTime=strictSupport?this.strictSupportTime+dt:0;if(this.strictSupportTime>=.04)this.lastSupportEvidence=this.time;}
 this.supported=near.length>=8&&below>=3&&((ex[0]<-6&&ex[1]>6)||(ez[0]<-6&&ez[1]>6));
 if(this.contactTime!==null&&this.time-this.contactTime>.85&&!this.wrapEstablished&&!this.broken){if(this.time-this.lastSupportEvidence<=.12)this.wrapEstablished=true;else{this.snags=[];this.broken=true;}}
 if(this.wrapEstablished){this.unsupportedTime=this.supported?0:this.unsupportedTime+dt;if(this.unsupportedTime>.22){this.snags=[];this.broken=true;}}
 
 if(!this.grounded&&!this.broken&&(!this.wrapEstablished||this.supported)&&this.snags.length<5){for(let i of hit){if(this.snags.some(s=>s.i===i)||(this.snagCooldown.get(i)||0)>this.time)continue;let p=this.nodes[i];this.snags.push({i,created:this.time,localContact:true,expires:this.time+.22,d:Math.hypot(p.x-this.fruit.x,p.y-this.fruit.y,p.z-this.fruit.z)});if(this.snags.length===5)break}}
 for(const sn of this.snags){if(sn.localContact&&(!this.wrapEstablished||this.supported))sn.expires=this.time+.22;}
 this.snags=this.snags.filter(s=>!s.dead&&s.expires>=this.time);
 const yielded=this.contactHand&&this.hand.y-this.contactHand.y>65&&this.contactHand.x-this.hand.x>65;
 if(yielded)this.yielded=true;
 const speed=Math.hypot(this.fruit.x-this.fruit.px,this.fruit.y-this.fruit.py,this.fruit.z-this.fruit.pz)/dt;
 this.heldTime=this.wrapEstablished&&this.supported&&this.yielded&&speed<140&&!this.grounded?this.heldTime+dt:0;
 this.peakFruitSpeed=Math.max(this.peakFruitSpeed,speed);
 this.collectReady=this.heldTime>.5&&this.supported&&!this.grounded;
 this.success=false;
 if(this.grounded){this.finish(this.impactSpeed>=650?'smashed':'pulp');return;}
 if(this.demo&&this.collectReady)this.requestCollect();
 }
 stepCollection(dt){
  // Explicit two-hand grasp after verified cloth support. A damped carry force
  // moves the existing inertial fruit continuously; no position reset or score yet.
  const c=this.collection,f=this.fruit;c.time+=dt;const u=Math.min(1,c.time/1.3),e=u*u*(3-2*u);
  const goal={x:c.origin.x+(c.target.x-c.origin.x)*e,y:c.origin.y+(c.target.y-c.origin.y)*e,z:c.origin.z+(c.target.z-c.origin.z)*e};
  for(const k of ['x','y','z']){const pk='p'+k,v=(f[k]-f[pk])/dt,old=f[k],a=70*(goal[k]-f[k])-16*v;f[k]+=v*dt+a*dt*dt;f[pk]=old;}
  this.hand.x=f.x;this.hand.y=f.y-14;
  // Cloth remains a visible slack bundle carried by the closed hands during this
  // authored collection action; only gameplay transfer, not a cloth-contact claim.
  for(const p of this.nodes){let vx=(p.x-p.px)*.96,vy=(p.y-p.py)*.96,vz=(p.z-p.pz)*.96,old={x:p.x,y:p.y,z:p.z};p.x+=vx+(f.x-p.x)*dt*3;p.y+=vy+(f.y+12-p.y)*dt*3;p.z+=vz+(0-p.z)*dt*.6;p.px=old.x;p.py=old.y;p.pz=old.z;}
  const speed=Math.hypot(f.x-f.px,f.y-f.py,f.z-f.pz)/dt,d=Math.hypot(f.x-c.target.x,f.y-c.target.y,f.z-c.target.z);
  c.settle=c.time>1.3&&d<5&&speed<25?c.settle+dt:0;
  if(c.settle>.3){this.success=true;this.finish('whole');}
 }

}
