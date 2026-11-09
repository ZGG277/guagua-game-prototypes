/** Presentation only. Real input/contact/flight/grip timers remain authoritative. */
const clamp=x=>Math.max(0,Math.min(1,x));
export function characterMotion(wall,previous='idle'){
 const b=wall.body,g=wall.grip,age=Math.max(0,(wall.time||0)-(wall.landTime??-10));
 if(g?.kind==='edge-rescue'){
  const p=clamp(g.phaseProgress||0);
  if(g.phase==='catch')return {name:'hang'};
  if(g.phase==='pull')return {name:'pull_up',progress:p*.65};
  if(g.phase==='step')return p<.42?{name:'pull_up',progress:.65+p/.42*.35}:{name:'stand_up',progress:(p-.42)/.58*.55};
  return {name:'stand_up',progress:.55+p*.45};
 }
 if(wall.edgeReach||g?.reaching)return {name:'hang'};
 if(g){const p=clamp(b.climbProgress||0);return g.age<.2?{name:'hang'}:p<.72?{name:'pull_up',progress:p/.72}:{name:'stand_up',progress:(p-.72)/.28};}
 if(b.grounded&&wall.input)return {name:'charge',progress:clamp(wall.charge||0)};
 if(!b.grounded){const flightAge=Math.max(0,(wall.time||0)-(wall.flightTime??-10));return flightAge<.18&&b.vy>0?{name:'takeoff',progress:flightAge/.18}:{name:'airborne'};}
 // The ledge transfer already stood up; do not replay an impact after it.
 if(!['edge-climbed','climbed'].includes(wall.feedback?.type)){
  if(age<.16)return {name:'land_support',progress:age/.16};
  if(age<.52)return {name:'stand_up',progress:(age-.16)/.36};
 }
 const speed=Math.max(b.slipSpeed||0,Math.hypot(b.vx||0,b.vz||0));
 if(speed>=(previous==='run'?.105:.135))return {name:'run'};
 if(speed>=(previous==='walk'?.018:.03))return {name:'walk'};
 return {name:'idle'};
}
export const characterAnimation=(wall,previous)=>characterMotion(wall,previous).name;
