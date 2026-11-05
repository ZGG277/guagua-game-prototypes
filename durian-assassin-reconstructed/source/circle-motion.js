// R15: low hanging preparation, upward hand-led cloth, local collision only.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const READY_HAND=Object.freeze({x:315,y:450});
export const GROUND_CENTER_Y=531;
export const LOADED_CLOTH_DAMPING=.99;
const ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u)};
export function castHand(time,start=null,alignment=0){
 if(start===null)return{x:READY_HAND.x+alignment,y:READY_HAND.y};
 const age=time-start,lift=age<.18?ease(age/.18):age<.3?1:1-ease((age-.3)/.3);
 return{x:READY_HAND.x+alignment+55*lift,y:READY_HAND.y-105*lift};
}
export function driveGrip(s,dt){
 if(s.collection)return;
 const age=s.circleStart===null?-1:s.time-s.circleStart;
 const rotation=!s.circleCancelled&&age>=0?(age<.1?ease(age/.1):age<.3?1:1-ease((age-.3)/.3)):0;
 const angle=1.32-1.48*rotation;s.gripDriveAngle=angle;
 // Actuation is confined to the gripped end. The last five rows are free:
 // they unfold through gravity, cloth inertia, and the unchanged constraints.
 for(let row=1;row<=6;row++)for(let col=0;col<9;col++){
  const p=s.nodes[row*9+col],r=row*6,goal={x:s.hand.x+Math.cos(angle)*r,y:s.hand.y+Math.sin(angle)*r,z:(col-4)*11};
  for(const k of['x','y','z']){const v=(p[k]-p['p'+k])/dt,acc=clamp((goal[k]-p[k])*2600-v*52,-14000,14000);p['p'+k]-=acc*dt*dt;}
 }
}

function tangent(points,i,k){if(i===0)return points[0].v?.[k]||0;if(i===points.length-1)return 0;return(points[i+1][k]-points[i-1][k])/(points[i+1].t-points[i-1].t)}
export function curve(points,time){let i=0;while(i<points.length-2&&time>points[i+1].t)i++;const a=points[i],b=points[i+1],dt=b.t-a.t,u=clamp((time-a.t)/dt,0,1),p={},v={},acc={};for(const k of['x','y','z']){const av=a[k]||0,bv=b[k]||0,m0=tangent(points,i,k)*dt,m1=tangent(points,i+1,k)*dt;p[k]=(2*u**3-3*u*u+1)*av+(u**3-2*u*u+u)*m0+(-2*u**3+3*u*u)*bv+(u**3-u*u)*m1;v[k]=((6*u*u-6*u)*av+(3*u*u-4*u+1)*m0+(-6*u*u+6*u)*bv+(3*u*u-2*u)*m1)/dt;acc[k]=((12*u-6)*av+(6*u-4)*m0+(-12*u+6)*bv+(6*u-2)*m1)/(dt*dt)}if(time>=points[points.length-1].t)for(const k of['x','y','z']){v[k]=0;acc[k]=0}return{p,v,acc};}
export function makeLoadedSweep(s){
 const f=s.fruit,h=s.hand,v={x:(f.x-f.px)*240,y:(f.y-f.py)*240,z:(f.z-f.pz)*240},gap=275+s.alignment;
 return{
  // A post-adhesion response, initialized with the real contact position and
  // velocity. Gravity remains the only downward acceleration; tension brakes.
  fruitPath:[{t:0,x:f.x,y:f.y,z:f.z,v},{t:.14,x:f.x-22,y:Math.min(465,f.y+88),z:-12},{t:.4,x:gap+32,y:503,z:-60},{t:.7,x:gap+4,y:521,z:-28},{t:.9,x:gap,y:527,z:-3},{t:1.2,x:gap,y:533,z:0}],
  handPath:[{t:0,x:h.x,y:h.y,z:0,v:s.handVelocity},{t:.08,x:h.x-3,y:h.y+5,z:0},{t:.25,x:h.x-24,y:h.y+45,z:0},{t:.5,x:gap+28,y:455,z:0},{t:.85,x:gap+5,y:475,z:0},{t:1.2,x:gap,y:475,z:0}],
  anchors:s.catchProof.tethers.map(t=>({i:t.node,offset:{x:s.nodes[t.node].x-f.x,y:s.nodes[t.node].y-f.y,z:s.nodes[t.node].z-f.z}}))
 };
}

export function loadedCloth(s,dt,released=false){const n=s.nodes,f=s.fruit,old=n.map(p=>({x:p.x,y:p.y,z:p.z})),anchors=s.collection.sweep.anchors,anchorIDs=new Set(anchors.map(a=>a.i)),pinned=i=>(!released&&anchorIDs.has(i))||((i===0||i===8)&&!!s.hand),damping=(LOADED_CLOTH_DAMPING*(anchors.length&&!released?1-.015*clamp(((s.collection.time||0)-.4)/.4,0,1):1))**(dt*240);
 for(let i=0;i<n.length;i++)if(!pinned(i)){const p=n[i],x=p.x,y=p.y,z=p.z;p.x+=(p.x-p.px)*damping;p.y+=(p.y-p.py)*damping+600*dt*dt;p.z+=(p.z-p.pz)*damping;p.px=x;p.py=y;p.pz=z;}
 const pin=()=>{if(s.hand)for(let i of[0,8])if(n[i])Object.assign(n[i],{x:s.hand.x,y:s.hand.y,z:(i-4)*6});if(!released)for(let a of anchors)for(let k of['x','y','z'])n[a.i][k]=f[k]+a.offset[k]};
 for(let pass=0;pass<10;pass++){pin();for(let l of s.links){let a=n[l.a],b=n[l.b],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1,wa=pinned(l.a)?0:1,wb=pinned(l.b)?0:1,w=wa+wb;if(!w)continue;let c=(d-l.d)/d*l.k/w;for(let[k,v]of[['x',dx],['y',dy],['z',dz]]){a[k]+=v*c*wa;b[k]-=v*c*wb;}}
 for(let i=0;i<n.length;i++){if(pinned(i))continue;let p=n[i],dx=p.x-f.x,dy=p.y-f.y,dz=p.z-f.z,d=Math.hypot(dx,dy,dz);if(d<21&&d>.001){p.x=f.x+dx*21/d;p.y=f.y+dy*21/d;p.z=f.z+dz*21/d;}if(p.y>555){p.y=555;p.py=555;p.px=p.x-(p.x-p.px)*.85;}}
 }pin();
 // Limit only unpinned cloth motion. The initial recoil has a looser
 // 10-unit/step bound; yielding/release use 6. The heavy fruit, hand grips,
 // and local fruit attachments retain their exact integrated positions.
 for(let i=0;i<n.length;i++)if(!pinned(i)){
  const p=n[i],o=old[i],d=Math.hypot(p.x-o.x,p.y-o.y,p.z-o.z),limit=(released||s.collection.time>=.12?1440:2400)*dt;
  if(d>limit)for(const k of['x','y','z'])p[k]=o[k]+(p[k]-o[k])*limit/d;
 }
 for(let i=0;i<n.length;i++)if(pinned(i)){n[i].px=old[i].x;n[i].py=old[i].y;n[i].pz=old[i].z;}
}
