import {ATLAS,ART_STATUS,PROJECTION,projectXYZ,characterPose} from './wall-atlas.mjs?v=20261101-atlas-r10';
import {mesh,worldPositions,TRAVEL_Z} from './wall-physics.mjs?v=20261101-atlas-r10';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
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
 return{min,max,z,segments,at,center:at((min+max)/2),width:max-min};
}
export function createRenderer(canvas,{images=null,pixelRatio=null}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas2D unavailable');
 let width=390,height=844,ratio=1,insets={top:52,bottom:100},baseY=null,overview=false,lastTime=null,lastWall=null,lastFalls=null,drawCalls=0;
 let projection={width,height,insets,baseY:0,...PROJECTION},presentations=[],girl=null,landingTime=-Infinity;
 const sectionCache=new WeakMap();
 const loaded=images||{},errors=[];const load=(key,url)=>{if(images)return;const im=new Image();loaded[key]=im;im.onload=()=>{};im.onerror=()=>errors.push(String(url));im.src=String(url);};
 load('leaves',ATLAS.leaves.url);load('girl',ATLAS.girl.url);load('particle',ATLAS.particle.url);ATLAS.walls.forEach((u,i)=>load('wall'+i,u));
 const ready=im=>im&&(im.complete!==false)&&(im.naturalWidth??im.width)>0;
 function drawImage(...args){ctx.drawImage(...args);drawCalls++;}
 function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);ratio=Math.min(2,pixelRatio??globalThis.devicePixelRatio??1);const w=Math.round(width*ratio),h=Math.round(height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(ratio,0,0,ratio,0,0);}
 const project=p=>projectXYZ(p,projection);
 function wallBackground(wall){
  ctx.fillStyle='#a59b84';ctx.fillRect(0,0,width,height);
  const tw=width,th=tw*2,scroll=projection.baseY*projection.sy*.70,start=Math.floor(-scroll/th)-1;
  for(let row=start;row<start+Math.ceil(height/th)+3;row++){const im=loaded['wall'+((row%2+2)%2)];if(ready(im))drawImage(im,0,row*th+scroll,tw,th);}
  // A single low-opacity temperature transition, not moving sunlight.
  const progress=clamp(wall.progress||0,0,1);ctx.fillStyle=`rgba(218,${Math.round(193-progress*41)},82,${.025+progress*.035})`;ctx.fillRect(0,0,width,height);
 }
 function presentation(leaf,wall){
  const z=leaf.id===wall.standId?wall.body.z:TRAVEL_Z,key=[leaf.x,leaf.y,leaf.z,leaf.scale,leaf.rotation,z].join(','),old=sectionCache.get(leaf);let s;
  if(old&&old.positions===leaf._positions&&old.key===key)s=old.section;else{s=supportSection(leaf,z);sectionCache.set(leaf,{positions:leaf._positions,key,section:s});}if(!s.center)return null;
  const center=project(s.center),span=s.width*projection.sx;
  // Main paint covers the complete physical lane, not just the permissible root
  // centres. Small blades receive up to 4px of extra paint, never extra collision.
  const paintWidth=Math.max(56*(overview?.45:1),span),artWidth=paintWidth*512/(ATLAS.leaves.right-ATLAS.leaves.left),artHeight=Math.max(68*(overview?.45:1),Math.min(118,paintWidth*.92));
  const samples=Array.from({length:17},(_,i)=>{const x=s.min+(s.max-s.min)*i/16;return project(s.at(x)||s.center);});
  const top=Math.min(...samples.map(p=>p.y))-ATLAS.leaves.ridge/512*artHeight,bottom=Math.max(...samples.map(p=>p.y))+(1-ATLAS.leaves.ridge/512)*artHeight;
  return{id:leaf.id,leaf,section:s,center,paintWidth,span,artWidth,artHeight,samples,bounds:{left:samples[0].x-ATLAS.leaves.left/512*artWidth,right:samples[0].x+(1-ATLAS.leaves.left/512)*artWidth,top,bottom,width:paintWidth,height:bottom-top},visible:bottom>=insets.top&&top<=height-insets.bottom};
 }
 function paintLeaf(p,wall){
  const {leaf,artWidth:w,artHeight:h}=p,im=loaded.leaves,cell=ATLAS.leaves.cell,index=leaf.id%4,sx=(index%2)*cell,sy=Math.floor(index/2)*cell;
  const left=p.samples[0].x-ATLAS.leaves.left/512*w,strip=w/16,ridge=ATLAS.leaves.ridge/512*h;
  // Sixteen small image deformations follow real surface slope/load. No
  // perspective triangles, depth buffer, WebGL context, lights or live shadows.
  if(ready(im))for(let i=0;i<16;i++){
   const ys=[i/16,(i+1)/16].map(u=>{const worldX=p.section.min+(u*512-ATLAS.leaves.left)/(ATLAS.leaves.right-ATLAS.leaves.left)*p.section.width;return project(p.section.at(clamp(worldX,p.section.min,p.section.max))||p.section.center).y;});
   ctx.save();ctx.transform(1,(ys[1]-ys[0])/strip,0,1,left+i*strip,ys[0]-ridge);
   drawImage(im,sx+i*32,sy,32,cell,0,0,strip+.3,h);ctx.restore();
  }
  // A restrained highlight is the explicit physical landing ridge. It is not an
  // invisible platform, and it moves with the same sampled collision surface.
  ctx.beginPath();p.samples.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));
  const settle=leaf.id<3?.9:leaf.id<9?.7:leaf.id<15?.52:.42,warning=leaf.id===wall.standId&&leaf.id>0&&leaf.age>settle*.7;
  ctx.strokeStyle=warning?'rgba(221,181,80,.68)':'rgba(201,217,138,.32)';ctx.lineWidth=warning?2:1.25;ctx.stroke();
  if(leaf.goal){ctx.fillStyle='#f2dfae';ctx.font='12px serif';ctx.textAlign='center';ctx.fillText('光里',p.center.x,p.bounds.top-8);}
 }
 function character(wall){
  const b=wall.body,feet=b.grounded&&b.feet.length?b.feet.map(project):[project(b),project(b)],foot={x:feet.reduce((s,p)=>s+p.x,0)/feet.length,y:feet.reduce((s,p)=>s+p.y,0)/feet.length};
  const pose=characterPose(wall),index=ATLAS.girl.poses.indexOf(pose),scaleX=width*.09/92*(overview?.45:1),scaleY=width/390*.33*(overview?.45:1);
  const w=160*scaleX,h=320*scaleY;
  // Atlas charge/landing poses already crouch above an unchanged sole baseline.
  const x=foot.x-80*scaleX,y=foot.y-ATLAS.girl.footY*scaleY;
  girl={pose,foot,feet,bounds:{x,y,width:w,height:h},origin:{x:foot.x,y:y+ATLAS.girl.waistY*scaleY},visibleWidth:92*scaleX,visibleHeight:235*scaleY};
  if(ready(loaded.girl)){
   const sx=(index%4)*160,sy=Math.floor(index/4)*320;
   if(b.grounded&&feet.length===2){
    // Upper body remains one sprite. The two tiny trouser/boot strips below
    // the hem shear by <5px to plant their PAINTED soles, not fake overlay dots.
    const split=252,top=y+split*scaleY,toSole=(ATLAS.girl.footY-split)*scaleY;
    drawImage(loaded.girl,sx,sy,160,split,x,y,w,split*scaleY);
    girl.paintedFeet=[];
    feet.forEach((f,j)=>{const cellX=j*80,sourceFootX=j?91:69,left=x+cellX*scaleX,sourceX=left+(sourceFootX-cellX)*scaleX,deltaX=f.x-sourceX,yScale=(f.y-top)/toSole;
     ctx.save();ctx.transform(1,0,deltaX/toSole,yScale,left,top);drawImage(loaded.girl,sx+cellX,sy+split,80,320-split,0,0,80*scaleX,(320-split)*scaleY);ctx.restore();
     girl.paintedFeet.push({x:sourceX+deltaX,y:top+toSole*yScale});
    });
   }else drawImage(loaded.girl,sx,sy,160,320,x,y,w,h);
  }
 }
 function particles(wall){
  if(wall.feedback.type==='landed')landingTime=Math.max(landingTime,wall.feedback.time??-Infinity);
  if(!ready(loaded.particle)||overview)return;
  for(let i=0;i<14;i++){const x=(i*137.31+Math.sin(wall.time*.16+i)*8)%width,y=(i*79.91-wall.time*(2+i%3)+height*100)%height;ctx.globalAlpha=.08+.05*(i%3);drawImage(loaded.particle,x,y,4+i%3,4+i%3);}
  const age=wall.time-landingTime;if(age>=0&&age<.45){const at=project(wall.body);for(let i=0;i<8;i++){ctx.globalAlpha=.25*(1-age/.45);drawImage(loaded.particle,at.x+(i-3.5)*age*24-3,at.y-Math.sin(age/.45*Math.PI)*(6+i%3*3)-3,6,6);}}
  ctx.globalAlpha=1;
 }
 const api={kind:'canvas2d-atlas',setOverview(v){overview=!!v;},setViewportInsets(v){insets={top:Math.max(0,Number(v.top)||0),bottom:Math.max(0,Number(v.bottom)||0)};},projectPoint:project,
  projectGirl(wall=lastWall){if(wall!==lastWall||!girl)return null;return{...girl.origin};},
  projectLaunch(wall,velocity){const origin=api.projectGirl(wall);if(!origin)return null;const a=project(wall.body),b=project({x:wall.body.x+velocity.vx,y:wall.body.y+velocity.vy,z:wall.body.z+(velocity.vz||0)});return{origin,tip:{x:origin.x+b.x-a.x,y:origin.y+b.y-a.y}};},
  render(wall){resize();lastWall=wall;drawCalls=0;const dt=lastTime===null?0:clamp(wall.time-lastTime,0,.1);lastTime=wall.time;
   const playH=Math.max(180,height-insets.top-insets.bottom),sy=overview?playH/(wall.leaves.at(-1).y+1.3):PROJECTION.sy,sx=overview?PROJECTION.sx*.45:PROJECTION.sx;
   const target=overview?-.10:Math.max(-.05,wall.body.y-playH*.16/sy);
   if(baseY===null||wall.time===0||overview||lastFalls!==wall.falls)baseY=target;else baseY+=(target-baseY)*(1-Math.exp(-dt*5));
   lastFalls=wall.falls;projection={width,height,insets,baseY,sx,sy,sz:overview?10:PROJECTION.sz};wallBackground(wall);
   // Broad-phase cull before touching any collision triangles. Only nearby
   // supports need the precise section; resting unchanged sections are cached.
   presentations=wall.leaves.filter(l=>overview||(()=>{const c=project({x:l.x,y:l.y,z:TRAVEL_Z});return c.y>-250&&c.y<height+250;})()).map(l=>presentation(l,wall)).filter(Boolean);
   ctx.save();ctx.beginPath();ctx.rect(0,insets.top,width,Math.max(0,height-insets.top-insets.bottom));ctx.clip();
   for(const p of presentations)if(p.visible)paintLeaf(p,wall);character(wall);particles(wall);ctx.restore();
  },get stats(){return{renderer:api.kind,artStatus:ART_STATUS,width,height,insets:{...insets},projection:{...projection},drawCalls,assetsReady:['leaves','girl','wall0','wall1','particle'].every(k=>ready(loaded[k])),assetErrors:[...errors],supportsVisible:presentations.filter(p=>p.visible).length,fullyVisibleSupports:presentations.filter(p=>p.bounds.top>=insets.top&&p.bounds.bottom<=height-insets.bottom).length,leaves:presentations.filter(p=>p.visible).map(p=>({id:p.id,bounds:{...p.bounds},laneWidth:p.span,center:{...p.center}})),girl:girl?structuredClone(girl):null,particles:22};},
  leafPresentation(id){return presentations.find(p=>p.id===id)||null;}
 };return api;
}
