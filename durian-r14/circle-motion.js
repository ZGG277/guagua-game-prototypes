// R12.2: keep the proven scoop/contact window; dissipate flutter only under load.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Baseline free-particle velocity retained per 1/240 s after local contact.
// After the initial .4 s weighted recoil, gradually engage load transmission
// drag (up to 1.5% per step by .8 s) to settle the tensioned carry.
// Precontact, initial recoil, free cloth, and released cloth keep their drag. The loaded burlap
// loses half its free velocity in 0.287 s (previously 0.721 s), while positions,
// local attachment offsets and the unactuated free hem remain continuous.
export const LOADED_CLOTH_DAMPING=.99;
const ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u)};
export function castHand(time,start=null,alignment=0){if(start===null)return{x:335+alignment,y:425};const age=time-start,forward=age<.12?ease(age/.12):age<.28?1:1-ease((age-.28)/.18);return{x:335+alignment+32*forward,y:425-55*forward}}
export function driveGrip(s,dt){if(s.collection)return;const age=s.circleStart===null?-1:s.time-s.circleStart,scoop=!s.circleCancelled&&age>=0&&age<.4?Math.sin(Math.PI*clamp(age/.4,0,1)):0,angle=-.12-.16*scoop;s.gripDriveAngle=angle;
 // Folded burlap is held approximately flat; only the gripped end is driven.
 for(let row=1;row<=6;row++)for(let col=0;col<9;col++){const p=s.nodes[row*9+col],r=row*6,goal={x:s.hand.x+Math.cos(angle)*r,y:s.hand.y+Math.sin(angle)*r,z:(col-4)*11};for(const k of['x','y','z']){const v=(p[k]-p['p'+k])/dt,acc=clamp((goal[k]-p[k])*1800-v*45,-9000,9000);p['p'+k]-=acc*dt*dt;}}
}

function tangent(points,i,k){if(i===0)return points[0].v?.[k]||0;if(i===points.length-1)return 0;return(points[i+1][k]-points[i-1][k])/(points[i+1].t-points[i-1].t)}
export function curve(points,time){let i=0;while(i<points.length-2&&time>points[i+1].t)i++;const a=points[i],b=points[i+1],dt=b.t-a.t,u=clamp((time-a.t)/dt,0,1),p={},v={},acc={};for(const k of['x','y','z']){const av=a[k]||0,bv=b[k]||0,m0=tangent(points,i,k)*dt,m1=tangent(points,i+1,k)*dt;p[k]=(2*u**3-3*u*u+1)*av+(u**3-2*u*u+u)*m0+(-2*u**3+3*u*u)*bv+(u**3-u*u)*m1;v[k]=((6*u*u-6*u)*av+(3*u*u-4*u+1)*m0+(-6*u*u+6*u)*bv+(3*u*u-2*u)*m1)/dt;acc[k]=((12*u-6)*av+(6*u-4)*m0+(-12*u+6)*bv+(6*u-2)*m1)/(dt*dt)}if(time>=points.at(-1).t)for(const k of['x','y','z']){v[k]=0;acc[k]=0}return{p,v,acc};}
export function makeLoadedSweep(s){const f=s.fruit,h=s.hand,v={x:(f.x-f.px)*240,y:(f.y-f.py)*240,z:(f.z-f.pz)*240},back=f.x-130;return{
 fruitPath:[{t:0,x:f.x,y:f.y,z:f.z,v},{t:.16,x:f.x-35,y:Math.min(470,f.y+55),z:-10},{t:.4,x:back,y:490,z:-60},{t:.75,x:back+8,y:510,z:-70},{t:1.15,x:215,y:490,z:-75},{t:1.5,x:188,y:502,z:-65},{t:1.8,x:188,y:511,z:0}],
 handPath:[{t:0,x:h.x,y:h.y,z:0,v:s.handVelocity},{t:.08,x:h.x-4,y:h.y+2,z:0},{t:.25,x:h.x-35,y:h.y+30,z:0},{t:.6,x:back+20,y:482,z:0},{t:1.05,x:back+25,y:485,z:0},{t:1.4,x:224,y:464,z:0},{t:1.8,x:220,y:464,z:0}],
 anchors:s.catchProof.tethers.map(t=>({i:t.node,offset:{x:s.nodes[t.node].x-f.x,y:s.nodes[t.node].y-f.y,z:s.nodes[t.node].z-f.z}}))};}

export function loadedCloth(s,dt,released=false){const n=s.nodes,f=s.fruit,old=n.map(p=>({x:p.x,y:p.y,z:p.z})),anchors=s.collection.sweep.anchors,anchorIDs=new Set(anchors.map(a=>a.i)),pinned=i=>(!released&&anchorIDs.has(i))||((i===0||i===8)&&!!s.hand),damping=(LOADED_CLOTH_DAMPING*(anchors.length&&!released?1-.015*clamp(((s.collection.time||0)-.4)/.4,0,1):1))**(dt*240);
 for(let i=0;i<n.length;i++)if(!pinned(i)){const p=n[i],x=p.x,y=p.y,z=p.z;p.x+=(p.x-p.px)*damping;p.y+=(p.y-p.py)*damping+600*dt*dt;p.z+=(p.z-p.pz)*damping;p.px=x;p.py=y;p.pz=z;}
 const pin=()=>{if(s.hand)for(let i of[0,8])if(n[i])Object.assign(n[i],{x:s.hand.x,y:s.hand.y,z:(i-4)*6});if(!released)for(let a of anchors)for(let k of['x','y','z'])n[a.i][k]=f[k]+a.offset[k]};
 for(let pass=0;pass<10;pass++){pin();for(let l of s.links){let a=n[l.a],b=n[l.b],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1,wa=pinned(l.a)?0:1,wb=pinned(l.b)?0:1,w=wa+wb;if(!w)continue;let c=(d-l.d)/d*l.k/w;for(let[k,v]of[['x',dx],['y',dy],['z',dz]]){a[k]+=v*c*wa;b[k]-=v*c*wb;}}
 for(let i=0;i<n.length;i++){if(pinned(i))continue;let p=n[i],dx=p.x-f.x,dy=p.y-f.y,dz=p.z-f.z,d=Math.hypot(dx,dy,dz);if(d<21&&d>.001){p.x=f.x+dx*21/d;p.y=f.y+dy*21/d;p.z=f.z+dz*21/d;}if(p.y>555){p.y=555;p.py=555;p.px=p.x-(p.x-p.px)*.85;}}
 }pin();
 // A strained free patch relaxes over multiple solver steps during basket carry
 // and after release. Taller R14 falls exposed an isolated constraint flip late
 // in carry; retain the original contact/recoil motion and exact grip/fruit pins.
 if(released||s.collection.time>=.9)for(let i=0;i<n.length;i++)if(!pinned(i)){
  const p=n[i],o=old[i],d=Math.hypot(p.x-o.x,p.y-o.y,p.z-o.z),limit=1440*dt;
  if(d>limit)for(const k of['x','y','z'])p[k]=o[k]+(p[k]-o[k])*limit/d;
 }
 for(let i=0;i<n.length;i++)if(pinned(i)){n[i].px=old[i].x;n[i].py=old[i].y;n[i].pz=old[i].z;}
}
