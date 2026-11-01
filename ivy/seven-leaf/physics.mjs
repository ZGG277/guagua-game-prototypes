// Deterministic, renderer-independent ivy wall simulation. y is the girl's feet.
export const DT=1/120, G=820, WORLD_W=480, START_Y=900, GOAL_Y=270;
export const CHARGE_TIME=.95, MAX_GUST_ACCEL=0, FOOT=15;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const surfaceY=(leaf,x,load=leaf.load)=>leaf.y+load*12+(x-leaf.x)*leaf.dir*load*.36;
export const launchVelocity=(held,aim=0)=>{const p=clamp(held/CHARGE_TIME,0,1);return{vx:clamp(aim,-1,1)*(85+155*p),vy:-(300+325*p)};};
export function makeLeaves(){
 // Seven hand-composed leaves, not a wall-sized platform field.
 const xs=[240,155,300,175,305,190,270], widths=[180,168,174,166,176,170,180];
 return xs.map((x,row)=>({id:row,row,x,y:START_Y-row*105,w:widths[row],
  // Leaves tilt back toward the previous support, creating real recoveries.
  dir:row===0?-1:Math.sign(xs[row-1]-x),load:0,previousLoad:0,standTime:0}));
}
export class Engine{
 constructor(){this.reset();}
 reset(){
  this.leaves=makeLeaves();this.time=0;this.accumulator=0;this.started=false;this.completed=false;
  this.standId=this.leaves.find(l=>l.row===0&&l.x===240).id;
  const l=this.leaves[this.standId];this.body={x:l.x,y:l.y,vx:0,vy:0};
  this.status='grounded';this.input=null;this.climb=null;this.launchTrail=[];this.events=[];this.lastLeaf=this.standId;
  this.bestHeight=0;this.feedback={type:'ready',time:0};this.butterfly={phase:'dormant',t:0,progress:0,gust:0,strength:0};
  this.flight=null;this.falls=0;return this;
 }
 get charge(){return this.input?clamp(this.input.held/CHARGE_TIME,0,1):0;}
 get height(){return Math.max(0,START_Y-this.body.y);}
 get progress(){return clamp(this.height/(START_Y-GOAL_Y),0,1);}
 get currentLeaf(){return this.standId===null?null:this.leaves[this.standId];}
 get stable(){return this.status==='grounded'||this.status==='sliding';}
 emit(type,data={}){const e={type,time:this.time,...data};this.events.push(e);if(this.events.length>60)this.events.shift();this.feedback=e;return e;}
 down(x=0,y=0){
  if(!this.stable||this.completed||this.input)return false;
  this.started=true;this.input={startX:x,startY:y,x,y,held:0,aim:0};return true;
 }
 move(x,y){if(this.input){this.input.x=x;this.input.y=y;this.input.aim=clamp((x-this.input.startX)/110,-1,1);}}
 aimBy(delta){if(this.input)this.input.aim=clamp(this.input.aim+delta,-1,1);}
 up(){
  if(!this.input)return false;
  const input=this.input;this.input=null;
  if(!this.stable)return false;
  const v=launchVelocity(input.held,input.aim),extra=clamp(this.body.vx*.2,-16,16);
  this.launch(v.vx+extra,v.vy);return true;
 }
 cancel(){this.input=null;}
 launch(vx,vy){
  this.flight={from:this.standId,startY:this.body.y,startTime:this.time};this.lastLeaf=this.standId??this.lastLeaf;
  this.standId=null;this.climb=null;this.status='flying';this.body.vx=vx;this.body.vy=vy;
  this.launchTrail=[];this.emit('jump');
 }
 catchLeaf(leaf,x,kind='feet'){
  const from=this.lastLeaf,previous=this.leaves[from];
  this.standId=leaf.id;this.lastLeaf=leaf.id;
  this.body.x=clamp(x,leaf.x-leaf.w/2+FOOT,leaf.x+leaf.w/2-FOOT);
  this.body.vx=0;this.body.vy=0;this.input=null;
  // Hands catch the front rim, then the feet pull over it. The surface keeps bending.
  this.body.y=surfaceY(leaf,this.body.x)+28;
  this.climb={progress:0,duration:.34,kind};this.status='climbing';leaf.standTime=0;
  this.flight=null;this.launchTrail=[];
  if(previous&&leaf.y>previous.y+45){this.falls++;this.emit('recovered',{from,to:leaf.id,lost:Math.round(leaf.y-previous.y)});}
  else this.emit('caught',{leaf:leaf.id});
 }
 returnToBase(){
  const l=this.leaves.find(l=>l.row===0&&l.x===240);
  this.standId=l.id;this.lastLeaf=l.id;this.body={x:l.x,y:l.y,vx:0,vy:0};
  l.load=0;l.previousLoad=0;l.standTime=0;this.input=null;this.climb=null;this.flight=null;this.status='grounded';this.launchTrail=[];this.falls++;
  this.emit('base');
 }
 // Kept as inert observation compatibility; this focused slice has no butterfly.
 updateButterfly(){}
 step(dt=DT){
  if(dt!==DT)throw new RangeError('Use fixed DT; advance() accumulates elapsed time.');
  if(this.completed)return;
  this.time+=dt;
  if(this.input)this.input.held+=dt;
  const occupied=this.standId;
  for(const l of this.leaves){
   l.previousLoad=l.load;
   if(l.id===occupied&&this.started){l.standTime+=dt;l.load=clamp(l.load+dt*.235,0,1);}
   else{l.standTime=0;l.load=clamp(l.load-dt*.32,0,1);}
  }
  this.bestHeight=Math.max(this.bestHeight,this.height);this.updateButterfly(dt);
  const b=this.body,l=this.currentLeaf,gust=this.butterfly.gust;
  if(this.status==='climbing'){
   this.climb.progress=clamp(this.climb.progress+dt/this.climb.duration,0,1);
   const p=this.climb.progress,e=1-(1-p)**3;
   b.y=surfaceY(l,b.x)+28*(1-e);
   if(p>=1){this.climb=null;this.status=l.load>.43?'sliding':'grounded';this.emit('stood',{leaf:l.id});
    if(l.row===this.leaves.length-1){this.completed=true;this.status='won';this.emit('complete');}}
   return;
  }
  if(this.stable){
   const slip=clamp((l.load-.40)/.60,0,1);
   this.status=slip>.06?'sliding':'grounded';
   const acceleration=l.dir*(16+125*slip)*slip;
   b.vx+=(acceleration+gust*MAX_GUST_ACCEL*.17)*dt;
   b.vx*=Math.exp(-dt*(slip>.02?.5:7));b.vx=clamp(b.vx,-78,78);
   b.x+=b.vx*dt;b.y=surfaceY(l,b.x);
   if(Math.abs(b.x-l.x)>l.w/2-FOOT){
    const vx=b.vx;this.cancel();this.launch(vx,35);this.emit('slipped',{from:l.id});
    // Feet already outside the rim; no false immediate recatch of the same leaf.
   }
   return;
  }
  if(this.status!=='flying')return;
  const prev={x:b.x,y:b.y};
  b.vx+=gust*MAX_GUST_ACCEL*dt;b.vx*=Math.exp(-.035*dt);b.vy+=G*dt;
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  // The wall bounds are softly blocking, never a hidden side-kill region.
  if(b.x<12){b.x=12;b.vx=Math.max(0,b.vx)*.2;}
  if(b.x>WORLD_W-12){b.x=WORLD_W-12;b.vx=Math.min(0,b.vx)*.2;}
  const contacts=[];
  for(const leaf of this.leaves){
   if(this.flight&&leaf.id===this.flight.from&&this.time-this.flight.startTime<.18)continue;
   const d0=prev.y-surfaceY(leaf,prev.x,leaf.previousLoad),d1=b.y-surfaceY(leaf,b.x);
   if(d0<=0&&d1>=0&&d1>d0){
    const t=clamp(-d0/(d1-d0),0,1),x=prev.x+(b.x-prev.x)*t;
    if(Math.abs(x-leaf.x)<=leaf.w/2-FOOT)contacts.push({leaf,x,t,kind:'feet'});
   }
   // Near-apex reach: hands can genuinely catch an edge just above the feet.
   if(b.vy>-195&&b.vy<50&&this.time-(this.flight?.startTime??0)>.18){
    const h0=d0-32,h1=d1-32;
    if(h0>=0&&h1<=0&&h0>h1){
     const t=clamp(h0/(h0-h1),0,1),x=prev.x+(b.x-prev.x)*t;
     if(Math.abs(x-leaf.x)<=leaf.w/2-FOOT)contacts.push({leaf,x,t,kind:'hands'});
    }
   }
  }
  if(contacts.length){contacts.sort((a,c)=>a.t-c.t||a.leaf.id-c.leaf.id);const c=contacts[0];this.catchLeaf(c.leaf,c.x,c.kind);return;}
  if(Math.floor(this.time/.045)!==Math.floor((this.time-dt)/.045)){this.launchTrail.push({x:b.x,y:b.y-14});if(this.launchTrail.length>17)this.launchTrail.shift();}
  if(b.y>START_Y+155)this.returnToBase();
 }
 advance(seconds){
  this.accumulator+=Math.max(0,seconds);
  while(this.accumulator+1e-10>=DT){this.step();this.accumulator-=DT;}return this;
 }
 snapshot(){return{time:this.time,status:this.status,standId:this.standId,body:{...this.body},input:this.input?{...this.input}:null,completed:this.completed,height:this.height,bestHeight:this.bestHeight,progress:this.progress,falls:this.falls,butterfly:{...this.butterfly},leaves:this.leaves.map(l=>({...l})),feedback:this.feedback?{...this.feedback}:null};}
}
