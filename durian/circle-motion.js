// R8: wrist-led flexible cloth cast and one continuous loaded sweep.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u)};
export function castHand(time,start=1.45,tempo=1,pivotY=null,pivotX=null){const late=clamp((start-1.46)/.14,0,1);pivotY??=300+60*late;pivotX??=330+45*late;const u=ease((time-start)*tempo/.45);return{x:315+(pivotX-315)*u,y:405+(pivotY-405)*u}}
export function driveGrip(s,dt){if(s.circleStart===null||s.circleCancelled||s.collection)return;const age=(s.time-s.circleStart)*(s.circleTempo||1),angle=Math.PI/2-2*Math.PI*clamp(age/.9,0,1);s.gripDriveAngle=angle;
 // Only the short gripped end is actuated; distal72 nodes have no target positions.
 for(let row=1;row<=3;row++)for(let col=0;col<9;col++){const p=s.nodes[row*9+col],r=row*11,goal={x:s.hand.x+Math.cos(angle)*r,y:s.hand.y+Math.sin(angle)*r,z:(col-4)*8};for(const k of['x','y','z']){const v=(p[k]-p['p'+k])/dt,acc=clamp((goal[k]-p[k])*1800-v*45,-16000,16000);p['p'+k]-=acc*dt*dt;}}
}
function tangent(points,i,k){if(i===0)return points[0].v?.[k]||0;if(i===points.length-1)return 0;return(points[i+1][k]-points[i-1][k])/(points[i+1].t-points[i-1].t)}
export function curve(points,time){let i=0;while(i<points.length-2&&time>points[i+1].t)i++;const a=points[i],b=points[i+1],dt=b.t-a.t,u=clamp((time-a.t)/dt,0,1),p={},v={},acc={};for(const k of['x','y','z']){const av=a[k]||0,bv=b[k]||0,m0=tangent(points,i,k)*dt,m1=tangent(points,i+1,k)*dt;p[k]=(2*u**3-3*u*u+1)*av+(u**3-2*u*u+u)*m0+(-2*u**3+3*u*u)*bv+(u**3-u*u)*m1;v[k]=((6*u*u-6*u)*av+(3*u*u-4*u+1)*m0+(-6*u*u+6*u)*bv+(3*u*u-2*u)*m1)/dt;acc[k]=((12*u-6)*av+(6*u-4)*m0+(-12*u+6)*bv+(6*u-2)*m1)/(dt*dt)}if(time>=points.at(-1).t)for(const k of['x','y','z']){v[k]=0;acc[k]=0}return{p,v,acc};}
export function makeLoadedSweep(s){const f=s.fruit,h=s.hand,v={x:(f.x-f.px)*240,y:(f.y-f.py)*240,z:(f.z-f.pz)*240};return{
 fruitPath:[{t:0,x:f.x,y:f.y,z:f.z,v},{t:.27,x:f.x+20,y:430,z:0},{t:.65,x:285,y:495,z:-12},{t:1.1,x:190,y:450,z:-45},{t:1.55,x:205,y:455,z:-45},{t:2.1,x:295,y:505,z:0},{t:2.9,x:310,y:535,z:0}],
 handPath:[{t:0,x:h.x,y:h.y,z:0,v:s.handVelocity},{t:.27,x:350,y:380,z:0},{t:.65,x:285,y:430,z:0},{t:1.1,x:260,y:420,z:0},{t:1.55,x:265,y:425,z:0},{t:2.1,x:300,y:440,z:0},{t:2.9,x:310,y:450,z:0}],
 anchors:s.catchProof.tethers.map(t=>({i:t.node,offset:{x:s.nodes[t.node].x-f.x,y:s.nodes[t.node].y-f.y,z:s.nodes[t.node].z-f.z}}))};}
export function loadedCloth(s,dt,released=false){const n=s.nodes,f=s.fruit,old=n.map(p=>({x:p.x,y:p.y,z:p.z})),anchors=s.collection.sweep.anchors,anchorIDs=new Set(anchors.map(a=>a.i)),pinned=i=>anchorIDs.has(i)||(!released&&(i===0||i===8));
 for(let i=0;i<n.length;i++)if(!pinned(i)){const p=n[i],x=p.x,y=p.y,z=p.z;p.x+=(p.x-p.px)*.996;p.y+=(p.y-p.py)*.996+600*dt*dt;p.z+=(p.z-p.pz)*.996;p.px=x;p.py=y;p.pz=z;}
 const pin=()=>{if(!released)for(let i of[0,8])Object.assign(n[i],{x:s.hand.x,y:s.hand.y,z:(i-4)*6});for(let a of anchors)for(let k of['x','y','z'])n[a.i][k]=f[k]+a.offset[k]};
 for(let pass=0;pass<10;pass++){pin();for(let l of s.links){let a=n[l.a],b=n[l.b],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1,wa=pinned(l.a)?0:1,wb=pinned(l.b)?0:1,w=wa+wb;if(!w)continue;let c=(d-l.d)/d*l.k/w;for(let[k,v]of[['x',dx],['y',dy],['z',dz]]){a[k]+=v*c*wa;b[k]-=v*c*wb;}}
 for(let i=0;i<n.length;i++){if(pinned(i))continue;let p=n[i],dx=p.x-f.x,dy=p.y-f.y,dz=p.z-f.z,d=Math.hypot(dx,dy,dz);if(d<21&&d>.001){p.x=f.x+dx*21/d;p.y=f.y+dy*21/d;p.z=f.z+dz*21/d;}if(p.y>555){p.y=555;p.py=555;p.px=p.x-(p.x-p.px)*.85;}}
 }pin();for(let i=0;i<n.length;i++)if(pinned(i)){n[i].px=old[i].x;n[i].py=old[i].y;n[i].pz=old[i].z;}
}
