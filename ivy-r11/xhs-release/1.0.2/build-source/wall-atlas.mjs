/** r10 authored/review-stage atlas contract. Runtime images only: no model renderer. */
export const ATLAS_VERSION='20261101-atlas-r10';
export const ART_STATUS='internal-placeholder-awaiting-design-review';
export const ATLAS=Object.freeze({
 leaves:{url:new URL('./assets/r10/ivy-leaves.webp',import.meta.url),width:1024,height:1024,cell:512,columns:2,count:4,tip:'up',ridge:286,left:35,right:476},
 walls:[new URL('./assets/r10/stone-wall-1.webp',import.meta.url),new URL('./assets/r10/stone-wall-2.webp',import.meta.url)],
 girl:{url:new URL('./assets/r10/girl-poses.webp',import.meta.url),width:640,height:640,cellWidth:160,cellHeight:320,columns:4,footY:291,waistY:163,centerX:80,poses:['ground','charge','launch','air','landing','fall','climb','ground']},
 particle:{url:new URL('./assets/r10/light-speck.webp',import.meta.url)}
});
export const PROJECTION=Object.freeze({sx:52,sy:230,sz:28});
export function projectXYZ(p,{width,height,insets={top:52,bottom:100},baseY=0,sx=PROJECTION.sx,sy=PROJECTION.sy,sz=PROJECTION.sz,centerX=0}={}){
 return {x:width/2+(p.x-centerX)*sx,y:height-insets.bottom-38-(p.y-baseY)*sy+((p.z??1)-1)*sz};
}
export function characterPose(wall){
 const b=wall.body,age=wall.time-wall.flightTime;
 if(b.phase==='slipping'||!b.grounded&&(wall.feedback.type==='slipped'||b.y<(wall.leaves[wall.lastLeaf]?.y??0)-.18))return'fall';
 if(wall.input)return'charge';
 if(['landing','impact'].includes(b.phase)||b.compression>.18)return'landing';
 if(!b.grounded)return age<.13?'launch':'air';
 return'ground';
}
