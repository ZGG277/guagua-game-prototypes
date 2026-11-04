// Visual material only: no mutation, force, rest-length change or replacement mesh.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:(a.z||0)-(b.z||0)});
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const len=a=>Math.hypot(a.x,a.y,a.z||0);
const unit=a=>{const d=len(a);return d>1e-8?{x:a.x/d,y:a.y/d,z:a.z/d}:{x:0,y:0,z:1}};
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const uv=(p,u,v)=>({x:p[0].x*(1-u)*(1-v)+p[1].x*u*(1-v)+p[2].x*u*v+p[3].x*(1-u)*v,y:p[0].y*(1-u)*(1-v)+p[1].y*u*(1-v)+p[2].y*u*v+p[3].y*(1-u)*v});
function quad(ctx,p){ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<4;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();}
function fiber(ctx,p,across,t,color,width,begin=0,end=1){ctx.beginPath();for(let j=0;j<=4;j++){const s=begin+(end-begin)*j/4,wave=Math.sin(s*Math.PI*4+t*11)*Math.sin(s*Math.PI)*.012,q=across?uv(p,s,t+wave):uv(p,t+wave,s);if(!j)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y)}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
/** ps: four projected corners in perimeter order. ns: corresponding actual 3D
 * nodes. Returns true if drawn.
 * Fold lighting uses actual triangle normals/nonplanarity only, so motion
 * never triggers a flash or an invented force / strain visualization.
 * Fixed 3×3 weave: bounded work and stable material coordinates as nodes move.
 */
export function drawClothPanel(ctx,ps,ns,mesh=false){
 if(!ctx||ps?.length!==4||ns?.length!==4||!ps.every(finite)||!ns.every(p=>finite(p)&&Number.isFinite(p.z??0)))return false;
 const area=Math.abs(ps.reduce((s,p,i)=>s+p.x*ps[(i+1)%4].y-p.y*ps[(i+1)%4].x,0))*.5;
 if(area<.035)return false;
 const n1=unit(cross(sub(ns[1],ns[0]),sub(ns[2],ns[0]))),n2=unit(cross(sub(ns[2],ns[0]),sub(ns[3],ns[0]))),normal=unit({x:n1.x+n2.x,y:n1.y+n2.y,z:n1.z+n2.z});
 const fold=clamp((1-dot(n1,n2))*.5,0,1),light=clamp(.3+.7*Math.abs(dot(normal,{x:-.348,y:-.696,z:.628})),0,1);
 const shade=clamp(light-fold*.34,0,1),r=Math.round(128+65*shade),g=Math.round(96+63*shade),b=Math.round(58+48*shade);
 ctx.save();quad(ctx,ps);ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fill();ctx.clip();ctx.lineCap='butt';ctx.lineJoin='round';
 // Two perpendicular sets, with dark interstices and matte uneven strand edges.
 for(const t of[.17,.5,.83]){fiber(ctx,ps,false,t,'rgba(75,52,28,.32)',1.15);fiber(ctx,ps,false,t-.016,'rgba(231,207,161,.38)',.58);fiber(ctx,ps,true,t,'rgba(94,66,35,.32)',.95);fiber(ctx,ps,true,t-.017,'rgba(216,183,125,.4)',.55)}
 // Alternate over/under at each crossing; short broken marks avoid a plastic grid.
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){const u=.17+col*.33,v=.17+row*.33;if((row+col)%2)fiber(ctx,ps,true,v,'rgba(224,195,144,.48)',.72,u-.065,u+.065);else fiber(ctx,ps,false,u,'rgba(234,211,168,.46)',.72,v-.065,v+.065)}
 if(fold>.09){const a=uv(ps,.06,.06),b=uv(ps,.94,.94);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(39,52,35,${Math.min(.48,fold*.7)})`;ctx.lineWidth=.75+fold*1.5;ctx.stroke();fiber(ctx,ps,true,.52,`rgba(241,223,181,${Math.min(.35,fold*.45)})`,.65,.1,.86)}
 ctx.restore();
 if(mesh){ctx.save();quad(ctx,ps);ctx.strokeStyle='#173e3a';ctx.lineWidth=.7;ctx.stroke();ctx.restore()}
 return true;
}
/** Call immediately BEFORE drawFruitSprite. Same body-mass pivot and rotation as
 * art-assets.js; crisp underlay only, no altered collider. Max tip radius 25.8. */
export function drawFruitSpikes(ctx,obj,small=1){
 if(!ctx||!finite(obj)||!Number.isFinite(obj.z??0)||!Number.isFinite(small)||small<=0)return false;
 ctx.save();ctx.translate(obj.x+(obj.z||0)*.48,obj.y-(obj.z||0)*.24);ctx.rotate((obj.x-408)*.017);ctx.scale(small,small);
 for(let i=0;i<22;i++){const a=i*Math.PI*2/22+.04,r=25.15+(i%3)*.325,root=20.8,half=.075+(i%2)*.01;ctx.beginPath();ctx.moveTo(Math.cos(a-half)*root,Math.sin(a-half)*root);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a+half)*root,Math.sin(a+half)*root);ctx.closePath();ctx.fillStyle=i%3?'#43552c':'#68723a';ctx.fill();ctx.strokeStyle='#233f2a';ctx.lineWidth=.45;ctx.lineJoin='miter';ctx.stroke();ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a+half)*root,Math.sin(a+half)*root);ctx.strokeStyle='#a3a155';ctx.lineWidth=.4;ctx.stroke();}
 ctx.restore();return true;
}

/** Outer hem only. Stable fibers attach to the real projected mesh edge. */
export function drawClothEdge(ctx,points,row=11){
 if(!points?.length)return;ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#173e3a';ctx.lineWidth=row===11?2.7:2;ctx.stroke();ctx.strokeStyle='#d8b77a';ctx.lineWidth=.9;ctx.stroke();
 if(row===11)for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;for(let j=1;j<4;j++){const t=j/4,x=a.x+dx*t,y=a.y+dy*t,n=(i+j)%3+1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-dy/d*n+dx/d*.6,y+dx/d*n+dy/d*.6);ctx.strokeStyle=j%2?'#9a6335':'#d8b77a';ctx.lineWidth=.55;ctx.stroke()}}
 ctx.restore();
}
