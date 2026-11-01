/** Single leaf: the render mesh is also the collision mesh. Units are metres. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Asymmetric five-lobed juvenile Hedera blade. Petiole joins the basal notch.
const contour=[
 [0,0],[-.31,.10],[-.72,-.02],[-.64,.39],[-.99,.58],[-1.67,.69],[-1.36,1.02],[-1.17,1.42],[-1.89,1.94],[-1.39,1.99],[-.91,2.21],[-.63,2.02],[-.40,2.64],[0,3.5],[.38,2.75],[.58,2.14],[.92,2.25],[1.43,2.11],[1.95,2.00],[1.35,1.54],[1.21,1.14],[1.64,.84],[1.04,.76],[.67,.42],[.75,.08],[.30,.18]
];
// Bow each edge gently while preserving pointed lobe tips and deep sinuses.
// The small normal offset adds organic scalloping without rounding into a starfish.
const outline=[];
for(let i=0;i<contour.length;i++)for(let k=0;k<5;k++){
 const a=contour[i],b=contour[(i+1)%contour.length],t=k/5;
 const dx=b[0]-a[0],dz=b[1]-a[1],bow=(.055+.022*Math.sin(i*1.73))*Math.sin(Math.PI*t);
 outline.push([a[0]+dx*t-dz*bow,a[1]+dz*t+dx*bow]);
}
const base=[],uv=[],indices=[],boundary=[],rings=8,N=outline.length;
function baseHeight(x,z){const t=clamp(z/3.5,0,1);return .23*Math.sin(t*Math.PI)+.075*x*x+.028*Math.sin(x*4+z*5)*Math.abs(x)*t;}
function add(x,z){base.push(x,baseHeight(x,z),z);uv.push((x+2)/4,z/3.5);}
add(0,1.38);
for(let r=1;r<=rings;r++)for(let i=0;i<N;i++){const t=r/rings;add(outline[i][0]*t,1.38+(outline[i][1]-1.38)*t);if(r===rings)boundary.push(1+(r-1)*N+i);}
for(let i=0;i<N;i++)indices.push(0,1+(i+1)%N,1+i);
for(let r=1;r<rings;r++)for(let i=0;i<N;i++){
 const a=1+(r-1)*N+i,b=1+(r-1)*N+(i+1)%N,c=1+r*N+i,d=1+r*N+(i+1)%N;
 indices.push(a,b,c,b,d,c);
}
export const mesh={base:new Float32Array(base),uv:new Float32Array(uv),indices:new Uint16Array(indices),boundary};
export const targets={center:{x:0,z:1.3},middle:{x:.05,z:2.12},tip:{x:.02,z:2.94}};
export function positions(state={}){
 const p=mesh.base.slice(),bend=state.bend||0,twist=state.twist||0;
 // Bend the midrib into a circular arc instead of stretching it vertically.
 // theta = 2*bend/L recovers the previous small-angle tip deflection.
 const L=3.5,theta=2*bend/L;
 for(let i=0;i<p.length;i+=3){const x=p[i],z=p[i+2],t=clamp(z/L,0,1),a=theta*t;
  if(Math.abs(theta)>1e-7&&z>0){p[i+2]=L*Math.sin(a)/theta;p[i+1]-=L*(1-Math.cos(a))/theta;}
  p[i+1]-=twist*x*t;
 }
 return p;
}
/** x/z barycentric solve; every accepted point belongs to a real render triangle. */
export function surface(x,z,state={},vertices=null){
 const p=vertices||positions(state),ii=mesh.indices;
 for(let k=0;k<ii.length;k+=3){
  const a=ii[k]*3,b=ii[k+1]*3,c=ii[k+2]*3;
  const ax=p[a],az=p[a+2],bx=p[b],bz=p[b+2],cx=p[c],cz=p[c+2];
  const den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
  if(Math.abs(den)<1e-10)continue;
  const u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den,w=1-u-v;
  if(u< -1e-7||v< -1e-7||w< -1e-7)continue;
  let nx=(p[b+1]-p[a+1])*(cz-az)-(bz-az)*(p[c+1]-p[a+1]),ny=(bz-az)*(cx-ax)-(bx-ax)*(cz-az),nz=(bx-ax)*(p[c+1]-p[a+1])-(p[b+1]-p[a+1])*(cx-ax);
  if(ny<0){nx=-nx;ny=-ny;nz=-nz;}const len=Math.hypot(nx,ny,nz);
  return {y:u*p[a+1]+v*p[b+1]+w*p[c+1],normal:{x:nx/len,y:ny/len,z:nz/len},triangle:k/3,barycentric:[u,v,w]};
 }
 return null;
}
export class Lab{
 constructor(){this.reset();}
 reset(){this.time=0;this.accumulator=0;this.state={bend:0,bendVelocity:0,twist:0,twistVelocity:0};this.target={...targets.center};this.zone='center';this.phase='ready';this.impactTime=-100;this.metrics={peakBend:0,impactSpeed:0,landingTime:null,slideDistance:0};this.body={x:0,y:0,z:1.3,vy:0,vx:0,vz:0,grounded:true,compression:0,phase:'ready',feet:[],hands:[],tiltX:0,tiltZ:0};this.active=false;this.charge=0;this.updateContacts();return this;}
 drop(zone='center'){
  this.reset();this.zone=typeof zone==='string'?zone:'custom';this.target={...(targets[zone]||zone)};
  if(!Number.isFinite(this.target.x)||!Number.isFinite(this.target.z)||!surface(this.target.x-.075,this.target.z,this.state)||!surface(this.target.x+.075,this.target.z,this.state))this.target={...targets.center};
  const s=surface(this.target.x,this.target.z,this.state);Object.assign(this.body,{...this.target,y:s.y+1.55,grounded:false,phase:'falling'});this.phase='falling';this.active=true;this.body.feet=[];this.body.hands=[];return this;
 }
 cancel(){this.charge=0;}
 jump(power=.6){if(!this.body.grounded)return false;this.body.grounded=false;this.body.vy=2.4+clamp(power,0,1)*2;this.body.vz=.2;this.body.phase=this.phase='airborne';this.body.feet=[];this.body.hands=[];this.charge=0;this.active=true;return true;}
 step(dt){this.accumulator+=Math.min(Math.max(dt,0),.1);while(this.accumulator>=1/120){this.tick(1/120);this.accumulator-=1/120;}return this;}
 updateContacts(){
  const b=this.body,p=positions(this.state),feet=[-.075,.075].map(dx=>{const s=surface(b.x+dx,b.z,this.state,p);return s?{x:b.x+dx,y:s.y,z:b.z,normal:s.normal,triangle:s.triangle}:null;});
  if(!feet.every(Boolean)){b.feet=[];b.hands=[];return false;}
  if(b.grounded){b.feet=feet;b.y=(feet[0].y+feet[1].y)/2;const n=surface(b.x,b.z,this.state,p).normal;b.tiltX=Math.atan2(n.z,n.y);b.tiltZ=-Math.atan2(n.x,n.y);
   b.hands=b.compression>.16?[-.18,.18].map(dx=>{const s=surface(b.x+dx,b.z-.13,this.state,p);return s?{x:b.x+dx,y:s.y+.012,z:b.z-.13,triangle:s.triangle}:null;}).filter(Boolean):[];
  }return feet;
 }
 tick(dt){
  this.time+=dt;const b=this.body,s=this.state,lever=clamp(b.z/3.5,0,1);
  const load=b.grounded&&this.active?.98*lever:0;
  s.bendVelocity+=(58*(load-s.bend)-5.8*s.bendVelocity)*dt;s.bend+=s.bendVelocity*dt;
  s.twistVelocity+=(45*((b.grounded?b.x*.16:0)-s.twist)-6.5*s.twistVelocity)*dt;s.twist+=s.twistVelocity*dt;
  this.metrics.peakBend=Math.max(this.metrics.peakBend,s.bend);
  b.compression=Math.max(0,b.compression-dt*1.55);
  if(this.phase==='fallen')return;
  if(!b.grounded){
   const oldY=b.y;b.vy-=9.8*dt;b.y+=b.vy*dt;b.x+=b.vx*dt;b.z+=b.vz*dt;
   const feet=this.updateContacts();
   if(feet&&b.vy<0){const y=(feet[0].y+feet[1].y)/2;if(oldY>=y-.04&&b.y<=y){
    this.metrics.impactSpeed=-b.vy;this.metrics.landingTime=this.time;this.impactTime=this.time;s.bendVelocity+=-b.vy*.42*lever;
    b.grounded=true;b.vy=0;b.vz=0;b.compression=.33;this.phase=b.phase='impact';this.updateContacts();
   }}
   if(b.y< -3.5){this.phase=b.phase='fallen';b.vy=0;}
  }else{
   const surf=surface(b.x,b.z,s);if(!surf){b.grounded=false;b.feet=[];b.hands=[];this.phase=b.phase='slipping';return;}
   const age=this.time-this.impactTime;
   if(this.active&&age>.58){
    const slope=Math.hypot(surf.normal.x,surf.normal.z)/surf.normal.y;
    if(slope>.26||Math.hypot(b.vx,b.vz)>.04){b.vx+=(9.8*surf.normal.x-2.1*b.vx)*dt;b.vz+=(9.8*surf.normal.z-1.45*b.vz)*dt;this.phase=b.phase='sliding';}
    else {b.vx*=.88;b.vz*=.88;this.phase=b.phase='settled';}
    b.x+=b.vx*dt;b.z+=b.vz*dt;
   }else if(this.active&&age>.13)this.phase=b.phase='rebound';
   this.metrics.slideDistance=Math.hypot(b.x-this.target.x,b.z-this.target.z);
   if(!this.updateContacts()){b.grounded=false;b.feet=[];b.hands=[];b.vy=Math.min(0,-s.bendVelocity*lever*lever);this.phase=b.phase='slipping';}
  }
 }
}
