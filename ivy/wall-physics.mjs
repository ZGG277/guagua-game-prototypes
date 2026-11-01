import {mesh,positions,surface} from './lab-physics.mjs';
export {mesh};
export const DT=1/120,CHARGE_TIME=.85,GRAVITY=12,TRAVEL_Z=1;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SAFE_ROUTE=Array.from({length:22},(_,i)=>i);
export function makeLeaves({novice=false}={}){
 const xs=[0,-.93,.32,1.24,.24,-1.05,-.18,1.17,.48,-.81,-1.39,-.18,.99,.17,-1.1,-.38,1.09,.46,-.76,.21,1.32,.15];
 const gaps=[0,.67,1.17,.72,1.21,.89,.64,1.24,.76,1.13,.68,1.18,.91,.65,1.23,.73,1.15,.86,.67,1.24,.74,1.16];let y=0;
 const leaves=xs.map((x,i)=>{y+=gaps[i];return{id:i,x:x*1.25,y,z:.16+.08*Math.sin(i*2.1),scale:.55+.115*Math.sin(i*1.8+.4),rotation:.30*Math.sin(i*1.7),safe:true,goal:i===21,state:{bend:.26,twist:0,bendVelocity:0,twistVelocity:0,pitch:.035*Math.sin(i*2.4),cup:.024*Math.sin(i*1.9)},age:0};});
 // The r9 play route keeps the same true leaf meshes, but gives beginners real
 // blade area and shorter gaps rather than invisible platforms or auto-aim.
 if(novice){let height=0;for(const l of leaves){
  height+=l.id===0?0:l.id===1?.86:.90+.12*(.5+.5*Math.sin(l.id*1.9));
  l.x*=.72;l.y=height;if(l.id!==0)l.scale=.72+.04*Math.sin(l.id*1.8+.4);if(l.id===1){l.x=-.72;l.z=.16;l.scale=.70;}
 }
 // A deliberately separated intermediate handhold teaches supported reaching.
 // Preserve the validated legacy blade profile, with an anticipatory crouch
 // carried from landing so the head never rises into this overhead handhold.
 const from=leaves[7],lesson=leaves[8],sourceX=from.x+Math.tan(from.rotation)*(TRAVEL_Z-from.z),shift=lesson.y-(from.y+.627534);
 from.teachingClamber={targetId:lesson.id,aim:-1,power:.05};from.preparationCrouch=.32;from.x=sourceX;from.scale=leaves[0].scale;from.rotation=0;from.z=.16;from.state.pitch=0;from.state.cup=0;
 lesson.x=sourceX-1.176904;lesson.scale=.6429770864392529;lesson.rotation=.29749944313574056;lesson.z=.2290567493319099;lesson.state.pitch=.023641211319290284;lesson.state.cup=.02271120210449795;for(let i=8;i<leaves.length;i++)leaves[i].y-=shift;
 }
 for(const [n,side] of [[3,-1],[6,1],[9,1],[12,-1],[16,-1],[19,-1]]){const l=leaves[n];leaves.push({id:leaves.length,x:l.x+side*1.25,y:l.y+.43,z:.34,scale:.36,rotation:side*.25,safe:false,goal:false,state:{bend:.26,twist:0,bendVelocity:0,twistVelocity:0},age:0});}return leaves;
}
// All load modes displace the collision top itself; thickness is render-only below it.
export function deformedPositions(state={}){
 const p=positions(state),spread=state.loadSpread||.11;
 for(let i=0;i<p.length;i+=3){const x=p[i],z=p[i+2],root=clamp(z/.5,0,1);
  p[i+1]+=((state.pitch||0)-.10)*z+(state.cup||0)*x*x;
  if(state.depression){const dz=((z-(state.loadZ||0))/.48)**2,dx=x-(state.loadX||0);
   const bowl=(Math.exp(-(((dx-spread)/.34)**2)-dz)+Math.exp(-(((dx+spread)/.34)**2)-dz))*.5;
   p[i+1]-=state.depression*bowl*root;
  }
  // Lower-amplitude edge mode lags the midrib; envelope vanishes at attachment.
  p[i+1]+=(state.edgeRipple||0)*Math.min(1,Math.abs(x)/1.1)**2*root*Math.sin(z*1.6+.3);
 }
 return p;
}
export function advanceLeafDynamics(l,{occupied=false,x=0,z=0,charge=0,impact=0,spread=.11,footLoad=true,footX=x,footZ=z}={},dt=DT){
 const s=l.state,lever=clamp(z/3.5,0,1),target=.26+(occupied?(l.safe?.62:.85)*lever:0);
 s.bendVelocity+=(48*(target-s.bend)-7.8*s.bendVelocity)*dt;s.bend+=s.bendVelocity*dt;
 s.twistVelocity+=(42*((occupied?x*.17:0)-s.twist)-7*s.twistVelocity)*dt;s.twist+=s.twistVelocity*dt;
 if(occupied){const follow=1-Math.exp(-12*dt);s.loadX=(s.loadX??footX)+(footX-(s.loadX??footX))*follow;s.loadZ=(s.loadZ??footZ)+(footZ-(s.loadZ??footZ))*follow;s.loadSpread=spread;}
 s.depressionVelocity=s.depressionVelocity||0;s.depression=s.depression||0;
 const bowl=occupied?.025+Number(footLoad)*(.018+.015*charge+.09*impact):0;
 s.depressionVelocity+=(110*(bowl-s.depression)-13*s.depressionVelocity)*dt;s.depression+=s.depressionVelocity*dt;
 s.edgeVelocity=s.edgeVelocity||0;s.edgeRipple=s.edgeRipple||0;
 const edgeTarget=clamp(-s.bendVelocity*.018,-.025,.025);
 s.edgeVelocity+=(65*(edgeTarget-s.edgeRipple)-8*s.edgeVelocity)*dt;s.edgeRipple+=s.edgeVelocity*dt;
 l.age=occupied?l.age+dt:0;
 const motion=Math.abs(s.bendVelocity)+Math.abs(s.twistVelocity)+Math.abs(s.bend-target)+Math.abs(s.twist)+Math.abs(s.depressionVelocity)+Math.abs(s.depression)+Math.abs(s.edgeVelocity)+Math.abs(s.edgeRipple);
 if(occupied||!l._positions||motion>.00001)l._positions=deformedPositions(s);
}
export function worldPositions(l){const p=l._positions?l._positions.slice():deformedPositions(l.state),c=Math.cos(l.rotation),s=Math.sin(l.rotation);for(let i=0;i<p.length;i+=3){const x=p[i]*l.scale,z=p[i+2]*l.scale;p[i]=l.x+c*x+s*z;p[i+1]=l.y+p[i+1]*l.scale;p[i+2]=l.z-s*x+c*z;}return p;}
export function localPoint(l,x,z){const c=Math.cos(l.rotation),s=Math.sin(l.rotation),dx=x-l.x,dz=z-l.z;return{x:(c*dx-s*dz)/l.scale,z:(s*dx+c*dz)/l.scale};}
export function worldSurface(l,x,z){const q=localPoint(l,x,z),hit=surface(q.x,q.z,l.state,l._positions||deformedPositions(l.state));if(!hit)return null;const c=Math.cos(l.rotation),s=Math.sin(l.rotation),n=hit.normal;return{...hit,y:l.y+hit.y*l.scale,normal:{x:(c*n.x+s*n.z)||0,y:n.y,z:(-s*n.x+c*n.z)||0}};}
export function launchVelocity(held,aim=0){const q=clamp(held/CHARGE_TIME,0,1);return{vx:clamp(aim,-1,1)*(1.45+1.65*q),vy:3.8+3*q};}
export class Wall{
 constructor({novice=false}={}){this.novice=novice;this.reset();}
 reset(){this.leaves=makeLeaves({novice:this.novice});this.time=0;this.accumulator=0;this.status='grounded';this.completed=false;this.falls=0;this.input=null;this.aimValue=0;this.standId=0;this.grip=null;this.lastLeaf=0;this.bestHeight=0;this.started=false;this.landTime=-10;this.flightTime=-10;this.feedback={type:'ready'};this.body={x:0,y:0,z:TRAVEL_Z,vx:0,vy:0,vz:0,grounded:true,phase:'grounded',compression:0,stanceWidth:.045,feet:[],hands:[],plannedFeet:[],plannedHands:[],reachProgress:0,climbProgress:0,lookTarget:null,slipSpeed:0,slipX:0,slipZ:0,tiltZ:0,tiltX:0};this.contacts();return this;}
 // Read-only aim suggestion. The controller still requires a real downward
 // displacement and release; this never changes launch velocity or position.
 guidance(){
  if(!this.novice||!this.body.grounded||this.completed)return null;
  const source=this.currentLeaf, target=this.leaves.find(l=>l.safe&&l.y>source.y+.1);
  if(!target)return null;
  const z=TRAVEL_Z,x=target.x+Math.tan(target.rotation)*(z-target.z),hit=worldSurface(target,x,z);
  if(!hit)return null;
  const dy=hit.y-this.body.y,power=clamp((Math.sqrt(2*GRAVITY*Math.max(.5,dy+.38))-3.8)/3,.18,.78),v=launchVelocity(power*CHARGE_TIME),disc=v.vy*v.vy-2*GRAVITY*dy;
  if(disc<=0)return null;
  const duration=(v.vy+Math.sqrt(disc))/GRAVITY,aim=clamp((x-this.body.x)/(duration*(1.45+1.65*power)),-1,1);
  return {targetId:target.id,leafId:target.id,x,y:hit.y,z,aim,power,...(source.teachingClamber?{clamberAlternative:{...source.teachingClamber}}:{})};
 }
 get currentLeaf(){return this.standId===null?null:this.leaves[this.standId];}
 get stable(){return this.body.grounded&&!this.completed;}
 get charge(){return this.input?clamp(this.input.power??this.input.held/CHARGE_TIME,0,1):0;}
 get height(){return Math.max(0,this.body.y-this.leaves[0].y);}
 get progress(){return this.completed?1:clamp(this.bestHeight/(this.leaves[21].y+.1),0,.99);}
 down(x=0,power=null){if(!this.stable||this.input)return false;this.started=true;this.input={held:0,startX:x,aim:this.aimValue,power};return true;}
 move(x){if(this.input)this.aim((x-this.input.startX)/110);}
 pull(power){if(this.input&&this.input.power!==null)this.input.power=clamp(Number.isFinite(power)?power:0,0,1);}
 aim(v){this.aimValue=clamp(v,-1,1);if(this.input)this.input.aim=this.aimValue;}
 aimBy(v){this.aim(this.aimValue+v);}
 cancel(){this.input=null;}
 up(){if(!this.input)return false;const a=this.input,charge=this.charge;this.cancel();if(!this.stable)return false;const v=launchVelocity(charge*CHARGE_TIME,a.aim);this.launch(v.vx,v.vy);return true;}
 launch(vx,vy){this.grip=null;const b=this.body;b.climbProgress=0;b.reachProgress=0;b.plannedHands=[];b.slipSpeed=0;b.slipX=0;b.slipZ=0;this.lastLeaf=this.standId??this.lastLeaf;this.standId=null;b.grounded=false;b.feet=[];b.hands=[];b.plannedFeet=[];b.vx=vx;b.vy=vy;b.compression=this.novice?(this.leaves[this.lastLeaf]?.preparationCrouch||0)*.33:0;b.phase='rising';this.flightTime=this.time;this.flightApex=b.y+Math.max(0,vy)**2/(2*GRAVITY);this.status='flying';this.feedback={type:'jump',time:this.time};}
 contacts(dt=0){
  const b=this.body,l=this.currentLeaf;if(!l)return false;
  const sample=width=>[-width,width].map(dx=>{const s=worldSurface(l,b.x+dx,b.z);return s?{x:b.x+dx,z:b.z,...s}:null;});
  // Keep the approved .065 support envelope and root reference exactly intact:
  // a relaxed replant is a real sampled sole pose, not an easier landing margin.
  const support=sample(.065);if(!support.every(Boolean))return false;
  const target=b.phase==='grounded'&&!this.input&&b.slipSpeed<=.025?.045:.065;
  const width=(b.stanceWidth??.065)+clamp(target-(b.stanceWidth??.065),-dt*.12,dt*.12);
  const relaxed=sample(width);b.stanceWidth=relaxed.every(Boolean)?width:.065;
  b.feet=relaxed.every(Boolean)?relaxed:support;
  b.y=(support[0].y+support[1].y)/2;
  const n=worldSurface(l,b.x,b.z)?.normal||support[0].normal;b.tiltZ=-Math.atan2(n.x,n.y);b.tiltX=Math.atan2(n.z,n.y);return true;
 }

 returnToBase(){const count=this.falls+1,best=this.bestHeight,time=this.time;this.reset();this.falls=count;this.bestHeight=best;this.time=time;this.feedback={type:'base',time};}
 step(seconds=DT){this.accumulator+=Math.max(0,Math.min(seconds,.25));while(this.accumulator+1e-10>=DT){this.tick(DT);this.accumulator-=DT;}return this;}
 advance(seconds){for(let t=0;t<seconds;t+=.1)this.step(Math.min(.1,seconds-t));return this;}
 tick(dt){if(this.completed)return;this.time+=dt;const b=this.body;if(this.input)this.input.held+=dt;const previousCompression=b.compression;b.compression=Math.max(0,b.compression-dt*1.1);
 // Prepare the already-existing crouch before landing on the sheltered lesson
 // perch. This changes posture only: no position, velocity, aim or collision.
 if(this.novice&&!b.grounded&&!this.grip&&b.vy<0)for(const l of this.leaves){
  if(!l.preparationCrouch)continue;const feet=[-.065,.065].map(dx=>worldSurface(l,b.x+dx,b.z));if(!feet.every(Boolean))continue;
  const gap=b.y-(feet[0].y+feet[1].y)/2;if(gap>0&&gap<.65)b.compression=Math.max(b.compression,Math.min(l.preparationCrouch*.33,previousCompression+dt*.8));
 }
 // The sheltered teaching perch carries the ordinary landing crouch rather
 // than standing up through its nearby overhead blade, then crouching again.
 const prepared=b.grounded?this.currentLeaf:this.grip?.reaching?this.leaves[this.grip.departureId]:(this.time-this.flightTime<.03?this.leaves[this.lastLeaf]:null);
 if(this.novice&&prepared?.preparationCrouch)b.compression=Math.max(b.compression,prepared.preparationCrouch*.33);
 for(const l of this.leaves){const occupied=l.id===this.standId||(!this.grip?.reaching&&l.id===this.grip?.leafId)||(this.grip?.reaching&&l.id===this.grip.departureId),q=localPoint(l,b.x,b.z);
  const planted=occupied?(b.feet||[]).filter(Boolean):[],foot=planted.length?localPoint(l,planted.reduce((n,f)=>n+f.x,0)/planted.length,planted.reduce((n,f)=>n+f.z,0)/planted.length):q;
  advanceLeafDynamics(l,{occupied,x:q.x,z:q.z,footX:foot.x,footZ:foot.z,charge:this.charge,impact:b.compression,footLoad:b.grounded||!!this.grip?.reaching?1:planted.length/2,spread:(b.stanceWidth||.065)/l.scale},dt);
 }
 if(this.grip){this.tickGrip(dt);return;}
 if(b.grounded){const l=this.currentLeaf,age=this.time-this.landTime,s=worldSurface(l,b.x,b.z)||worldSurface(l,b.x-.065,b.z)||worldSurface(l,b.x+.065,b.z);
  // A centre can lie above a lobe notch while both feet remain on actual blade.
  // In that case use a supporting foot’s current surface normal, never freeze.
  // The first root leaf is a safe tutorial perch. Elsewhere the impact crouch
  // briefly grips the wet blade before gravity wins against low sliding friction.
  // Braced legs absorb 55% of downhill acceleration; no expiry or forced fall: velocity follows the actual rendered surface normal.
  const settle=this.novice?.90:.36,ramp=this.novice?.65:.34;
  const release=l.id===0||l.goal?0:clamp((age-settle)/ramp,0,1);
  if(s&&release>0){const n=s.normal,slope=Math.hypot(n.x,n.z),friction=Math.max(0,1-.018/Math.max(slope,.001));
   b.vx+=(GRAVITY*.45*n.x*n.y*friction*release-b.vx*1.8)*dt;
   b.vz+=(GRAVITY*.45*n.z*n.y*friction*release-b.vz*1.8)*dt;
   b.x+=b.vx*dt;b.z+=b.vz*dt;
  }else{b.vx*=Math.exp(-9*dt);b.vz*=Math.exp(-9*dt);}
  b.slipSpeed=Math.hypot(b.vx,b.vz);b.slipX=b.vx;b.slipZ=b.vz;
  const sliding=release>0&&b.slipSpeed>.025;
  b.phase=sliding?'sliding':this.input?'charging':age<.17&&this.feedback.type!=='climbed'?'landing':age<.5?'recovery':'grounded';this.status=sliding?'sliding':'grounded';
  if(!this.contacts(dt)){this.cancel();this.launch(b.vx,-.1);b.phase='slipping';this.feedback={type:'slipped',time:this.time};}else if(this.input)b.compression=Math.max(b.compression,this.charge*.29);return;}

 if(b.vy>0&&this.tryCatch())return;
 const ox=b.x,oy=b.y;b.vy-=GRAVITY*dt;b.vz+=clamp(30*(TRAVEL_Z-b.z)-10*b.vz,-8,8)*dt;b.z+=b.vz*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.phase=b.vy>0?'rising':'falling';const candidates=[];
 if(b.vy<0)for(const l of this.leaves){if(Math.abs(b.y-l.y)>.65||Math.abs(b.x-l.x)>l.scale*2.5)continue;const left=worldSurface(l,b.x-.065,b.z),right=worldSurface(l,b.x+.065,b.z);if(!left||!right)continue;const h=(left.y+right.y)/2;if(oy>=h-.015&&b.y<=h)candidates.push({l,h});}
 if(candidates.length){candidates.sort((a,c)=>c.h-a.h);const l=candidates[0].l,speed=-b.vy;this.standId=l.id;this.landTime=this.time;b.grounded=true;b.vx*=.1;b.vz*=.1;b.vy=0;b.compression=.33;b.stanceWidth=.065;b.phase='landing';this.status='grounded';l.state.bendVelocity+=Math.min(1.5,speed*.19);l.state.depressionVelocity=(l.state.depressionVelocity||0)+Math.min(.22,speed*.035);this.contacts();this.bestHeight=Math.max(this.bestHeight,this.height);this.feedback={type:'landed',leaf:l.id,time:this.time};if(l.goal){this.completed=true;this.status='won';b.phase='celebrate';this.feedback={type:'complete',time:this.time};}return;}
 if(this.tryCatch())return;
 this.bestHeight=Math.max(this.bestHeight,this.height);if(b.y< -2.5)this.returnToBase();
 }
 // Low hops catch a reachable silhouette on ascent (or on a late falling reach). Contact
 // coordinates are resampled at fixed XZ against the spring-deformed mesh each
 // step; losing the real blade releases the grip. The root is never snapped
 // to a leaf centre.
 tryCatch(){
  const b=this.body;if(b.vy< -5.2||Math.abs(b.vx)>3.3)return false;
  const candidates=[];
  // Keep an already reachable foot landing: do not grab unrelated overhead
  // foliage while travelling past it toward a lower destination.
  for(const l of this.leaves){
   if(l.y>b.y+.2||l.y<b.y-2.2)continue;let t=0,hit=null;
   for(let k=0;k<3;k++){const target=hit?.y??l.y+.10,disc=b.vy*b.vy+2*GRAVITY*(b.y-target);if(disc<0){t=-1;break;}t=(b.vy+Math.sqrt(disc))/GRAVITY;if(t<0||t>.42)break;hit=worldSurface(l,b.x+b.vx*t,b.z);if(!hit)break;}
   if(t>=0&&t<=.42&&hit&&worldSurface(l,b.x+b.vx*t-.065,b.z)&&worldSurface(l,b.x+b.vx*t+.065,b.z))return false;
  }
  for(const l of this.leaves){
   if(l.y+.45<this.flightApex||l.y-b.y<.15||l.y-b.y>1||l.id===this.lastLeaf||l.y<this.leaves[this.lastLeaf].y+.12||Math.abs(l.x-b.x)>l.scale*2.3)continue;
   const z=b.z-.12,crossSectionX=l.x+Math.tan(l.rotation)*(z-l.z);
   const side=b.x>=(this.novice?crossSectionX:l.x)?1:-1;
   // Grip the actual lateral silhouette, not the interior of a blade. The
   // two palms straddle the edge in depth and stay inside its boundary.
   const hands=[-.025,.025].map(dz=>{
    const hz=z+dz;let inside=null,outside=null;
    for(let d=-.30;d<=.301;d+=.025){const x=b.x+side*d;if(worldSurface(l,x,hz))inside=x;else if(inside!==null){outside=x;break;}}
    if(inside===null||outside===null)return null;
    for(let k=0;k<9;k++){const x=(inside+outside)/2;if(worldSurface(l,x,hz))inside=x;else outside=x;}
    const x=inside-side*.018,hit=worldSurface(l,x,hz);return hit?{x,z:hz,...hit}:null;
   });
   if(!hands.every(Boolean)||b.vx*((hands[0].x+hands[1].x)/2-b.x)<-.015)continue;
   const y=(hands[0].y+hands[1].y)/2,gap=y-b.y,edgeX=(hands[0].x+hands[1].x)/2+side*.018;
   if(gap<.50||gap>.85||y<this.flightApex-.035||(edgeX-b.x)*side>.07)continue;
   if(hands.some((h,i)=>Math.hypot(h.x-(b.x+(i? .098:-.098)),h.y-(b.y+.588),h.z-(b.z-.008))>.31))continue;
   // A broad, rotated blade can curl behind a reachable hand edge and
   // intersect the head/parcel while the body hangs. Novice catches require a
   // conservative free upper-body corridor; rejected reaches continue normal
   // flight and can still land with both feet. No invisible support is added.
   const hangX=edgeX+side*.10;
   if(this.novice){
    // This release conservatively limits novice clambers to acquisition from
    // an actual planted departure. The general airborne mantle remains in
    // the legacy fixture; a rejected airborne reach just follows ballistics.
    const departure=this.leaves[this.lastLeaf],supported=[-.065,.065].every(dx=>{const foot=worldSurface(departure,b.x+dx,b.z);return foot&&Math.abs(foot.y-b.y)<.025;});
    if(!supported)continue;
    let blocked=false;
    // Match separate torso, outward-tilted head, and tucked parcel envelopes;
    // a single root-centred box wrongly rejects the intentionally outward pose.
    const crouch=departure.preparationCrouch||0,duck=crouch*.21,headDuck=duck+.44*(1-Math.cos(crouch*.85));
    const envelopes=[{offset:.04,radius:.09,low:.24-duck,high:.60-duck,z:[-.04,.08,.20]},{offset:.10,radius:.08,low:.60-headDuck,high:.85-headDuck,z:[-.10,0,.12]},{offset:.08,radius:.13,low:.40-duck,high:.75-duck,z:[.08,.20,.28]}];
    for(const t of [0,.5,1])for(const box of envelopes)for(const dx of [-box.radius,0,box.radius])for(const dz of box.z){
     const cx=b.x+(hangX-b.x)*t+side*box.offset,cz=b.z+(z-b.z)*t,cy=b.y-.022*t;
     const hit=worldSurface(l,cx+dx,cz+dz);if(hit&&hit.y-cy>box.low&&hit.y-cy<box.high)blocked=true;
    }
    if(blocked)continue;
   }
   const x=edgeX-side*.14,feet=[-.065,.065].map(dx=>worldSurface(l,x+dx,z));if(!feet.every(Boolean))continue;
   candidates.push({l,hands,y,z,x,hangX});
  }
  candidates.sort((a,c)=>Math.abs(a.y-b.y-.74)-Math.abs(c.y-b.y-.74));const c=candidates[0];if(!c)return false;
  this.cancel();this.grip={leafId:c.l.id,x:c.x,z:c.z,startX:b.x,hangX:c.hangX,handsXZ:c.hands.map(h=>({x:h.x,z:h.z})),startY:b.y,startZ:b.z,age:0};
  b.hands=c.hands;b.feet=[null,null];b.plannedFeet=[-.065,.065].map(dx=>{const x=c.x+dx,z=c.z,s=worldSurface(c.l,x,z);return s?{x,z,...s}:null;});b.vx=0;b.vz=0;b.vy=0;b.phase='catching';b.climbProgress=0;b.lookTarget={x:b.x,y:c.y,z:c.z};this.status='climbing';this.feedback={type:'caught',leaf:c.l.id,time:this.time};
  // An overhead edge already reachable while standing is acquired from the
  // departure perch: feet remain physical support while the arms reach up.
  const departure=this.leaves[this.lastLeaf],support=[-b.stanceWidth,b.stanceWidth].map(dx=>{const x=b.x+dx,s=worldSurface(departure,x,b.z);return s?{x,z:b.z,...s}:null;});
  const wideSupport=[-.065,.065].map(dx=>worldSurface(departure,b.x+dx,b.z));
  if(support.every(Boolean)&&wideSupport.every(f=>f&&Math.abs(f.y-b.y)<.025)){this.grip.reaching=true;this.grip.departureId=departure.id;this.grip.reachAge=0;b.phase='reaching';b.hands=[];b.plannedHands=c.hands;b.reachProgress=0;b.feet=support;}
  return true;
 }
 tickGrip(dt){
  const g=this.grip,b=this.body,l=this.leaves[g.leafId];
  if(g.reaching){
   const departure=this.leaves[g.departureId],feet=[-b.stanceWidth,b.stanceWidth].map(dx=>{const x=b.x+dx,s=worldSurface(departure,x,b.z);return s?{x,z:b.z,...s}:null;});
   const wideSupport=[-.065,.065].map(dx=>worldSurface(departure,b.x+dx,b.z));
   const targets=g.handsXZ.map(h=>{const s=worldSurface(l,h.x,h.z);return s?{...h,...s}:null;});
   if(!feet.every(Boolean)||!wideSupport.every(Boolean)||!targets.every(Boolean)){this.launch(0,-.2);return;}
   g.reachAge+=dt;b.reachProgress=clamp(g.reachAge/.26,0,1);b.plannedHands=targets;b.feet=feet;b.y=(wideSupport[0].y+wideSupport[1].y)/2;b.vy=0;b.vx=0;b.vz=0;b.phase='reaching';
   if(b.reachProgress>=1){g.reaching=false;g.startY=b.y;b.hands=targets;b.plannedHands=[];b.feet=[null,null];b.phase='catching';}
   return;
  }
  g.age+=dt;
  const hands=g.handsXZ.map(h=>{const s=worldSurface(l,h.x,h.z);return s?{...h,...s}:null;});
  if(!hands.every(Boolean)){this.launch(0,-.2);return;}
  b.hands=hands;const top=(hands[0].y+hands[1].y)/2;
  const p=clamp((g.age-.20)/1.25,0,1),smooth=p*p*(3-2*p),oldY=b.y;
  // The short loaded hang absorbs the catch before weight is transferred upward.
  const hang=g.startY-.022*Math.sin(Math.min(1,g.age/.20)*Math.PI/2);
  // Finish at the real sole support height, not the higher edge handhold.
  // Late transfer is continuous, so grounding cannot snap the torso/pin down.
  const landingFeet=[-.065,.065].map(dx=>worldSurface(l,g.x+dx,g.z)),transfer=clamp((p-.65)/.35,0,1),transferEase=transfer*transfer*(3-2*transfer);
  const soleTop=landingFeet.every(Boolean)?(landingFeet[0].y+landingFeet[1].y)/2:top,targetTop=top+(soleTop-top)*transferEase;
  b.y=hang+(targetTop-hang)*smooth;const settle=clamp(g.age/.20,0,1),over=clamp((p-.68)/.32,0,1),cross=over*over*(3-2*over);b.z=g.startZ+(g.z-g.startZ)*settle;b.x=(g.startX+(g.hangX-g.startX)*settle)*(1-cross)+g.x*cross;
  b.vy=(b.y-oldY)/dt;b.vx=0;b.phase=g.age<.20?'catching':'climbing';b.climbProgress=p;b.compression=.30*smooth;
  b.lookTarget={x:g.x,y:top,z:g.z};
  b.plannedFeet=[-.065,.065].map(dx=>{const x=g.x+dx,z=g.z,s=worldSurface(l,x,z);return s?{x,z,...s}:null;});
  b.feet=b.plannedFeet.map((s,i)=>p<(i?.81:.60)?null:s);
  if(p>=1){this.standId=l.id;this.grip=null;b.grounded=true;b.vy=0;b.compression=.30;b.stanceWidth=.065;b.phase='recovery';this.landTime=this.time;this.status='grounded';this.contacts();b.hands=[];b.plannedFeet=[];b.plannedHands=[];b.reachProgress=0;b.climbProgress=0;this.bestHeight=Math.max(this.bestHeight,this.height);this.feedback={type:'climbed',leaf:l.id,time:this.time};if(l.goal){this.completed=true;this.status='won';b.phase='celebrate';this.feedback={type:'complete',time:this.time};}}
 }
 snapshot(){return{time:this.time,status:this.status,standId:this.standId,body:{...this.body},charge:this.charge,completed:this.completed,falls:this.falls,progress:this.progress,feedback:this.feedback};}
}
