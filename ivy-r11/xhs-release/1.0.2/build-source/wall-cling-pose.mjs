/** r11 compact 2D articulated pose. Actual palms/soles are inputs, never inferred
 * from a floating body point. This is a sprite rig, not a 3D cloth simulation. */
const add=(a,b,s=1)=>({x:a.x+b.x*s,y:a.y+b.y*s});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const len=a=>Math.hypot(a.x,a.y);
const mean=ps=>({x:ps.reduce((n,p)=>n+p.x,0)/ps.length,y:ps.reduce((n,p)=>n+p.y,0)/ps.length});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function twoBone(start,end,a,b,pole){
 const d=sub(end,start),distance=len(d),u=distance>1e-8?{x:d.x/distance,y:d.y/distance}:{x:0,y:1},n={x:-u.y,y:u.x};
 const reachable=distance<=a+b+1e-7&&distance>=Math.abs(a-b)-1e-7;
 const along=distance>1e-8?(a*a-b*b+distance*distance)/(2*distance):0,height=Math.sqrt(Math.max(0,a*a-along*along)),base=add(start,u,along),s1=add(base,n,height),s2=add(base,n,-height),joint=len(sub(s1,pole))<len(sub(s2,pole))?s1:s2;
 return{start:{...start},joint,end:{...end},upper:a,lower:b,distance,reachable};
}
export function clingingPose(wall,project,{width=390,overview=false,overviewScale=.45,releaseReference=null,releaseProgress=1}={}){
 const b=wall.body;if(!b.grounded||b.feet?.length!==2)return null;
 const k=Math.min(width,430)/390*(overview?overviewScale:1),feet=b.feet.map(project),foot=mean(feet),activeHands=b.hands?.length===2,acquiring=!activeHands&&b.plannedHands?.length===2;
 const reference=activeHands?b.hands.map(project):acquiring?b.plannedHands.map(project):releaseReference||[-1,1].map(side=>({x:foot.x+(b.supportLean||1)*9.36*k+side*2.86*k,y:foot.y-24*k}));
 const hand=mean(reference),delta=sub(foot,hand),span=len(delta),targetU=span>1e-7?{x:delta.x/span,y:delta.y/span}:{x:0,y:1};
 const fold=wall.input?wall.charge:clamp((b.compression||0)/.33,0,1),hipAlong=clamp(span-6*k,13*k,24*k);
 let shoulder=add(hand,targetU,Math.max(-5*k,hipAlong-22*k)+fold*3*k),hip=add(hand,targetU,hipAlong+fold*k);
 const t=acquiring?clamp(b.clingAcquire||0,0,1):1,ease=t*t*(3-2*t),mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 if(acquiring){shoulder=mix({x:foot.x,y:foot.y-38*k},shoulder,ease);hip=mix({x:foot.x,y:foot.y-18*k},hip,ease);}
 const torso=sub(hip,shoulder),torsoLength=len(torso),u={x:torso.x/torsoLength,y:torso.y/torsoLength},n={x:u.y,y:-u.x};
 let hands=reference;
 if(acquiring)hands=reference.map((p,i)=>mix({x:foot.x+(i?1:-1)*13*k,y:foot.y-44*k},p,ease));
 else if(!activeHands)hands=[-1,1].map((side,i)=>mix(reference[i],add(add(shoulder,n,side*14*k),u,-8*k),releaseProgress));
 const waist=add(shoulder,u,torsoLength*.62),shoulders=[-1,1].map(side=>add(shoulder,n,side*5.5*k)),hips=[-1,1].map(side=>add(hip,n,side*3.4*k));
 const arms=hands.map((p,i)=>twoBone(shoulders[i],p,12*k,12*k,add(shoulder,n,(i?1:-1)*25*k)));
 const kneePole=add(add(hip,n,10*k),u,3*k),legs=feet.map((p,i)=>twoBone(hips[i],p,12*k,12*k,kneePole));
 const points=[...hands,...feet,...arms.map(a=>a.joint),...legs.map(a=>a.joint),add(shoulder,u,-14*k),add(hip,u,9*k)],minX=Math.min(...points.map(p=>p.x))-3*k,maxX=Math.max(...points.map(p=>p.x))+3*k,minY=Math.min(...points.map(p=>p.y))-3*k,maxY=Math.max(...points.map(p=>p.y))+3*k;
 return{grounded:true,mode:activeHands?'four-contact-cling':acquiring?'acquiring-hands':'feet-only-release',phase:wall.input?'prepare':b.phase,span,k,u,n,foot,hand,hands,reference,feet,shoulder,shoulders,hip,hips,torsoLength,origin:waist,arms,legs,paintedFeet:feet.map(p=>({...p})),paintedHands:activeHands?hands.map(p=>({...p})):[],activeHands,acquiring,acquire:t,fold,valid:arms.every(a=>a.reachable)&&legs.every(a=>a.reachable),bounds:{x:minX,y:minY,width:maxX-minX,height:maxY-minY},visibleWidth:maxX-minX,visibleHeight:maxY-minY};
}
export function airbornePose(wall,project,{width=390,overview=false,overviewScale=.45,seed=null}={}){
 const b=wall.body,k=Math.min(width,430)/390*(overview?overviewScale:1),foot=project(b),age=Math.max(0,wall.time-wall.flightTime),fall=b.phase==='slipping'||wall.feedback.type==='slipped'||b.y<(wall.leaves[wall.lastLeaf]?.y??0)-.18,t=clamp(age/.15,0,1),ease=t*t*(3-2*t),stretch=fall?0:Math.max(0,1-age/.25);
 const shift=(p)=>({x:foot.x+p.x-seed.foot.x,y:foot.y+p.y-seed.foot.y}),mix=(a,z)=>({x:a.x+(z.x-a.x)*ease,y:a.y+(z.y-a.y)*ease}),targetShoulder={x:foot.x,y:foot.y-(fall?31:34+3*stretch)*k},targetHip={x:foot.x,y:foot.y-(fall?13:15-stretch)*k};
 const shoulder=seed?mix(shift(seed.shoulder),targetShoulder):targetShoulder,hip=seed?mix(shift(seed.hip),targetHip):targetHip,torso=sub(hip,shoulder),torsoLength=len(torso),u={x:torso.x/torsoLength,y:torso.y/torsoLength},n={x:u.y,y:-u.x};
 const targetHands=fall?[{x:foot.x-16*k,y:foot.y-33*k},{x:foot.x+16*k,y:foot.y-33*k}]:[{x:foot.x-12*k,y:foot.y-42*k},{x:foot.x+14*k,y:foot.y-29*k}],targetFeet=fall?[{x:foot.x-8*k,y:foot.y+2*k},{x:foot.x+8*k,y:foot.y+2*k}]:[{x:foot.x-5*k,y:foot.y-3*k},{x:foot.x+4*k,y:foot.y+3*k}];
 const hands=targetHands.map((p,i)=>seed?mix(shift(seed.hands[i]),p):p),feet=targetFeet.map((p,i)=>seed?mix(shift(seed.feet[i]),p):p),shoulders=[-1,1].map(side=>add(shoulder,n,side*5.5*k)),hips=[-1,1].map(side=>add(hip,n,side*3.4*k)),arms=hands.map((p,i)=>twoBone(shoulders[i],p,12*k,12*k,add(shoulder,n,(i?1:-1)*25*k))),legs=feet.map((p,i)=>twoBone(hips[i],p,12*k,12*k,add(add(hip,n,(i?1:-1)*12*k),u,4*k)));
 const points=[...hands,...feet,...arms.map(a=>a.joint),...legs.map(a=>a.joint),add(shoulder,u,-14*k),add(hip,u,9*k)],minX=Math.min(...points.map(p=>p.x))-3*k,maxX=Math.max(...points.map(p=>p.x))+3*k,minY=Math.min(...points.map(p=>p.y))-3*k,maxY=Math.max(...points.map(p=>p.y))+3*k;
 return{grounded:false,mode:'free-flight',phase:fall?'fall':age<.15?'launch':'air',k,u,n,foot,hands,feet,shoulder,shoulders,hip,hips,torsoLength,origin:add(shoulder,u,torsoLength*.62),arms,legs,paintedFeet:[],paintedHands:[],activeHands:false,valid:arms.every(a=>a.reachable)&&legs.every(a=>a.reachable),bounds:{x:minX,y:minY,width:maxX-minX,height:maxY-minY},visibleWidth:maxX-minX,visibleHeight:maxY-minY};
}

export function paintClingingGirl(ctx,pose,atlas,drawImage){
 const p=pose,k=p.k;
 const stroke=(bone,color,width)=>{ctx.beginPath();ctx.moveTo(bone.start.x,bone.start.y);ctx.lineTo(bone.joint.x,bone.joint.y);ctx.lineTo(bone.end.x,bone.end.y);ctx.strokeStyle=color;ctx.lineWidth=width*k;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();};
 // Bent legs stay paired under the long dress; all four endpoints are physical.
 for(const leg of p.legs){stroke(leg,'#4d4b39',4.6);stroke(leg,'#938568',2.4);}
 for(const arm of p.arms){stroke(arm,'#936342',4);stroke(arm,'#ddb586',2.4);}
 ctx.save();ctx.transform(p.n.x,p.n.y,p.u.x,p.u.y,p.shoulder.x,p.shoulder.y);
 const d=p.torsoLength;
 // Reuse the existing authored dress pigment; the crouched fold is a bounded
 // 2D deformation, not a claim of full garment simulation.
 ctx.save();ctx.beginPath();ctx.moveTo(-7*k,d-4*k);ctx.lineTo(7*k,d-4*k);ctx.lineTo(10*k,d+3*k);ctx.lineTo(3*k,d+5*k);ctx.lineTo(-10*k,d+3*k);ctx.closePath();ctx.clip();drawImage(atlas,36,177,88,71,-10*k,d-4*k,20*k,10*k);ctx.restore();
 // Bare shoulders, red sleeveless torso, leaf parcel, and short back-secured pin.
 drawImage(atlas,54,108,56,69,-7*k,-2*k,14*k,d+5*k);
 // Head and small ponytail remain natural-sized instead of squashing a toy.
 drawImage(atlas,32,58,78,62,-10*k,-14*k,15.6*k,12.4*k);
 ctx.restore();
 for(let i=0;i<2;i++){
  const f=p.feet[i],a=p.bootAngles?.[i]??Math.atan2(p.n.y,p.n.x);ctx.save();ctx.translate(f.x,f.y);ctx.rotate(a);
  // Source sole y291 is drawn exactly at local y0. No overlay contact strokes.
  drawImage(atlas,i?82:60,274,18,17,-2.7*k,-5.1*k,5.4*k,5.1*k);ctx.restore();
  const h=p.hands[i];ctx.save();ctx.translate(h.x,h.y);ctx.rotate(Math.atan2(p.n.y,p.n.x));ctx.fillStyle='#ddb586';ctx.beginPath();ctx.ellipse(0,-1.3*k,2.1*k,1.5*k,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
}
