import{cameraFor,screenToWorld,worldToScreen}from'./camera.js';
import{castHand}from'./circle-motion.js';
import {STEP} from './physics.js';
import {responseHand,preparationLift,blendCastFromPreparation} from './input-response.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function path(points,t){for(let i=1;i<points.length;i++)if(t<=points[i][0]){const a=points[i-1],b=points[i];let u=clamp((t-a[0])/(b[0]-a[0]),0,1);u=u*u*(3-2*u);return{x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u}}const p=points[points.length-1];return{x:p[1],y:p[2]}}
export class HalfArcController{
 constructor(tuning={}){this.tuning=tuning;this.reset()}
 reset(){this.realTime=0;this.realAccumulator=0;this.autoCollect=true;this.releaseTime=null;this.upIntentAt=null;this.demo=false;this.active=false;this.completed=false;this.positioning=false;this.phase='idle';this.aimWorld=408;this.demoPointerX=320;this.up=0;this.maxUp=0;this.down=0;this.last=null;this.lastUp=-Infinity;this.lastDown=-Infinity;this.lastMove=0;this.velocity=0;this.castStart=null;this.castDue=null;this.intentSimTime=null;this.intentRejected=false;this.contactSeen=false;this.contactReal=null;this.firstDownReal=null;this.yieldProgress=0;this.recovery=null;this.reversals=0;this.load=0;this.engaged=false;this.maxDown=0;this.slowRemaining=0;this.pending=[];this.anchor=null;this.history=[];this.filteredVelocity=0;this.responseStart=null;this.responseHeld=false;this.castPreparation=0;this.responseAt=null;this.responseReleaseAt=null}
 begin(p,sim){const clock=this.realTime,acc=this.realAccumulator,demo=this.demo,pending=this.pending;this.reset();this.realTime=clock;this.realAccumulator=acc;this.demo=demo;this.pending=pending;this.active=true;this.positioning=true;this.phase='ready';this.last={...p};this.lastMove=clock;this.aimWorld=408+sim.alignmentTarget;sim.setAlignment(this.aimWorld);sim.demo=false}
 observeContact(sim){if(!this.contactSeen&&sim.catchLocked){this.contactSeen=true;this.contactReal=this.realTime;this.phase='loaded';this.down=0;this.maxDown=0;this.velocity=0;this.lastDown=-Infinity;}}
 move(p,sim){if(!this.active)return;this.observeContact(sim);const dx=p.x-this.last.x;this.aimWorld=clamp(this.aimWorld+dx/cameraFor(sim).zoom,338,478);sim.setAlignment(this.aimWorld);const dy=p.y-this.last.y,elapsed=Math.max(1/240,this.realTime-this.lastMove);this.last={...p};this.lastMove=this.realTime;if(sim.collection||sim.outcome)return;
  if(!this.contactSeen){const priorUp=this.up;this.up=clamp(this.up-dy,0,90);if(priorUp<12&&this.up>=12&&this.castStart===null){this.intentSimTime=sim.time;this.intentRejected=false;this.responseStart=sim.time;this.responseReleaseAt=null;this.responseAt=this.realTime;const floor=sim.profile?sim.castTime(sim.profile.timingAssistFloor):sim.time;this.responseHeld=!sim.profile||sim.time>=floor-sim.profile.timingBuffer;}if(this.castStart===null&&priorUp>=12&&this.up<12)this.responseReleaseAt=sim.time;this.maxUp=Math.max(this.maxUp,this.up);if(dy<-.01)this.lastUp=this.realTime;}
  else{this.down=clamp(this.down+dy,0,160);this.maxDown=Math.max(this.maxDown,this.down);if(this.down>=2&&this.firstDownReal===null)this.firstDownReal=this.realTime;this.velocity=dy/elapsed;if(dy>.01)this.lastDown=this.realTime;if(this.maxDown-this.down>24&&this.velocity<-25){this.reversals=1;if(this.recovery)this.recovery=null;}}
 }
 queue(type,p,at=this.realTime){this.pending.push({type,p,at:Math.max(this.realTime,at)});this.pending.sort((a,b)=>a.at-b.at)}
 processInput(sim){while(this.pending.length&&this.pending[0].at<=this.realTime+1e-9){const e=this.pending.shift();if(e.type==='begin'){this.begin(e.p,sim);this.anchor=e;}else if(e.type==='move'){this.move(e.p,sim);this.anchor=e;}else if(e.type==='finish'){this.finish(sim);}else{this.active=false;this.completed=false;this.positioning=false;this.phase='released';this.releaseTime=this.realTime;this.castDue=null;this.responseStart=null;this.responseHeld=false;sim.cancel();this.anchor=null;}}const next=this.pending[0];if(this.active&&this.anchor&&next?.type==='move'&&next.at>this.anchor.at){const u=clamp((this.realTime-this.anchor.at)/(next.at-this.anchor.at),0,1);this.move({x:this.anchor.p.x+(next.p.x-this.anchor.p.x)*u,y:this.anchor.p.y+(next.p.y-this.anchor.p.y)*u},sim);}}
 finish(sim){this.active=false;this.completed=this.castStart!==null||(this.up>=12&&this.realTime-this.lastUp<.5);this.positioning=true;this.phase='released';this.releaseTime=this.realTime;this.anchor=null;}
 cancel(sim){this.releaseTime=this.realTime;this.pending=[];this.anchor=null;this.active=false;this.completed=false;this.positioning=false;this.demo=false;this.phase='released';this.castDue=null;this.responseStart=null;this.responseHeld=false;sim.cancel()}
 timeScale(sim){this.observeContact(sim);this.slowRemaining=0;return 1}
 update(sim,dt){
  if(!sim.running||sim.collection||sim.outcome)return;
  if(this.positioning){
   const h=castHand(sim.time,this.castStart,sim.alignment);
   sim.target=this.castStart===null?responseHand(sim.time,this.responseStart,sim.alignment,this.responseHeld,this.responseReleaseAt):blendCastFromPreparation(h,sim.time-this.castStart,this.castPreparation);
  }
  if(this.responseReleaseAt!==null&&sim.time-this.responseReleaseAt>=.2){this.responseStart=null;this.responseHeld=false;this.responseReleaseAt=null;}
  if(!this.active&&!this.completed)return;
  this.observeContact(sim);
  if(this.castStart===null&&this.responseStart!==null&&!this.responseHeld&&sim.time-this.responseStart>=.36){
   // Too-early motions respond, then expire. Holding must never auto-catch later.
   this.up=0;this.responseStart=null;this.intentSimTime=null;this.intentRejected=false;
  }
  if(this.castStart===null&&this.castDue===null&&this.realTime-this.lastUp>.5&&!this.responseHeld)this.up=0;
  if(!sim.inputOpen){this.phase=this.responseStart===null?'ready':'preparing';return;}
  if(!this.contactSeen){
   if(this.castStart===null&&this.up>=12&&(this.castDue!==null||this.realTime-this.lastUp<.5)){
    const profile=sim.profile;
    if(profile&&this.castDue===null&&!this.intentRejected){const floor=sim.castTime(profile.timingAssistFloor),intent=this.intentSimTime??sim.time;if(intent<floor-profile.timingBuffer)this.intentRejected=true;else this.castDue=Math.max(intent,floor);}
    if(!profile||(!this.intentRejected&&this.castDue!==null&&sim.time>=this.castDue)){
     this.castPreparation=this.responseStart===null?0:preparationLift(sim.time-this.responseStart,this.responseHeld);
     this.castStart=sim.time;sim.circleStart=sim.time;sim.circleCancelled=false;this.upIntentAt=this.realTime;this.phase='casting';
    }else if(this.castDue!==null)this.phase='armed';
   }
   if(this.castStart!==null){const h=castHand(sim.time,this.castStart,sim.alignment);const target=blendCastFromPreparation(h,sim.time-this.castStart,this.castPreparation);sim.aim(target.x,target.y);}
  }else{
   this.engaged=!!(sim.catchLocked||sim.snags.length);this.load=this.engaged?Math.min(1,Math.hypot(sim.fruit.x-sim.fruit.px,sim.fruit.y-sim.fruit.py,sim.fruit.z-sim.fruit.pz)/dt/1200):0;this.phase=sim.catchLocked?'caught':this.engaged?'snagging':'brushed';
  }
 }

 feedback(sim){
  if(sim.outcome==='whole')return{kind:'whole',text:sim.isDemoRound?'示范卸力 · 不计收成':'完整落地 · +20'};
  if(sim.catchLocked)return{kind:'caught',text:sim.basketDelivered?'松布回位':'上甩黏住 · 顺势卸力'};
  if(sim.outcome){if(!this.castStart)return{kind:'no-cast',text:this.maxUp>=12?'甩得太早了 · 等提示亮起再向上甩':'还没甩开布 · 向上滑一小段'};if(sim.contactTime!==null)return{kind:'brushed',text:'擦过布面但没黏住 · 再试一颗'};return{kind:'missed',text:this.castStart>1.68?'甩晚了，果子已冲过 · 稍早一点甩':'布没迎上落果 · 看准弧线再甩'};}
  if(this.releaseTime!==null)return{kind:'released',text:this.completed?'已松手 · 前兜继续，黏住后自动卸力':this.positioning?'位置已选定 · 近身时向上轻兜':'操作已中断 · 可重新对位前兜'};
  return{kind:sim.inputOpen?'cast':'prepare',text:sim.inputOpen?'左右判断落点 · 到跟前向上轻兜':'左右拖动对准落点 · 近身时向上轻兜'};
 }

 advance(sim,realDt,baseScale=1){this.realAccumulator+=Math.min(realDt,.1);while(this.realAccumulator+1e-10>=STEP){const d=STEP;this.realAccumulator=Math.max(0,this.realAccumulator-STEP);this.realTime+=d;this.processInput(sim);
   if(this.demo&&sim.running&&!sim.collection){if(!this.active&&sim.time>=.7){this.demoPointerX=worldToScreen({x:sim.landingX,y:0},cameraFor(sim)).x;const x=this.demoPointerX;this.begin({x,y:400},sim);this.demoPointerX=x+(sim.landingX-this.aimWorld)*cameraFor(sim).zoom;}if(this.active){this.observeContact(sim);const y=this.contactSeen?330:400-70*clamp((sim.time-sim.castTime(1.82))/.12,0,1);this.move({x:this.demoPointerX,y},sim);}}

   const reactionScale=this.timeScale(sim),approachScale=baseScale;sim.advance(d*approachScale*reactionScale);if(this.autoCollect&&sim.collectReady&&!sim.collection&&!sim.outcome){const proof={at:sim.time,heldTime:sim.heldTime,supported:sim.supported,yielded:sim.yielded,fruit:{...sim.fruit}};if(sim.requestCollect()){sim.collection.proof=proof;sim.collection.automatic=true;}}
  }}
}
