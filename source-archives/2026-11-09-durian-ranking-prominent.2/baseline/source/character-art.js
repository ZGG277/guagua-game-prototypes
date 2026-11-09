// R12.2: articulated stick figure. Existing IK and cloth grip coordinates are read-only.
const ink='#173e3a',paper='#f1dfb5';
function stroke(ctx,pts,width,color=ink){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}
function cut(ctx,a,b,width=1){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,n={x:-dy/d,y:dx/d};stroke(ctx,[{x:a.x+dx*.17+n.x,y:a.y+dy*.17+n.y},{x:a.x+dx*.8+n.x,y:a.y+dy*.8+n.y}],width,'#d8a033')}
function joint(ctx,p,r=3){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=paper;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=1.5;ctx.stroke()}
export function drawCharacter(ctx,p){ctx.save();
 // Far-side limbs remain thinner, so the loaded cloth can pass behind the legs.
 for(let i=0;i<2;i++){const k=p.knees[i],f=p.feet[i];stroke(ctx,[p.hip,k,f],i?8:6,i?ink:'#527566');stroke(ctx,[{x:f.x-6,y:f.y},{x:f.x+14,y:f.y}],i?7:5,i?ink:'#527566');}
 stroke(ctx,[p.hip,p.shoulder],10);stroke(ctx,[p.shoulder,{x:p.head.x,y:p.head.y+12}],6);
 for(let i=0;i<p.arms.length;i++){const a=p.arms[i];stroke(ctx,[a.shoulder,a.elbow,a.hand],i?7:5,i?ink:'#527566');joint(ctx,a.elbow,2.8);joint(ctx,a.hand,2.6);}
 // Carved highlights follow each actual articulated bone, never a static sprite.
 for(let i=0;i<2;i++){cut(ctx,p.hip,p.knees[i],.85);cut(ctx,p.knees[i],p.feet[i],.85);}cut(ctx,p.hip,p.shoulder,1.1);for(const a of p.arms){cut(ctx,a.shoulder,a.elbow,.8);cut(ctx,a.elbow,a.hand,.8);}
 joint(ctx,p.shoulder,3.4);joint(ctx,p.hip,3.4);for(const k of p.knees)joint(ctx,k,3);
 ctx.beginPath();ctx.arc(p.head.x,p.head.y,15,0,Math.PI*2);ctx.fillStyle=paper;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3.5;ctx.stroke();ctx.beginPath();ctx.arc(p.head.x-1,p.head.y-1,11,Math.PI*.8,Math.PI*1.62);ctx.strokeStyle='#9a6335';ctx.lineWidth=.8;ctx.stroke();const hurt=p.hurtCompression||0,joy=p.catchJoy||0,effort=p.catchCompression||0;
 if(hurt>.08){
  stroke(ctx,[{x:p.head.x+2,y:p.head.y-6},{x:p.head.x+7,y:p.head.y-2},{x:p.head.x+3,y:p.head.y+1}],1.8);
  stroke(ctx,[{x:p.head.x+1,y:p.head.y-10},{x:p.head.x+10,y:p.head.y-7}],1.7);
  ctx.beginPath();ctx.ellipse(p.head.x+9,p.head.y+6,3.3,4.6,0,0,Math.PI*2);ctx.fillStyle=ink;ctx.fill();
  stroke(ctx,[{x:p.head.x-7,y:p.head.y+4},{x:p.head.x-3,y:p.head.y+6}],1.4,'#cb472a');
 }else if(joy>.15){
  ctx.beginPath();ctx.arc(p.head.x+6,p.head.y-2,3.3,Math.PI,Math.PI*2);ctx.strokeStyle=ink;ctx.lineWidth=1.8;ctx.stroke();
  ctx.beginPath();ctx.arc(p.head.x+7,p.head.y+4,5.3,0,Math.PI);ctx.stroke();
  stroke(ctx,[{x:p.head.x-4,y:p.head.y+4},{x:p.head.x-1,y:p.head.y+5}],1.4,'#cb472a');
 }else{
  ctx.beginPath();ctx.arc(p.head.x+6,p.head.y-2,1.7,0,Math.PI*2);ctx.fillStyle=ink;ctx.fill();
  if(effort>.18){ctx.beginPath();ctx.ellipse(p.head.x+10,p.head.y+5,1.8+effort,2+effort*2,0,0,Math.PI*2);ctx.fill();stroke(ctx,[{x:p.head.x+3,y:p.head.y-7},{x:p.head.x+10,y:p.head.y-5}],1.5);}else stroke(ctx,[{x:p.head.x+10,y:p.head.y+4},{x:p.head.x+14,y:p.head.y+3}],1.5);
 }
 ctx.restore();}
