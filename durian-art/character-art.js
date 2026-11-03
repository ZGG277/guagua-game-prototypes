// R12.2: articulated stick figure. Existing IK and cloth grip coordinates are read-only.
const ink='#173e3a',paper='#f1dfb5';
function stroke(ctx,pts,width,color=ink){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}
function joint(ctx,p,r=3){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=paper;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=1.5;ctx.stroke()}
export function drawCharacter(ctx,p){ctx.save();
 // Far-side limbs remain thinner, so the loaded cloth can pass behind the legs.
 for(let i=0;i<2;i++){const k=p.knees[i],f=p.feet[i];stroke(ctx,[p.hip,k,f],i?8:6,i?ink:'#527566');stroke(ctx,[{x:f.x-6,y:f.y},{x:f.x+14,y:f.y}],i?7:5,i?ink:'#527566');}
 stroke(ctx,[p.hip,p.shoulder],10);stroke(ctx,[p.shoulder,{x:p.head.x,y:p.head.y+12}],6);
 for(let i=0;i<p.arms.length;i++){const a=p.arms[i];stroke(ctx,[a.shoulder,a.elbow,a.hand],i?7:5,i?ink:'#527566');joint(ctx,a.elbow,2.8);joint(ctx,a.hand,2.6);}
 joint(ctx,p.shoulder,3.4);joint(ctx,p.hip,3.4);for(const k of p.knees)joint(ctx,k,3);
 ctx.beginPath();ctx.arc(p.head.x,p.head.y,15,0,Math.PI*2);ctx.fillStyle=paper;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3.5;ctx.stroke();ctx.beginPath();ctx.arc(p.head.x+6,p.head.y-2,1.7,0,Math.PI*2);ctx.fillStyle=ink;ctx.fill();stroke(ctx,[{x:p.head.x+10,y:p.head.y+4},{x:p.head.x+14,y:p.head.y+3}],1.5);ctx.restore();}
