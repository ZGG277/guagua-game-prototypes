/** Character-v2: layered 2D paint following the selected resolute cover.
 * All joints, planted palms and outsoles come from the unmodified R11.2 rig.
 * No physics, input, course, storage, SDK, timer or artwork dependency here.
 */
export const ARRIETTY_PALETTE=Object.freeze({red:'#b83932',redShade:'#672923',redLight:'#e16449',skin:'#f2c49a',skinShade:'#bd8056',hair:'#704025',hairLight:'#ce8745',bag:'#729342'});
import {paintSpriteGirl} from './wall-r112-sprite.mjs';
const HEM=Object.freeze([{x:-8.8,y:8},{x:0,y:10},{x:8.2,y:7.6}]);
export function skirtHem(p){return HEM.map(v=>({x:p.hip.x+(p.n.x*v.x+p.u.x*v.y)*p.k,y:p.hip.y+(p.n.y*v.x+p.u.y*v.y)*p.k}));}
export function paintArriettyGirl(ctx,p){
 if(paintSpriteGirl(ctx,p))return;
 const k=p.k,C=ARRIETTY_PALETTE,TAU=Math.PI*2;
 const fill=(color,path,outline=false)=>{ctx.beginPath();path();ctx.closePath();ctx.fillStyle=color;ctx.fill();if(outline){ctx.strokeStyle='#422d2580';ctx.lineWidth=.45;ctx.stroke();}};
 const line=(color,width,path)=>{ctx.beginPath();path();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();};
 const grad=(x0,y0,x1,y1,stops)=>{const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach(([a,c])=>g.addColorStop(a,c));return g;};
 const segment=(a,b,color,wa,wb)=>{const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(a.x+nx*wa*k/2,a.y+ny*wa*k/2);ctx.lineTo(b.x+nx*wb*k/2,b.y+ny*wb*k/2);ctx.lineTo(b.x-nx*wb*k/2,b.y-ny*wb*k/2);ctx.lineTo(a.x-nx*wa*k/2,a.y-ny*wa*k/2);ctx.closePath();ctx.fill();for(const [q,w]of[[a,wa],[b,wb]]){ctx.beginPath();ctx.arc(q.x,q.y,w*k/2,0,TAU);ctx.fill();}};
 const arm=(a,near)=>{
  segment(a.start,a.joint,near?C.red:C.redShade,5.3,3.8);
  const cuff={x:a.joint.x+(a.end.x-a.joint.x)*.17,y:a.joint.y+(a.end.y-a.joint.y)*.17};
  segment(a.joint,cuff,near?'#d45c42':'#91372c',4.2,3.8);
  segment(cuff,a.end,near?C.skin:'#bb885e',3.1,1.8);
  if(near)line('#f9d6a6',.65*k,()=>{ctx.moveTo(cuff.x-.55*k,cuff.y);ctx.lineTo(a.end.x-.55*k,a.end.y-1.2*k);});
 };
 // Rear equipment and far limbs precede the fitted red dress.
 ctx.save();ctx.transform(p.n.x*k,p.n.y*k,p.u.x*k,p.u.y*k,p.shoulder.x,p.shoulder.y);
 const d=p.torsoLength/k,pinY=d*.62;
 line('#66746c',1.2,()=>{ctx.moveTo(6,pinY);ctx.lineTo(29,pinY+7);});
 line('#dce4c9',.5,()=>{ctx.moveTo(6,pinY-.3);ctx.lineTo(29,pinY+6.7);});
 fill('#c6ba8a',()=>ctx.arc(5.4,pinY,1.6,0,TAU));ctx.restore();
 for(const [i,leg]of p.legs.entries()){
  const dx=leg.joint.x-leg.end.x,dy=leg.joint.y-leg.end.y,d=Math.hypot(dx,dy)||1,end={x:leg.end.x+dx/d*5*k,y:leg.end.y+dy/d*5*k};
  segment(leg.start,leg.joint,i?'#efbf91':'#b5845d',5.4,3.8);segment(leg.joint,end,i?'#eab889':'#a67551',3.8,2.5);
  if(i)line('#fbd6a5',.8*k,()=>{ctx.moveTo(leg.joint.x-.8*k,leg.joint.y);ctx.lineTo(end.x-.6*k,end.y);});
 }
 arm(p.arms[0],false);
 ctx.save();ctx.transform(p.n.x*k,p.n.y*k,p.u.x*k,p.u.y*k,p.shoulder.x,p.shoulder.y);
 fill(grad(-6,0,6,5,[[0,'#e57550'],[.42,C.red],[1,C.redShade]]),()=>{ctx.moveTo(-5.1,-1.5);ctx.quadraticCurveTo(-6,3,-3.8,d*.68);ctx.lineTo(4.3,d*.68);ctx.quadraticCurveTo(6,4,4.8,-1);ctx.quadraticCurveTo(0,-3,-5.1,-1.5);},true);
 fill(grad(-9,d,8,d+3,[[0,'#de6246'],[.25,'#b83b32'],[.7,'#a32e29'],[1,'#632c26']]),()=>{ctx.moveTo(-3.8,d*.64);ctx.quadraticCurveTo(-5,d,-8.8,d+8);ctx.quadraticCurveTo(0,d+10,8.2,d+7.6);ctx.quadraticCurveTo(5,d,4.3,d*.64);},true);
 fill('#f17a514e',()=>{ctx.moveTo(-2.7,d*.7);ctx.quadraticCurveTo(-3,d+2,-6.7,d+7.8);ctx.lineTo(-4.3,d+8.2);ctx.quadraticCurveTo(-1.5,d+2,-1.2,d*.73);});
 fill('#59272065',()=>{ctx.moveTo(1,d*.72);ctx.quadraticCurveTo(1.5,d+1,5.8,d+8.2);ctx.lineTo(7.7,d+7.7);ctx.quadraticCurveTo(4,d+2,3.2,d*.69);});
 line('#ef956552',.6,()=>{ctx.moveTo(-6.7,d+7.5);ctx.quadraticCurveTo(0,d+9.1,7.5,d+7.3);});
 // Brown waist belt and small brass buckle are legible at game scale.
 line('#68452c',2,()=>{ctx.moveTo(-3.7,d*.66);ctx.quadraticCurveTo(0,d*.7,4.1,d*.66);});
 fill('#d6aa58',()=>ctx.rect(-2.4,d*.66-1.2,2.2,2.2));fill('#6b452b',()=>ctx.rect(-1.9,d*.66-.65,1.2,1.1));
 // A round leaf bundle, tied high at the shoulder, with broad leaf lobes.
 fill('#34482a',()=>{ctx.moveTo(3,-1.6);ctx.bezierCurveTo(13,-1,15,4.5,11.7,10.5);ctx.quadraticCurveTo(7.6,15,1.3,10.5);ctx.quadraticCurveTo(-3.1,5.5,3,-1.6);},true);
 fill(grad(0,0,12,9,[[0,'#b3b858'],[.35,'#829943'],[.7,'#5b7935'],[1,'#354e2a']]),()=>{ctx.moveTo(3,-.8);ctx.bezierCurveTo(11,-.2,13.7,4.7,10.7,9.9);ctx.quadraticCurveTo(7,13.6,1.6,10);ctx.quadraticCurveTo(-2,5,3,-.8);});
 line('#c7c874',.6,()=>{ctx.moveTo(4,-.5);ctx.quadraticCurveTo(7,5,5.5,11.5);ctx.moveTo(5.4,3);ctx.quadraticCurveTo(8,1.8,10.1,2.2);ctx.moveTo(6,5.9);ctx.quadraticCurveTo(3.1,3.4,1,3.2);ctx.moveTo(6,8);ctx.quadraticCurveTo(8,6,11.4,5.7);});
 fill('#8da844',()=>{ctx.moveTo(3,-.6);ctx.quadraticCurveTo(-1,-3.7,1,-6.5);ctx.quadraticCurveTo(5,-5.1,4.2,-1);ctx.quadraticCurveTo(5,-5.7,8.5,-5.6);ctx.quadraticCurveTo(10,-2.4,5,-.5);},true);
 line('#c8b276',1,()=>{ctx.moveTo(1.7,-.4);ctx.lineTo(6.6,.3);});
 line('#52622d',2.2,()=>{ctx.moveTo(-3.7,-1.3);ctx.quadraticCurveTo(-1.7,3.2,2.8,8.5);});
 line('#b5b66a',.8,()=>{ctx.moveTo(-4.1,-1.2);ctx.quadraticCurveTo(-2.1,3.2,2.3,8.3);});
 // Neck and turned collar; head is deliberately larger than character-v1.
 fill(C.skinShade,()=>{ctx.moveTo(-2.1,-5.5);ctx.lineTo(2.3,-5.2);ctx.lineTo(2.2,-.4);ctx.lineTo(-1.4,.1);});
 fill('#f0bd8b',()=>{ctx.moveTo(-1.8,-4.8);ctx.lineTo(.8,-4.7);ctx.lineTo(.8,-.9);ctx.lineTo(-1.4,-.4);});
 fill('#7d2926',()=>{ctx.moveTo(-4.7,-1.6);ctx.lineTo(-1.4,-2.3);ctx.lineTo(.2,-.3);ctx.lineTo(-2,2.1);ctx.closePath();});
 fill('#d4573a',()=>{ctx.moveTo(.2,-.3);ctx.lineTo(2,-2.1);ctx.lineTo(4.7,-1.1);ctx.lineTo(2.1,1.6);});
 ctx.save();ctx.translate(-.25,-1.5);ctx.scale(1.13,1.13);
 const tuck=(p.foot.y-(p.feet[0].y+p.feet[1].y)/2)/k,sweep=Math.max(-2,Math.min(3,tuck*.5-(p.fold||0)));
 // Full high ponytail, separate from the head, with warm strand highlights.
 fill(grad(3,-18,17,-5,[[0,'#c1813d'],[.3,'#8e512a'],[.7,'#64351f'],[1,'#3e2c22']]),()=>{ctx.moveTo(3,-14);ctx.bezierCurveTo(10,-23,19+sweep,-16.5,17+sweep,-9.5);ctx.quadraticCurveTo(16+sweep,-4.7,11.7+sweep,-2.3);ctx.quadraticCurveTo(12.5+sweep,-7.3,10+sweep,-10.6);ctx.quadraticCurveTo(8,-14,4.2,-11.8);},true);
 line('#d79a4d',.45,()=>{ctx.moveTo(5,-15.5);ctx.bezierCurveTo(11,-20,16+sweep,-15.2,14.6+sweep,-9.1);});
 line('#ac7038',.4,()=>{ctx.moveTo(6,-15);ctx.quadraticCurveTo(13+sweep,-15.6,13+sweep,-6);});
 fill('#bb382d',()=>{ctx.moveTo(3.1,-16.3);ctx.lineTo(5.2,-16.9);ctx.lineTo(6.7,-12.2);ctx.lineTo(4.8,-11.6);},true);
 line('#f18655',.55,()=>{ctx.moveTo(3.8,-16);ctx.lineTo(5.3,-12.6);});
 // Sculpted face: forehead, small nose, firm chin, visible ear and brow.
 fill(grad(-7,-11,4,-5,[[0,'#ffe0ae'],[.55,'#edba87'],[1,'#bd8054']]),()=>{ctx.moveTo(-5.7,-12);ctx.quadraticCurveTo(-6.8,-10.5,-6.25,-8.4);ctx.quadraticCurveTo(-6.4,-7.8,-6.95,-7.35);ctx.quadraticCurveTo(-7.1,-6.85,-6.15,-6.7);ctx.quadraticCurveTo(-6.7,-4.2,-4.45,-3.35);ctx.quadraticCurveTo(-1.2,-2.8,1.9,-6.6);ctx.lineTo(3.5,-11.4);ctx.closePath();});
 fill('#f3a17e70',()=>ctx.ellipse(-4.45,-5.8,1.4,.85,-.15,0,TAU));
 fill(grad(-5,-15,5,-7,[[0,'#b57435'],[.25,'#87502b'],[.7,'#67381f'],[1,'#452a20']]),()=>{ctx.moveTo(-6.9,-11.3);ctx.bezierCurveTo(-7,-16.2,-.7,-17.6,3.2,-15.1);ctx.quadraticCurveTo(7.8,-13,4.3,-7.3);ctx.quadraticCurveTo(2.1,-5.2,.2,-5.7);ctx.lineTo(1,-10.3);ctx.quadraticCurveTo(-2.1,-10.3,-4.3,-13.1);ctx.quadraticCurveTo(-5.2,-10.3,-6.8,-9.4);ctx.closePath();},true);
 line('#d19950',.75,()=>{ctx.moveTo(-5.6,-13.9);ctx.quadraticCurveTo(-1.8,-16.4,2.3,-13.9);});
 line('#b87c3d',.55,()=>{ctx.moveTo(-3.9,-14.4);ctx.quadraticCurveTo(-.3,-13.6,2,-10.6);});
 fill('#efbf89',()=>ctx.ellipse(.2,-7.1,1.25,1.7,-.1,0,TAU));
 line('#bc7950',.4,()=>{ctx.moveTo(.7,-7.8);ctx.quadraticCurveTo(-.3,-8.4,-.4,-6.9);});
 // Red barrette and a raised inner brow make the gaze intent rather than blank.
 line('#7d2c25',1.8,()=>{ctx.moveTo(-.7,-13.9);ctx.lineTo(2.1,-12.8);});
 line('#ef7750',1.2,()=>{ctx.moveTo(-.9,-14.1);ctx.lineTo(1.9,-13);});
 fill('#fff0ce',()=>{ctx.moveTo(-6.05,-8.9);ctx.quadraticCurveTo(-4.65,-9.5,-3.65,-8.2);ctx.quadraticCurveTo(-4.8,-6.65,-5.95,-7.55);});
 fill('#82582e',()=>ctx.ellipse(-5.24,-8.15,.84,1.05,.1,0,TAU));
 fill('#302c23',()=>ctx.ellipse(-5.46,-8.22,.4,.75,.1,0,TAU));
 fill('#fff3d0',()=>ctx.arc(-5.65,-8.65,.23,0,TAU));
 line('#473022',.45,()=>{ctx.moveTo(-6.1,-8.9);ctx.quadraticCurveTo(-4.9,-9.5,-3.65,-8.2);});
 line('#613c24',.55,()=>{ctx.moveTo(-6.05,-10.25);ctx.quadraticCurveTo(-4.9,-10.25,-3.85,-9.65);});
 line('#ae7050',.33,()=>{ctx.moveTo(-6.05,-5.2);ctx.quadraticCurveTo(-5.45,-5.3,-5,-5.25);});
 ctx.restore();ctx.restore();
 arm(p.arms[1],true);
 // Soft brown leather boots, with soles at the exact original contact anchors.
 for(let i=0;i<2;i++){
  const f=p.feet[i],a=p.bootAngles?.[i]??Math.atan2(-p.u.x,p.u.y);ctx.save();ctx.translate(f.x,f.y);ctx.rotate(a);ctx.scale(k,k);
  fill(grad(-3,-6,4,-2,[[0,'#4b3526'],[.5,i?'#745333':'#533d29'],[1,'#342e23']]),()=>{ctx.moveTo(-2.5,-8);ctx.lineTo(2,-8);ctx.lineTo(1.9,-3.4);ctx.quadraticCurveTo(4,-3,4.4,-1.2);ctx.lineTo(4.4,0);ctx.lineTo(-2.8,0);ctx.lineTo(-2.9,-2.2);ctx.closePath();},true);
  line('#30291e',.8,()=>{ctx.moveTo(-2.6,-.4);ctx.lineTo(4.2,-.4);});
  line('#ad8b58',.5,()=>{ctx.moveTo(-2,-7.4);ctx.lineTo(1.5,-7.4);ctx.moveTo(-1.3,-5.6);ctx.lineTo(.8,-5);ctx.moveTo(-1.4,-4.2);ctx.lineTo(.8,-3.7);});
  ctx.restore();
  const h=p.hands[i];ctx.save();ctx.translate(h.x,h.y);ctx.rotate(Math.atan2(-p.u.x,p.u.y));ctx.fillStyle=i?C.skin:'#c49165';ctx.beginPath();ctx.ellipse(0,-1.3*k,2.1*k,1.5*k,0,0,TAU);ctx.fill();ctx.restore();
 }
}
