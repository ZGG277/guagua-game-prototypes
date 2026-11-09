/** Painterly source parts skinned to the existing read-only R11.2 2D rig.
 * The original RGBA atlas stays intact. Each part follows original endpoints.
 * No simulation, pose, input, persistence or platform state is written here.
 */
const URL_PARTS=new URL('./assets/character-sprite-v1/parts.png',import.meta.url);
const PARTS=Object.freeze({head:[6,43,452,335],dress:[474,10,323,407],bag:[878,41,345,362],sleeve:[129,448,193,362],forearm:[546,430,129,392],thigh:[929,428,183,394],shin:[146,849,130,379],boot:[454,916,329,281],grip:[937,850,186,386]});
const image=typeof Image==='function'?new Image():null;
let error=null;
if(image){image.onerror=()=>{error='character-sprite-v1 parts atlas failed to load';};image.src=String(URL_PARTS);}
export function characterSpriteStatus(){return{kind:'reference-derived-layered-painterly-sprite-v1',ready:!!image?.complete&&image.naturalWidth>0,error,url:String(URL_PARTS),parts:9};}
export function paintSpriteGirl(ctx,p){
 if(!characterSpriteStatus().ready)return false;
 const k=p.k;
 const part=(name,x,y,w,h,px=.5,py=.5)=>ctx.drawImage(image,...PARTS[name],x-w*px,y-h*py,w,h);
 const bone=(name,a,b,width)=>{
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),start=(name==='forearm'||name==='grip')?0.035:0.055,end=.965;
  ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx)-Math.PI/2);
  part(name,0,-len*start/(end-start),width*k,len/(end-start),.5,0);ctx.restore();
 };
 const arm=(a,near)=>{bone('sleeve',a.start,a.joint,near?5.5:5.1);bone(p.activeHands?'grip':'forearm',a.joint,a.end,p.activeHands?4.8:4.25);};
 const leg=a=>{const dx=a.joint.x-a.end.x,dy=a.joint.y-a.end.y,len=Math.hypot(dx,dy)||1,ankle={x:a.end.x+dx/len*4.8*k,y:a.end.y+dy/len*4.8*k};bone('thigh',a.start,a.joint,5.5);bone('shin',a.joint,ankle,3.7);};
 const boot=i=>{const f=p.feet[i],a=p.bootAngles?.[i]??Math.atan2(-p.u.x,p.u.y);ctx.save();ctx.translate(f.x,f.y);ctx.rotate(a);ctx.scale(p.facing<0?-k:k,k);part('boot',0,0,7.5,8,.38,1);ctx.restore();};
 leg(p.legs[0]);boot(0);leg(p.legs[1]);boot(1);arm(p.arms[0],false);
 ctx.save();ctx.transform(-p.n.x*k,-p.n.y*k,p.u.x*k,p.u.y*k,p.shoulder.x,p.shoulder.y);
 // Source artwork faces right: positive local x is the anatomical forward side.
 part('bag',-6.5,6,13,14,.55,.5);
 const d=p.torsoLength/k;
 part('dress',0,-1,19,d+11,.52,.15);
 // Chin pivot seats on the original neck. Ponytail is part of the head layer.
 part('head',.25,-2.8,25,25*335/452,.70,.96);
 ctx.restore();arm(p.arms[1],true);return true;
}
