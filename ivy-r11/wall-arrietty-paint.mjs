/** R11.1 reference-informed character paint for the human-proportioned visual rig.
 * Authored Canvas paths reference the supplied red outfit / chestnut ponytail /
 * pale light bag direction. No reference pixels, 3D model, physics or input mapping are imported here.
 * Palms and soles retain physical R11 anchors; the visual rig is revised separately.
 */
export const ARRIETTY_PALETTE=Object.freeze({red:'#b93642',redShade:'#772c36',redLight:'#d45b57',skin:'#eac19b',skinShade:'#986749',hair:'#78432d',hairLight:'#a3623b',bag:'#d6cfad'});

// Conservative hem envelope used by both painting and clearance diagnostics.
const HEM=Object.freeze([{x:-8.8,y:8},{x:0,y:10},{x:8.2,y:7.6}]);
export function skirtHem(p){return HEM.map(v=>({x:p.hip.x+(p.n.x*v.x+p.u.x*v.y)*p.k,y:p.hip.y+(p.n.y*v.x+p.u.y*v.y)*p.k}));}

export function paintArriettyGirl(ctx,pose,atlas,drawImage){
 const p=pose,k=p.k,C=ARRIETTY_PALETTE;
 const stroke=(bone,color,width)=>{ctx.beginPath();ctx.moveTo(bone.start.x,bone.start.y);ctx.lineTo(bone.joint.x,bone.joint.y);ctx.lineTo(bone.end.x,bone.end.y);ctx.strokeStyle=color;ctx.lineWidth=width*k;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();};
 // Slim paired legs below the short skirt. They follow the revised rig; this
 // painter never moves a knee, palm or sole to conceal a contact error.
 for(const leg of p.legs){const dx=leg.joint.x-leg.end.x,dy=leg.joint.y-leg.end.y,d=Math.hypot(dx,dy),visible={...leg,end:{x:leg.end.x+dx/d*4.6*k,y:leg.end.y+dy/d*4.6*k}};stroke(visible,'#a0785c',4.2);stroke(visible,'#d9bb92',2.6);}
 for(const arm of p.arms){stroke(arm,C.redShade,4);stroke(arm,C.red,2.6);}
 ctx.save();ctx.transform(p.n.x*k,p.n.y*k,p.u.x*k,p.u.y*k,p.shoulder.x,p.shoulder.y);
 const d=p.torsoLength/k;
 const fill=(color,path)=>{ctx.beginPath();path();ctx.closePath();ctx.fillStyle=color;ctx.fill();};
 // Separate fitted bodice and a small A-line skirt: the hem stays visibly
 // above the knees/boots, rather than covering a flattened four-limb crouch.
 fill(C.redShade,()=>{ctx.moveTo(-5.1,-1);ctx.quadraticCurveTo(-5.2,d*.3,-3.8,d*.69);ctx.lineTo(4.3,d*.69);ctx.quadraticCurveTo(5.2,3,4.8,-1);});
 fill(C.red,()=>{ctx.moveTo(-4.4,-.8);ctx.lineTo(-3.1,d*.68);ctx.lineTo(2.9,d*.68);ctx.lineTo(3.5,0);});
 fill(C.redShade,()=>{ctx.moveTo(-3.8,d*.64);ctx.lineTo(HEM[0].x,d+HEM[0].y);ctx.quadraticCurveTo(HEM[1].x,d+HEM[1].y,HEM[2].x,d+HEM[2].y);ctx.lineTo(4.3,d*.64);});
 fill(C.red,()=>{ctx.moveTo(-3.4,d*.64);ctx.lineTo(-7.2,d+7.8);ctx.quadraticCurveTo(-2,d+8.8,4.3,d+7.7);ctx.lineTo(2.9,d*.64);});
 fill(C.redLight,()=>{ctx.moveTo(-2.8,1);ctx.lineTo(-1.6,1.1);ctx.lineTo(-1.4,d*.62);ctx.lineTo(-4.7,d+7.5);ctx.lineTo(-6,d+7.4);ctx.lineTo(-2.7,d*.62);});
 ctx.strokeStyle='#e08b77';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(-3.5,d*.64);ctx.lineTo(3.9,d*.64);ctx.stroke();
 ctx.strokeStyle='#943039';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(.6,d*.75);ctx.lineTo(2,d+7.9);ctx.stroke();
 // A short secured back pin is retained, not a new hand-held weapon.
 ctx.strokeStyle='#aaab8d';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(6.5,4);ctx.lineTo(6.8,12);ctx.stroke();ctx.fillStyle='#e6c66e';ctx.beginPath();ctx.arc(6.5,3.7,1.15,0,Math.PI*2);ctx.fill();
 // The small pale soft bag follows the reference instead of covering the whole
 // torso with the previous green parcel. Its strap remains attached to shoulder.
 fill('#8e8a70',()=>{ctx.moveTo(.9,1.2);ctx.quadraticCurveTo(6.9,.9,7.1,6.5);ctx.quadraticCurveTo(7.2,11.7,2.7,12.7);ctx.quadraticCurveTo(-.8,12.1,-.2,7);});
 fill(C.bag,()=>{ctx.moveTo(1,1.6);ctx.quadraticCurveTo(5.8,1.3,6,6.1);ctx.quadraticCurveTo(6.6,10.2,2.6,11.4);ctx.quadraticCurveTo(-.2,10.8,.3,6.8);});
 ctx.strokeStyle='#ded4a7';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-3.4,-.8);ctx.quadraticCurveTo(-1.8,4.2,1.3,8.9);ctx.stroke();
 // Neck, a compact warm three-quarter face, and the recognisable red hair clip.
 fill(C.skinShade,()=>{ctx.moveTo(-2.1,-4.8);ctx.lineTo(2.2,-4.1);ctx.lineTo(2,0);ctx.lineTo(-1.5,.3);});
 fill(C.hair,()=>{ctx.moveTo(3.1,-12.1);ctx.quadraticCurveTo(7.4,-13.8,8.1,-8.7);ctx.quadraticCurveTo(9,-4.4,6.2,-1.3);ctx.quadraticCurveTo(4.8,-1.9,3.6,-4.4);ctx.quadraticCurveTo(5.6,-8.3,3.1,-12.1);});
 fill(C.hairLight,()=>{ctx.moveTo(5,-11.4);ctx.quadraticCurveTo(7.5,-9.8,6.9,-6.5);ctx.lineTo(5.8,-3.5);ctx.quadraticCurveTo(6.5,-7.2,5,-11.4);});
 fill(C.skinShade,()=>{ctx.moveTo(-5.9,-10.7);ctx.quadraticCurveTo(-6.8,-6.2,-3,-3.5);ctx.quadraticCurveTo(.5,-2.3,3.2,-6.2);ctx.lineTo(3.6,-11.4);});
 fill(C.skin,()=>{ctx.moveTo(-5.2,-10.8);ctx.quadraticCurveTo(-5.5,-8.8,-6,-7.9);ctx.lineTo(-5.2,-7.5);ctx.quadraticCurveTo(-5,-4.3,-2.4,-3.7);ctx.quadraticCurveTo(.8,-3.4,2.3,-6.1);ctx.lineTo(2.3,-11);});
 fill(C.hair,()=>{ctx.moveTo(-6,-10.8);ctx.quadraticCurveTo(-6.3,-14.1,-2.5,-14.5);ctx.quadraticCurveTo(2.6,-16,4.6,-11.4);ctx.quadraticCurveTo(5,-7.1,2.1,-5);ctx.lineTo(1.7,-9.7);ctx.quadraticCurveTo(-.6,-9.3,-3.5,-11.5);ctx.lineTo(-5.3,-9.6);});
 ctx.strokeStyle=C.hairLight;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-4.9,-12.4);ctx.quadraticCurveTo(-1.6,-14.4,2.2,-12.1);ctx.stroke();
 fill('#d56555',()=>{ctx.moveTo(2.2,-14.8);ctx.lineTo(3.7,-15.1);ctx.lineTo(4.7,-10.8);ctx.lineTo(3.3,-10.6);});
 ctx.strokeStyle='#eea18b';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(2.7,-14.5);ctx.lineTo(3.7,-11.1);ctx.stroke();
 ctx.fillStyle='#392a23';ctx.beginPath();ctx.ellipse(-3.7,-8.1,.55,.78,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#a66f51';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(-4.2,-5.9);ctx.lineTo(-2.9,-5.7);ctx.stroke();
 ctx.restore();
 // Exact original boot crop/sole pivot and physical palm anchors. No broad
 // overlay strokes at the contacts, hidden platforms, or body-point proxies.
 for(let i=0;i<2;i++){
  const f=p.feet[i],a=p.bootAngles?.[i]??Math.atan2(p.n.y,p.n.x);ctx.save();ctx.translate(f.x,f.y);ctx.rotate(a);
  drawImage(atlas,i?82:60,274,18,17,-2.7*k,-5.1*k,5.4*k,5.1*k);ctx.restore();
  const h=p.hands[i];ctx.save();ctx.translate(h.x,h.y);ctx.rotate(Math.atan2(-p.u.x,p.u.y));ctx.fillStyle=C.skin;ctx.beginPath();ctx.ellipse(0,-1.3*k,2.1*k,1.5*k,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
}
