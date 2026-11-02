import {clingingPose,airbornePose,edgePose} from './wall-r112-pose.mjs?v=20261102-r112';
import {paintArriettyGirl as paintClingingGirl} from './wall-r112-paint.mjs?v=20261102-r112';
import {ATLAS,ART_STATUS,PROJECTION,projectXYZ,characterPose} from './wall-atlas.mjs?v=20261101-cling-r11';
import {mesh,worldPositions,TRAVEL_Z} from './wall-physics.mjs?v=20261101-cling-r11';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const BACKGROUND_URLS=['a','b'].map(c=>new URL(`./assets/r112/ivy-wall-${c}.webp`,import.meta.url));
/** Slice the existing collision surface; this is measurement, NOT a 3D render path.
 * Each segment lies on an actual collider triangle. The atlas is deformed only
 * as 16 ordinary 2D image strips along this visible, sampled landing band. */
export function supportSection(leaf,z=TRAVEL_Z){
 const p=worldPositions(leaf),ii=mesh.indices,segments=[];let min=Infinity,max=-Infinity;
 for(let i=0;i<ii.length;i+=3){const hits=[];for(let j=0;j<3;j++){
  const a=ii[i+j]*3,b=ii[i+(j+1)%3]*3,az=p[a+2]-z,bz=p[b+2]-z;
  if((az<=0&&bz>=0)||(az>=0&&bz<=0)){const den=az-bz;if(Math.abs(den)<1e-9)continue;const t=az/den;hits.push({x:p[a]+(p[b]-p[a])*t,y:p[a+1]+(p[b+1]-p[a+1])*t,z});}
 }if(hits.length>=2&&Math.abs(hits[0].x-hits[1].x)>1e-8){const [a,b]=hits[0].x<hits[1].x?hits:[hits[1],hits[0]];segments.push([a,b]);min=Math.min(min,a.x);max=Math.max(max,b.x);}}
 const at=x=>{for(const [a,b] of segments)if(x>=a.x-1e-7&&x<=b.x+1e-7){const t=(x-a.x)/(b.x-a.x);return{x,y:a.y+(b.y-a.y)*t,z};}return null;};
 const middle=(min+max)/2;let center=at(middle);
 // A real concave blade can have a notch across the geometric midpoint.
 // Keep that physical support visible; choose the nearest actual segment,
 // never invent a surface at the missing midpoint or hide its planted feet.
 if(!center&&segments.length){const x=segments.map(([a,b])=>clamp(middle,a.x,b.x)).sort((a,b)=>Math.abs(a-middle)-Math.abs(b-middle))[0];center=at(x);}
 return{min,max,z,segments,at,center,width:max-min};
}
function sectionPoint(section,x){
 const hit=section.at(x);if(hit)return hit;
 const near=section.segments.map(([a,b])=>clamp(x,a.x,b.x)).sort((a,b)=>Math.abs(a-x)-Math.abs(b-x))[0];return section.at(near)||section.center;
}
export function stripFrame(p,i,project){
 const w=p.artWidth,h=p.artHeight,strip=w/16,left=p.frameLeft-ATLAS.leaves.left/512*w;
 const xs=[i/16,(i+1)/16].map(u=>p.material.min+(u*512-ATLAS.leaves.left)/(ATLAS.leaves.right-ATLAS.leaves.left)*p.material.width);
 const ys=xs.map(x=>project(sectionPoint(p.section,clamp(x,p.section.min,p.section.max))).y);
 const hx=clamp((xs[0]+xs[1])/2,p.handSection.min,p.handSection.max),hh=sectionPoint(p.handSection,hx),mid=(ys[0]+ys[1])/2;
 const gap=p.handRow===ATLAS.leaves.ridge?0:Math.max(2*p.fit,hh?mid-project(hh).y:(ATLAS.leaves.ridge-p.handRow)*h/512),scaleY=p.handRow===ATLAS.leaves.ridge?h/512:gap/(ATLAS.leaves.ridge-p.handRow),slope=(ys[1]-ys[0])/strip;
 return{left:left+i*strip,strip,scaleY,baseScale:h/512,slope,footY:ys[0],handY:ys[0]-gap};
}
export function contactUV(p,point,project){
 const q=project(point),left=p.frameLeft-ATLAS.leaves.left/512*p.artWidth,x=(q.x-left)/p.artWidth*512,i=clamp(Math.floor(x/32),0,15),f=stripFrame(p,i,project),offset=f.slope*(q.x-f.left),foot=f.footY+offset,hand=f.handY+offset;
 const y=q.y<hand?p.handRow+(q.y-hand)/f.baseScale:q.y<=foot?p.handRow+(q.y-hand)/f.scaleY:ATLAS.leaves.ridge+(q.y-foot)/f.baseScale;
 return{x,y,index:p.id%4};
}
export function createRenderer(canvas,{images=null,pixelRatio=null}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas2D unavailable');
 let width=390,height=844,ratio=1,insets={top:52,bottom:100},baseY=null,overview=false,lastTime=null,lastWall=null,lastFalls=null,drawCalls=0;
 let projection={width,height,insets,baseY:0,...PROJECTION},presentations=[],girl=null,landingTime=-Infinity;
 const sectionCache=new WeakMap(),handCache=new WeakMap(),materialCache=new WeakMap();
 let vineSegments=0;
 let lastCling=null,releaseAt=null,flightSeed=null,edgeSeed=null;
 const loaded=images||{},errors=[];const load=(key,url)=>{if(images)return;const im=new Image();loaded[key]=im;im.onload=()=>{};im.onerror=()=>errors.push(String(url));im.src=String(url);};
 load('leaves',ATLAS.leaves.url);load('girl',ATLAS.girl.url);load('particle',ATLAS.particle.url);BACKGROUND_URLS.forEach((u,i)=>load('wall'+i,u));
 const ready=im=>im&&(im.complete!==false)&&(im.naturalWidth??im.width)>0;
 function drawImage(...args){ctx.drawImage(...args);drawCalls++;}
 function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);ratio=Math.min(2,pixelRatio??globalThis.devicePixelRatio??1);const w=Math.round(width*ratio),h=Math.round(height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(ratio,0,0,ratio,0,0);}
 const project=p=>projectXYZ(p,projection);
 function wallBackground(wall){
  ctx.fillStyle='#8f866d';ctx.fillRect(0,0,width,height);
  const tw=width,th=tw*2,overlap=th*.12,pitch=th-overlap,scroll=projection.baseY*projection.sy*.70,start=Math.floor(-scroll/pitch)-1;
  // Constant source scale. Twelve-percent overlaps cross-fade different wall
  // segments, not a claim that the generated bitmap is mathematically seamless.
  for(let row=start;row<start+Math.ceil(height/pitch)+3;row++){
   const im=loaded['wall'+((row%2+2)%2)];if(!ready(im))continue;const y=row*pitch+scroll,iw=im.naturalWidth??im.width,ih=im.naturalHeight??im.height,src=ih*.12;
   ctx.globalAlpha=1;drawImage(im,0,src,iw,ih-src,0,y+overlap,tw,th-overlap);
   for(let j=0;j<12;j++){ctx.globalAlpha=(j+.5)/12;drawImage(im,0,j*src/12,iw,src/12,0,y+j*overlap/12,tw,overlap/12+.4);}
  }
  ctx.globalAlpha=1;
  // Subdued background contrast keeps decorative leaves behind the one route.
  ctx.fillStyle='rgba(44,48,29,.27)';ctx.fillRect(0,0,width,height);
 }
 function materialFrame(leaf){
  const key=[leaf.x,leaf.y,leaf.z,leaf.scale,leaf.rotation].join(','),old=materialCache.get(leaf);if(old?.key===key)return old.frame;
  const rest={...leaf,state:{...leaf.state,bend:.26,twist:0,depression:0,edgeRipple:0}};delete rest._positions;delete rest._pendingGeometry;
  const section=supportSection(rest,TRAVEL_Z),pad=.12,frame={min:section.min-pad,max:section.max+pad,width:section.width+pad*2};
  materialCache.set(leaf,{key,frame});return frame;
 }
 function paintVines(wall){
  vineSegments=0;const roots=wall.leaves.map(l=>({id:l.id,...project({x:l.x,y:l.y,z:l.z})}));
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=0;i<roots.length-1;i++){const a=roots[i],b=roots[i+1];if(!overview&&(Math.max(a.y,b.y)<insets.top-100||Math.min(a.y,b.y)>height-insets.bottom+100))continue;
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+Math.sin(i*.8+.8)*13,a.y+(b.y-a.y)*.4,b.x-Math.sin(i*.8+.8)*13,b.y-(b.y-a.y)*.4,b.x,b.y);
   ctx.strokeStyle='#4b4e30';ctx.lineWidth=overview?1:3;ctx.stroke();ctx.strokeStyle='rgba(135,141,86,.5)';ctx.lineWidth=overview?.5:1;ctx.stroke();vineSegments++;
  }
  for(const p of presentations){if(!p.visible)continue;const root=roots[p.id],notch={x:p.frameLeft+p.paintWidth*.5,y:Math.max(...p.samples.map(q=>q.y))+(1-ATLAS.leaves.ridge/512)*p.artHeight*.85};ctx.beginPath();ctx.moveTo(root.x,root.y);ctx.quadraticCurveTo(root.x,notch.y+12,notch.x,notch.y);ctx.strokeStyle='#556038';ctx.lineWidth=overview?.5:2;ctx.stroke();}
  ctx.restore();
 }
 function presentation(leaf,wall){
  const edge=wall.grip?.kind==='edge-rescue'?wall.grip:wall.edgeReach,edgeHere=edge?.leafId===leaf.id,engaged=leaf.id===wall.standId||edgeHere;
  const z=edgeHere?(edge.feet?.[0]?.z??wall.body.z):engaged?wall.body.z:TRAVEL_Z,key=[leaf.x,leaf.y,leaf.z,leaf.scale,leaf.rotation,z].join(','),old=sectionCache.get(leaf);let s;
  if(old&&!leaf._pendingGeometry&&old.positions===leaf._positions&&old.key===key)s=old.section;else{s=supportSection(leaf,z);sectionCache.set(leaf,{positions:leaf._positions,key,section:s});}if(!s.center)return null;
  const center=project(s.center),span=s.width*projection.sx,material=materialFrame(leaf),frameLeft=project({x:material.min,y:0,z}).x;
  // A fixed rest-material frame avoids body-depth-driven whole-leaf inflation.
  // The small fixed side margin is artwork only, never extra collision.
  const fit=overview?projection.sy/PROJECTION.sy:1,paintWidth=material.width*projection.sx,artWidth=paintWidth*512/(ATLAS.leaves.right-ATLAS.leaves.left),artHeight=Math.max(54*fit,Math.min(118*fit,paintWidth*.92));
  const samples=Array.from({length:17},(_,i)=>{const x=material.min+material.width*i/16,hit=sectionPoint(s,clamp(x,s.min,s.max));return project({...hit,x});});
  const top=Math.min(...samples.map(p=>p.y))-ATLAS.leaves.ridge/512*artHeight,bottom=Math.max(...samples.map(p=>p.y))+(1-ATLAS.leaves.ridge/512)*artHeight;
  const handZ=z-.32,prior=handCache.get(leaf);let handSection;
  if(prior&&prior.positions===leaf._positions&&prior.z===handZ)handSection=prior.section;else{handSection=supportSection(leaf,handZ);handCache.set(leaf,{positions:leaf._positions,z:handZ,section:handSection});}
  const handCenter=handSection.at(s.center.x)||handSection.center;
  const handRow=245,handSamples=samples.map((_,i)=>{const x=clamp(s.min+(s.max-s.min)*i/16,handSection.min,handSection.max);return project(sectionPoint(handSection,x)||handCenter||s.center);});
  const drawTop=Math.min(...handSamples.map(p=>p.y))-handRow/512*artHeight;
  return{id:leaf.id,leaf,section:s,handSection,handRow,fit,center,material,frameLeft,paintWidth,span,artWidth,artHeight,samples,bounds:{left:frameLeft-ATLAS.leaves.left/512*artWidth,right:frameLeft+(1-ATLAS.leaves.left/512)*artWidth,top:drawTop,bottom,width:paintWidth,height:bottom-drawTop},visible:bottom>=insets.top&&drawTop<=height-insets.bottom};
 }
 function paintLeaf(p,wall){
  const {leaf,artWidth:w,artHeight:h}=p,im=loaded.leaves,cell=ATLAS.leaves.cell,index=leaf.id%4,sx=(index%2)*cell,sy=Math.floor(index/2)*cell;
  const left=p.frameLeft-ATLAS.leaves.left/512*w,strip=w/16,ridge=ATLAS.leaves.ridge/512*h;
  // Sixteen small image deformations follow real surface slope/load. No
  // perspective triangles, depth buffer, WebGL context, lights or live shadows.
  if(ready(im))for(let i=0;i<16;i++){
   const f=stripFrame(p,i,project);
   // Three continuous 2D bands retain a single natural leaf silhouette while
   // the opaque palm/sole bands meet two actual surface depths. No 3D triangles.
   for(const [v0,v1,y0,scale]of [[0,p.handRow,f.handY-p.handRow*f.baseScale,f.baseScale],[p.handRow,ATLAS.leaves.ridge,f.handY,f.scaleY],[ATLAS.leaves.ridge,512,f.footY,f.baseScale]]){if(v1<=v0)continue;
    // Source-aligned texel gutters seal antialiased strip/band seams.
    // The previous +.3 destination stretch could leave 50%-coverage cracks
    // and invalidated the literal UV mapping at a planted palm.
    const u0=Math.max(0,i*32-4),u1=Math.min(512,(i+1)*32+4),a=Math.max(0,v0-4),b=Math.min(512,v1+4);
    ctx.save();ctx.transform(1,f.slope,0,scale,f.left,y0);drawImage(im,sx+u0,sy+a,u1-u0,b-a,(u0-i*32)*w/512,a-v0,(u1-u0)*w/512,b-a);ctx.restore();
   }
  }
  // The authored leaf already contains its veins. No timed yellow ridge,
  // warning stroke, or load-driven material scale is added.
  const number=leaf.number??leaf.id+1;if(!overview||number===1||number%10===0){
   const text=String(number),lw=text.length*7+6,obstacles=[p.center,...(leaf.id===wall.standId||leaf.id===wall.grip?.leafId?[...wall.body.feet,...wall.body.hands].filter(Boolean).map(project):[])];
   const choices=overview?[[p.center.x+12+lw/2,p.center.y+4]]:[[p.center.x,p.center.y+Math.min(25,p.artHeight*.24)],[p.center.x+p.paintWidth*.28,p.center.y+22],[p.center.x-p.paintWidth*.28,p.center.y+22],[p.center.x,Math.max(...p.samples.map(q=>q.y))+20]];
   const spot=choices.find(([x,y])=>overview||obstacles.every(q=>q.x<x-lw/2-5||q.x>x+lw/2+5||q.y<y-17||q.y>y+7))||choices.at(-1);
   p.label={number,x:spot[0]-lw/2,y:spot[1]-12,width:lw,height:14};
   if(overview){ctx.fillStyle='rgba(30,42,31,.92)';ctx.fillRect(p.label.x-2,p.label.y-2,lw+4,18);}
   ctx.fillStyle='#f3ead3';ctx.font='600 12px sans-serif';ctx.textAlign='center';ctx.fillText(text,spot[0],spot[1]);
  }
 }
 function character(wall){
  const edge=wall.edgeReach||wall.grip?.kind==='edge-rescue';
  if(edge){
   // Capture the preceding complete pose exactly once for the whole reach /
   // locked-palm transfer. Re-seeding each frame would cause wrist drift.
   if(!edgeSeed)edgeSeed=girl||airbornePose(wall,project,{width,overview,overviewScale:projection.sy/PROJECTION.sy,seed:flightSeed});
   girl=edgePose(wall,project,{width,overview,overviewScale:projection.sy/PROJECTION.sy,seed:edgeSeed});
   if(girl&&ready(loaded.girl))paintClingingGirl(ctx,girl,loaded.girl,drawImage);
   return;
  }
  if(edgeSeed){flightSeed=girl||edgeSeed;edgeSeed=null;}
  const acquiring=wall.body.plannedHands?.length===2,held=wall.body.hands?.length===2;
  if(held||acquiring)releaseAt=null;else if(wall.body.grounded&&releaseAt===null)releaseAt=wall.time;
  const f=project(wall.body),releaseReference=lastCling?.hands.map(p=>({x:f.x+p.x-lastCling.foot.x,y:f.y+p.y-lastCling.foot.y}));
  let posed=clingingPose(wall,project,{width,overview,overviewScale:projection.sy/PROJECTION.sy,releaseReference,releaseProgress:clamp((wall.time-(releaseAt??wall.time))/.12,0,1)});
  if(posed){flightSeed=null;if(held||acquiring)lastCling=posed;posed.bootAngles=wall.body.feet.map(f=>Math.atan2(projection.sy*f.normal.x,projection.sx*f.normal.y));}
  else{if(!flightSeed&&girl?.grounded)flightSeed=girl;posed=airbornePose(wall,project,{width,overview,overviewScale:projection.sy/PROJECTION.sy,seed:flightSeed});lastCling=null;releaseAt=null;}
  girl=posed;if(ready(loaded.girl))paintClingingGirl(ctx,girl,loaded.girl,drawImage);
 }

 function particles(wall){
  if(wall.feedback.type==='landed')landingTime=Math.max(landingTime,wall.feedback.time??-Infinity);
  if(!ready(loaded.particle)||overview)return;
  for(let i=0;i<14;i++){const x=(i*137.31+Math.sin(wall.time*.16+i)*8)%width,y=(i*79.91-wall.time*(2+i%3)+height*100)%height;ctx.globalAlpha=.08+.05*(i%3);drawImage(loaded.particle,x,y,4+i%3,4+i%3);}
  const age=wall.time-landingTime;if(age>=0&&age<.45){const at=project(wall.body);for(let i=0;i<8;i++){ctx.globalAlpha=.25*(1-age/.45);drawImage(loaded.particle,at.x+(i-3.5)*age*24-3,at.y-Math.sin(age/.45*Math.PI)*(6+i%3*3)-3,6,6);}}
  ctx.globalAlpha=1;
 }
 const api={kind:'canvas2d-four-contact-atlas',setOverview(v){overview=!!v;},setViewportInsets(v){insets={top:Math.max(0,Number(v.top)||0),bottom:Math.max(0,Number(v.bottom)||0)};},projectPoint:project,
  projectGirl(wall=lastWall){if(wall!==lastWall||!girl)return null;return{...girl.origin};},
  projectLaunch(wall,velocity){const origin=api.projectGirl(wall);if(!origin)return null;const a=project(wall.body),b=project({x:wall.body.x+velocity.vx,y:wall.body.y+velocity.vy,z:wall.body.z+(velocity.vz||0)});return{origin,tip:{x:origin.x+b.x-a.x,y:origin.y+b.y-a.y}};},
  render(wall){resize();lastWall=wall;drawCalls=0;const dt=lastTime===null?0:clamp(wall.time-lastTime,0,.1);lastTime=wall.time;
   const playH=Math.max(180,height-insets.top-insets.bottom),sy=overview?Math.max(100,playH-64)/(wall.leaves.at(-1).y+1.3):Math.min(PROJECTION.sy,playH/2.55),sx=overview?PROJECTION.sx*sy/PROJECTION.sy:PROJECTION.sx;
   const target=overview?-.10:Math.max(-.05,wall.body.y-playH*.16/sy);
   if(baseY===null||wall.time===0||overview||lastFalls!==wall.falls)baseY=target;else baseY+=(target-baseY)*(1-Math.exp(-dt*5));
   lastFalls=wall.falls;projection={width,height,insets,baseY,sx,sy,sz:overview?10:PROJECTION.sz};wallBackground(wall);
   // Broad-phase cull before touching any collision triangles. Only nearby
   // supports need the precise section; resting unchanged sections are cached.
   presentations=wall.leaves.filter(l=>overview||(()=>{const c=project({x:l.x,y:l.y,z:TRAVEL_Z});return c.y>-250&&c.y<height+250;})()).map(l=>presentation(l,wall)).filter(Boolean);
   ctx.save();ctx.beginPath();ctx.rect(0,insets.top,width,Math.max(0,height-insets.top-insets.bottom));ctx.clip();
   paintVines(wall);for(const p of presentations)if(p.visible)paintLeaf(p,wall);character(wall);particles(wall);ctx.restore();
  },get stats(){return{renderer:api.kind,artStatus:'generated-wall-with-authored-interactive-leaves',width,height,insets:{...insets},projection:{...projection},drawCalls,vineSegments,assetsReady:['leaves','girl','wall0','wall1','particle'].every(k=>ready(loaded[k])),assetErrors:[...errors],supportsVisible:presentations.filter(p=>p.visible).length,fullyVisibleSupports:presentations.filter(p=>p.bounds.top>=insets.top&&p.bounds.bottom<=height-insets.bottom).length,leaves:presentations.filter(p=>p.visible).map(p=>({id:p.id,bounds:{...p.bounds},laneWidth:p.span,materialWidth:p.paintWidth,materialHeight:p.artHeight,center:{...p.center},label:p.label?{...p.label}:null})),girl:girl?structuredClone(girl):null,particles:22};},
  leafPresentation(id){return presentations.find(p=>p.id===id)||null;},
  contactUV(id,point){const p=api.leafPresentation(id);return p?contactUV(p,point,project):null;}
 };return api;
}
