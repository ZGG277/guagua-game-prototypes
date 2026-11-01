const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Kinematic two-link limbs. The cloth/fruit remain physics-driven; the catcher
// shifts hips and folds at knees/waist instead of scaling sleeves to reach.
function elbow(a,b,side=1){const upper=65,lower=65,dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy)),along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));return{x:a.x+dx/d*along-dy/d*height*side,y:a.y+dy/d*along+dx/d*height*side}}
export function catcherPose(hand,collecting=false){const bend=clamp((hand.y-340)/130,0,1),hip={x:267+clamp((hand.x-315)*.2,-26,30),y:440+bend*31};const angle=Math.atan2((hand.x-315)*.65+20,105),shoulder={x:hip.x+Math.sin(angle)*105,y:hip.y-Math.cos(angle)*105};
 const hands=[{x:hand.x-11.52,y:hand.y+5.76},{x:hand.x+11.52,y:hand.y-5.76}];
 // Extra torso lean only when needed, never lengthen the arm bones.
 for(const h of hands){const d=Math.hypot(h.x-shoulder.x,h.y-shoulder.y);if(d>123){shoulder.x+=(h.x-shoulder.x)*(d-123)/d;shoulder.y+=(h.y-shoulder.y)*(d-123)/d}}
 const arms=hands.map((h,i)=>{const a={x:shoulder.x+(i?7:-7),y:shoulder.y+5};return{shoulder:a,elbow:elbow(a,h,i?1:-1),hand:h}});
 const head={x:shoulder.x+(collecting?-5:4),y:shoulder.y-36};const knees=[{x:hip.x-32-bend*8,y:500+bend*5},{x:hip.x+28,y:499+bend*8}];return{bend,hip,shoulder,head,arms,knees,feet:[{x:234,y:539},{x:293,y:541}]};}
