import{catcherPose}from'./pose.js?v=r12_3';
// Gameplay hurt volumes follow the articulated drawing. They do not add a hidden
// force or turn near cloth contact into adhesion. Depth gate keeps the loaded
// rear swing outside the body's plane (caught fruit is separately immune).
export function bodyCapsules(p){
 const c=[{part:'head',a:p.head,b:p.head,r:20},{part:'torso',a:p.shoulder,b:p.hip,r:18}];
 p.arms.forEach((arm,i)=>{c.push({part:`upper-arm-${i}`,a:arm.shoulder,b:arm.elbow,r:8},{part:`forearm-${i}`,a:arm.elbow,b:arm.hand,r:7})});
 p.knees.forEach((k,i)=>c.push({part:`thigh-${i}`,a:p.hip,b:k,r:12},{part:`shin-${i}`,a:k,b:p.feet[i],r:9}));return c;
}
const pointSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)};
// Substep spacing <= 2 world units prevents tunnelling, including diagnostic
// high-speed paths. The fixed physics step normally moves < 6 units.
export function sweepBody(from,to,pose,r=19){
 const n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z)/2)),caps=bodyCapsules(pose);
 for(let i=0;i<=n;i++){const u=i/n,z=from.z+(to.z-from.z)*u;if(Math.abs(z)>32+r)continue;const p={x:from.x+(to.x-from.x)*u+z*.48,y:from.y+(to.y-from.y)*u-z*.24};for(const cap of caps){if(pointSegment(p,cap.a,cap.b)<=cap.r+r)return{part:cap.part,u,point:p};}}return null;
}
export function studyBodyPose(s){return catcherPose(s.hand,false,{time:s.time,catchAge:s.contactTime===null?-1:s.time-s.contactTime,handVelocity:s.handVelocity,circle:true,alignment:s.alignment})}
