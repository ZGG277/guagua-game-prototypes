// R11 articulated rendering derived from the supplied generated character study.
// Pose coordinates are read-only. In particular each gripping fingertip ends at
// its supplied wrist/cloth-pin anchor; no cloth or static full-body sprite is painted.
const C={ink:'#123e38',shirt:'#db542d',shirtLight:'#f17b40',shirtDark:'#a43b24',skin:'#e7ad58',skinLight:'#f6cf83',skinShade:'#bd7c3b',pants:'#18594f',pantsLight:'#39786a',pantsDark:'#103e38',shoe:'#936331',shoeLight:'#c3944b'};
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const basis=(a,b)=>{const x=b.x-a.x,y=b.y-a.y,d=Math.hypot(x,y)||1;return{u:{x:x/d,y:y/d},n:{x:-y/d,y:x/d},d}};
const offset=(p,n,w)=>({x:p.x+n.x*w,y:p.y+n.y*w});
function stroke(ctx,points,color=C.ink,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function shape(ctx,points,color,width=1.8){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(width){ctx.strokeStyle=C.ink;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();}}
function oval(ctx,x,y,rx,ry,color,width=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(width){ctx.strokeStyle=C.ink;ctx.lineWidth=width;ctx.stroke();}}
function ribbon(ctx,a,b,c,widths,color){const ab=basis(a,b),bc=basis(b,c),joint={x:ab.n.x+bc.n.x,y:ab.n.y+bc.n.y},len=Math.hypot(joint.x,joint.y)||1;const j={x:joint.x/len,y:joint.y/len};shape(ctx,[offset(a,ab.n,widths[0]),offset(b,j,widths[1]),offset(c,bc.n,widths[2]),offset(c,bc.n,-widths[2]),offset(b,j,-widths[1]),offset(a,ab.n,-widths[0])],color,2);return{ab,bc,j};}
function leg(ctx,hip,knee,foot,near){const end={x:foot.x,y:foot.y-6};const b=ribbon(ctx,hip,knee,end,[12,10,7.5],near?C.pants:C.pantsDark);
 stroke(ctx,[offset(mix(hip,knee,.23),b.ab.n,-6),offset(knee,b.j,-5),offset(mix(knee,end,.8),b.bc.n,-4)],C.pantsLight,1.5);
 stroke(ctx,[offset(knee,b.j,7),offset(mix(knee,end,.18),b.bc.n,2),offset(mix(knee,end,.3),b.bc.n,5)],C.ink,1.1);
 for(let i=0;i<5;i++){const p=mix(knee,end,.28+i*.105);stroke(ctx,[offset(p,b.bc.n,3),offset({x:p.x+b.bc.u.x*5,y:p.y+b.bc.u.y*5},b.bc.n,6)],C.pantsLight,.8);}
 const cuff=mix(knee,end,.94);stroke(ctx,[offset(cuff,b.bc.n,-8),offset(cuff,b.bc.n,8)],C.ink,6);stroke(ctx,[offset(cuff,b.bc.n,-7.5),offset(cuff,b.bc.n,7.5)],C.pantsLight,3.5);
 ctx.save();ctx.translate(foot.x,foot.y);ctx.beginPath();ctx.moveTo(-9,-6);ctx.quadraticCurveTo(-3,-10,5,-6);ctx.lineTo(8,-1);ctx.bezierCurveTo(15,-2,23,2,23,6);ctx.lineTo(21,9);ctx.lineTo(-10,9);ctx.quadraticCurveTo(-13,3,-9,-6);ctx.closePath();ctx.fillStyle=C.shoe;ctx.fill();ctx.strokeStyle=C.ink;ctx.lineWidth=2;ctx.stroke();stroke(ctx,[{x:-9,y:6},{x:9,y:7},{x:21,y:6}],C.shoeLight,1.8);for(let i=0;i<3;i++)stroke(ctx,[{x:-3+i*2,y:-4+i*2.5},{x:4+i*2,y:-3+i*2.5}],C.shoeLight,1);stroke(ctx,[{x:10,y:1},{x:16,y:2},{x:19,y:4}],C.shoeLight,1);ctx.restore();
}
function arm(ctx,arm,near){const a=arm.shoulder,b=arm.elbow,h=arm.hand,ab=basis(a,b),bc=basis(b,h),wrist=mix(b,h,.9);
 // One continuous skin silhouette beneath a separate, genuinely short sleeve.
 ribbon(ctx,a,b,wrist,[8,6.4,4.1],near?C.skin:C.skinShade);
 const sleeve=mix(a,b,.61),sn=ab.n;shape(ctx,[offset(a,sn,11),offset(sleeve,sn,9.5),offset(sleeve,sn,-9.5),offset(a,sn,-11)],near?C.shirt:C.shirtDark,2);
 stroke(ctx,[offset(sleeve,sn,-9),offset(sleeve,sn,9)],C.ink,2.8);stroke(ctx,[offset(mix(a,b,.55),sn,-8),offset(mix(a,b,.55),sn,8)],C.shirtLight,1.2);
 stroke(ctx,[offset(mix(a,b,.14),sn,6),offset(mix(a,b,.38),sn,5),offset(mix(a,b,.5),sn,2)],C.shirtLight,1.4);
 stroke(ctx,[offset(mix(b,h,.12),bc.n,-3),offset(mix(b,h,.56),bc.n,-2.2),offset(mix(b,h,.82),bc.n,-1.5)],C.skinLight,1.6);
 for(let i=0;i<4;i++){const p=mix(b,h,.22+i*.14);stroke(ctx,[offset(p,bc.n,3.5),offset({x:p.x+bc.u.x*4,y:p.y+bc.u.y*4},bc.n,1.6)],C.skinShade,.8);}
 // Thumb and curled fingers wrap the exact anchor, not an offset ornamental hand.
 const n=bc.n,u=bc.u,palm={x:h.x-u.x*4,y:h.y-u.y*4};ctx.beginPath();let p=offset(wrist,n,4);ctx.moveTo(p.x,p.y);p=offset(palm,n,6);ctx.lineTo(p.x,p.y);ctx.quadraticCurveTo(h.x+n.x*6+u.x*2,h.y+n.y*6+u.y*2,h.x,h.y);ctx.quadraticCurveTo(h.x-n.x*5,h.y-n.y*5,palm.x-n.x*4,palm.y-n.y*4);p=offset(wrist,n,-4);ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fillStyle=C.skin;ctx.fill();ctx.strokeStyle=C.ink;ctx.lineWidth=1.4;ctx.stroke();
 for(let i=0;i<2;i++){let p={x:palm.x+u.x*(i*2.5),y:palm.y+u.y*(i*2.5)};stroke(ctx,[offset(p,n,3.6),offset({x:p.x+u.x*2,y:p.y+u.y*2},n,.5)],C.skinShade,.8)}
 stroke(ctx,[offset(palm,n,-3),{x:h.x-u.x*1.3,y:h.y-u.y*1.3},h],C.ink,1);
}
function torso(ctx,pose){const a=pose.shoulder,b=pose.hip,d=basis(a,b);ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(-(b.x-a.x),b.y-a.y));const L=d.d;
 ctx.beginPath();ctx.moveTo(-23,7);ctx.quadraticCurveTo(-15,-1,-7,-1);ctx.lineTo(0,11);ctx.lineTo(7,-1);ctx.quadraticCurveTo(17,0,24,9);ctx.bezierCurveTo(22,L*.35,16,L*.7,20,L-2);ctx.quadraticCurveTo(2,L+5,-20,L);ctx.bezierCurveTo(-23,L*.72,-18,L*.35,-23,7);ctx.closePath();ctx.fillStyle=C.shirt;ctx.fill();ctx.strokeStyle=C.ink;ctx.lineWidth=2.3;ctx.stroke();
 shape(ctx,[{x:-8,y:-2},{x:-15,y:4},{x:-11,y:19},{x:-2,y:11}],C.shirtLight,1.2);shape(ctx,[{x:7,y:-2},{x:15,y:5},{x:12,y:18},{x:2,y:11}],C.shirtLight,1.2);
 stroke(ctx,[{x:0,y:12},{x:2,y:26},{x:1,y:37}],C.ink,1.4);oval(ctx,2,24,1,1,C.skinLight);stroke(ctx,[{x:8,y:29},{x:19,y:29},{x:18,y:44},{x:9,y:46},{x:8,y:29}],C.shirtDark,1.1);stroke(ctx,[{x:9,y:32},{x:18,y:32}],C.shirtLight,.8);
 stroke(ctx,[{x:-16,y:27},{x:-12,y:L*.65},{x:-17,y:L-12}],C.shirtDark,1.7);stroke(ctx,[{x:-15,y:L-7},{x:-3,y:L-10},{x:16,y:L-6}],C.ink,1.4);stroke(ctx,[{x:-13,y:L-13},{x:2,y:L-18},{x:15,y:L-15}],C.shirtLight,1.2);
 for(let i=0;i<6;i++){const y=L*.44+i*5;stroke(ctx,[{x:-17,y},{x:-12,y:y-4}],C.shirtDark,.85)}for(let i=0;i<4;i++)stroke(ctx,[{x:7+i*2,y:L*.63-i*3},{x:11+i*1.3,y:L*.63-i*3-8}],C.shirtLight,.85);
 ctx.restore();
}
function head(ctx,pose){const h=pose.head,f=Number.isFinite(pose.facing)?pose.facing:1;
 // Connected neck retains the given head/shoulder positions and silhouette size.
 const neckA={x:h.x-f*2,y:h.y+13},neckB={x:pose.shoulder.x,y:pose.shoulder.y+8},n=basis(neckA,neckB).n;shape(ctx,[offset(neckA,n,5.5),offset(neckB,n,6),offset(neckB,n,-6),offset(neckA,n,-5.5)],C.skin,1.6);stroke(ctx,[{x:neckA.x+f*2,y:neckA.y+3},{x:neckB.x+f*1,y:neckB.y-3}],C.skinShade,1.1);
 ctx.save();ctx.translate(h.x,h.y);oval(ctx,0,0,13.5,19.5,C.skin,1.8);
 ctx.beginPath();ctx.moveTo(f*10,-8);ctx.quadraticCurveTo(f*13,-6,f*14,-3);ctx.quadraticCurveTo(f*21,0,f*14,3);ctx.lineTo(f*12,5);ctx.quadraticCurveTo(f*17,10,f*11,15);ctx.quadraticCurveTo(f*6,20,-f*2,18);ctx.fillStyle=C.skin;ctx.fill();ctx.strokeStyle=C.ink;ctx.lineWidth=1.5;ctx.stroke();
 oval(ctx,-f*11,1,4.1,5.5,C.skin,1.2);stroke(ctx,[{x:-f*12,y:-1},{x:-f*9,y:0},{x:-f*12,y:3}],C.skinShade,.9);
 ctx.beginPath();ctx.moveTo(-14,1);ctx.bezierCurveTo(-19,-11,-10,-24,2,-23);ctx.bezierCurveTo(13,-24,19,-12,12,-5);ctx.lineTo(11,-12);ctx.lineTo(6,-10);ctx.lineTo(8,-16);ctx.lineTo(1,-12);ctx.lineTo(2,-18);ctx.quadraticCurveTo(-8,-16,-10,-6);ctx.lineTo(-10,2);ctx.closePath();ctx.fillStyle=C.ink;ctx.fill();
 for(let i=0;i<6;i++)stroke(ctx,[{x:-12+i*3.7,y:-8-i%2*3},{x:-9+i*3.2,y:-16-i%3}],C.pantsLight,.8);
 stroke(ctx,[{x:f*2.5,y:-8},{x:f*7,y:-10},{x:f*10.5,y:-8.5}],C.ink,1.8);stroke(ctx,[{x:f*3,y:-5},{x:f*6.5,y:-6.5},{x:f*9,y:-5}],C.ink,1);oval(ctx,f*7,-5.2,1.15,1.4,C.ink);oval(ctx,f*7.35,-5.6,.35,.4,C.skinLight);
 stroke(ctx,[{x:f*7,y:9},{x:f*12,y:8},{x:f*14,y:9}],C.ink,.9);stroke(ctx,[{x:f*5,y:14},{x:f*10,y:15}],C.skinShade,.8);for(let i=0;i<3;i++)stroke(ctx,[{x:-f*(3+i*2),y:8+i*2},{x:-f*(1+i*2),y:10+i*2}],C.skinShade,.65);
 ctx.restore();
}
/** Draw an articulated adult catcher. ctx is CanvasRenderingContext2D; pose is read-only. */
export function drawCharacter(ctx,pose){if(!ctx||!pose?.arms?.length)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 leg(ctx,{x:pose.hip.x-8,y:pose.hip.y},pose.knees[0],pose.feet[0],false);
 leg(ctx,{x:pose.hip.x+8,y:pose.hip.y},pose.knees[1],pose.feet[1],true);
 arm(ctx,pose.arms[0],false);head(ctx,pose);torso(ctx,pose);arm(ctx,pose.arms[1],true);
 ctx.restore();}
