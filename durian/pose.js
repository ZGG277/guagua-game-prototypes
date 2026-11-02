const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const u=clamp((v-a)/(b-a),0,1);return u*u*(3-2*u)};
const ARM=65;
// Pure kinematic animation, not an extra force on cloth or fruit. Every arm uses
// two fixed 65-unit bones; the torso shifts before IK instead of stretching sleeves.
function elbow(a,b,side=1){const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy)),along=d/2,height=Math.sqrt(Math.max(0,ARM*ARM-along*along));return{x:a.x+dx/d*along-dy/d*height*side,y:a.y+dy/d*along+dx/d*height*side}}
export function catcherPose(hand,collecting=false,motion={}){
 const alignment=motion.alignment||0;hand={...hand,x:hand.x-alignment};
 const time=Number.isFinite(motion.time)?motion.time:0,age=Number.isFinite(motion.catchAge)?motion.catchAge:-1;
 const v=motion.handVelocity||{},vx=clamp(v.x||0,-600,600),vy=clamp(v.y||0,-600,600);
 const collectionTime=collecting?(Number.isFinite(motion.collectionProgress)?motion.collectionProgress:1):0;
 const prep=smooth(.85,1.4,time)*(1-smooth(1.47,1.85,time));
 const cast=smooth(0,1,clamp((405-hand.y)/125,0,1));
 // A single critically damped compression: onset is continuous, with no repeated bounce.
 const impact=age>=0?(age/.12)*Math.exp(1-age/.12):0;
 const hinge=motion.circle&&age>=0?smooth(.12,.65,age)*(1-smooth(1.7,2.65,age))*(1-smooth(0,1,motion.recoveryProgress||0)):0;
 const carried=collecting&&!motion.circle?smooth(0,1,clamp((315-hand.x)/65,0,1)):0;
 const bend=clamp((hand.y-340)/130,0,1);
 const hip={x:267+clamp((hand.x-315)*.2,-26,30)+cast*5-prep*5-impact*3-hinge*3,y:440+bend*31+prep*7-cast*5+impact*9+hinge*(8-bend*13)};
 const angle=Math.atan2((hand.x-315)*.65+20+clamp(vx*.008,-4,4)-impact*9,105)+hinge*.08;
 const shoulder={x:hip.x+Math.sin(angle)*105-impact*3,y:hip.y-Math.cos(angle)*105+clamp(vy*.006,-3,3)+impact*4};
 const hands=[{x:hand.x-11.52,y:hand.y+5.76},{x:hand.x+11.52,y:hand.y-5.76}];
 // Project the shoulder into both arms' reachable disks with a little elbow slack.
 for(let pass=0;pass<4;pass++)for(let i=0;i<2;i++){const h=hands[i],ax=shoulder.x+(i?7:-7),ay=shoulder.y+5,dx=h.x-ax,dy=h.y-ay,d=Math.hypot(dx,dy);if(d>126){shoulder.x+=dx*(d-126)/d;shoulder.y+=dy*(d-126)/d}}
 const arms=hands.map((h,i)=>{const a={x:shoulder.x+(i?7:-7),y:shoulder.y+5};let e=elbow(a,h,i?1:-1);if(motion.circle){const dx=h.x-a.x,dy=h.y-a.y,d=Math.max(.001,Math.hypot(dx,dy)),height=Math.sqrt(Math.max(0,ARM*ARM-d*d/4)),side=.7;e={x:(a.x+h.x)/2-dy/d*height*side,y:(a.y+h.y)/2+dx/d*height*side,z:Math.sqrt(1-side*side)*height};}return{shoulder:a,elbow:e,hand:h}});
 // Eyes, nose and hair rotate through a front-facing intermediate pose, not a flip.
 const facing=1-2*carried;
 const head={x:shoulder.x+4-9*carried-clamp(vx*.006,-3,3),y:shoulder.y-36-clamp(vy*.005,-2.5,2.5)-impact*2};
 const knees=[{x:hip.x-32-bend*8-prep*3,y:500+bend*5+impact*2},{x:hip.x+28+cast*3,y:499+bend*8+impact*2}];
 const feet=[{x:234,y:539},{x:293,y:541}];if(alignment){for(const p of[hip,shoulder,head,...knees,...feet])p.x+=alignment;for(const a of arms)for(const p of[a.shoulder,a.elbow,a.hand])p.x+=alignment;}return{bend,hip,shoulder,head,arms,knees,feet,facing,anticipation:prep,catchCompression:impact,carryBlend:carried};
}
