// R7: persistent cloth mesh, local adhesion and downward trailing drape.
export const WRAP_SECONDS=.55;
const ease=u=>{u=Math.max(0,Math.min(1,u));return u*u*u*(u*(u*6-15)+10)};
export function sphericalDirection(from,to,u){
 const dot=Math.max(-1,Math.min(1,from.reduce((a,v,j)=>a+v*to[j],0))),theta=Math.acos(dot),sin=Math.sqrt(Math.max(0,1-dot*dot));
 if(theta<1e-7)return [...to];
 let tangent;if(sin>1e-6)tangent=to.map((v,j)=>(v-dot*from[j])/sin);else{const axis=Math.abs(from[0])<.8?[1,0,0]:[0,1,0],projection=axis.reduce((a,v,j)=>a+v*from[j],0);tangent=axis.map((v,j)=>v-projection*from[j]);const length=Math.hypot(...tangent);tangent=tangent.map(v=>v/length);}
 return from.map((v,j)=>v*Math.cos(theta*u)+tangent[j]*Math.sin(theta*u));
}
export function beginWrap(nodes,fruit,proof,handVelocity={x:0,y:0}){
 const anchor=proof.tethers[0].node,a=nodes[anchor],ar=Math.floor(anchor/9),ac=anchor%9,az=a.z-fruit.z,theta=Math.atan2(a.x-fruit.x,a.y-fruit.y),radius=Math.hypot(a.x-fruit.x,a.y-fruit.y,a.z-fruit.z),fv={x:(fruit.x-fruit.px)*240,y:(fruit.y-fruit.py)*240,z:(fruit.z-fruit.pz)*240};
 return{anchor,progress:0,nodes:nodes.map((p,i)=>{const row=Math.floor(i/9),col=i%9,d=Math.hypot(row-ar,(col-ac)*.8),along=row-ar,z=az+(col-ac)*7;
 // The near edge remains in the hands; the free edge trails DOWN from adhesion.
 // No symmetric supporting bowl or spherical bag destination.
 const target=i===anchor?{x:a.x-fruit.x,y:a.y-fruit.y,z:az}:{x:(a.x-fruit.x)-along*(along<0?8:5),y:(a.y-fruit.y)+along*(along<0?13:10),z};
 return{offset:{x:p.x-fruit.x,y:p.y-fruit.y,z:p.z-fruit.z},velocity:{x:(p.w?(p.x-p.px)*240:handVelocity.x)-fv.x,y:(p.w?(p.y-p.py)*240:handVelocity.y)-fv.y,z:(p.w?(p.z-p.pz)*240:0)-fv.z},target,delay:i===anchor?0:Math.min(.15,d*.018)}})};

}
export function advanceWrap(nodes,fruit,wrap,time,links=[]){
 wrap.progress=Math.min(1,time/WRAP_SECONDS);
 for(let i=0;i<nodes.length;i++){const p=nodes[i],n=wrap.nodes[i],u=ease((time-n.delay)/(WRAP_SECONDS-n.delay)),inertia=time*Math.exp(-time/.095),old={x:p.x,y:p.y,z:p.z};let q={...n.target};
 if(i!==wrap.anchor){
  const keys=['x','y','z'],r=Math.hypot(n.offset.x,n.offset.y,n.offset.z)||1,d=keys.map(k=>n.offset[k]/r),v=keys.map(k=>n.velocity[k]),radial=v.reduce((a,b,j)=>a+b*d[j],0),tangent=v.map((v,j)=>v-radial*d[j]),tv=Math.hypot(...tangent),angle=tv*inertia/r,dir=d.map((v,j)=>v*Math.cos(angle)+(tv?tangent[j]/tv*Math.sin(angle):0)),tr=Math.hypot(n.target.x,n.target.y,n.target.z),target=keys.map(k=>n.target[k]/tr);
  const direction=sphericalDirection(dir,target,u),radius=Math.max(21,r+radial*inertia)*(1-u)+tr*u;
  q=Object.fromEntries(keys.map((k,j)=>[k,direction[j]*radius]));
 }
 if(i!==wrap.anchor&&wrap.releaseBlend){const row=Math.floor(i/9),ar=Math.floor(wrap.anchor/9);if(row<ar)q.y+=35*ease(wrap.releaseBlend)*(1-row/ar);}
 for(const k of['x','y','z']){p[k]=fruit[k]+q[k];p['p'+k]=old[k];}
 }
 // Local neighborhood relaxation prevents adjacent rows taking visibly separated arcs.
 for(let pass=0;pass<12;pass++){
  for(const l of links){if(l.k<.01)continue;const a=nodes[l.a],b=nodes[l.b],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz),limit=l.d*1.3;if(d<=limit)continue;const wa=l.a===wrap.anchor?0:1,wb=l.b===wrap.anchor?0:1,w=wa+wb;if(!w)continue;const c=(d-limit)/d/w;for(const [k,v]of[['x',dx],['y',dy],['z',dz]]){a[k]+=v*c*wa;b[k]-=v*c*wb;}}
  for(let i=0;i<nodes.length;i++){if(i===wrap.anchor)continue;const p=nodes[i],dx=p.x-fruit.x,dy=p.y-fruit.y,dz=p.z-fruit.z,d=Math.hypot(dx,dy,dz);if(d<21&&d>0){p.x=fruit.x+dx*21/d;p.y=fruit.y+dy*21/d;p.z=fruit.z+dz*21/d;}}
 }

 for(let i=0;i<nodes.length;i++){if(i===wrap.anchor)continue;const p=nodes[i];if(p.y>555){p.x-=(p.y-555)*.55;p.y=555;}}

}
