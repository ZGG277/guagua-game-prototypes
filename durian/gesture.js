import {STEP} from './physics.js?v=r6';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function path(points,t){for(let i=1;i<points.length;i++)if(t<=points[i][0]){const a=points[i-1],b=points[i];let u=clamp((t-a[0])/(b[0]-a[0]),0,1);u=u*u*(3-2*u);return{x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u}}const p=points.at(-1);return{x:p[1],y:p[2]}}
export class HalfArcController{
 constructor(tuning={}){this.tuning=tuning;this.reset()}
 reset(){this.realTime=0;this.realAccumulator=0;this.autoCollect=true;this.releaseTime=null;this.upIntentAt=null;this.demo=false;this.active=false;this.phase='idle';this.up=0;this.maxUp=0;this.down=0;this.last=null;this.lastUp=-Infinity;this.lastDown=-Infinity;this.lastMove=0;this.velocity=0;this.castStart=null;this.contactSeen=false;this.contactReal=null;this.firstDownReal=null;this.yieldProgress=0;this.recovery=null;this.reversals=0;this.load=0;this.engaged=false;this.maxDown=0;this.slowRemaining=0;this.pending=[];this.anchor=null;this.history=[];this.filteredVelocity=0}
 begin(p,sim){const clock=this.realTime,acc=this.realAccumulator,demo=this.demo,pending=this.pending;this.reset();this.realTime=clock;this.realAccumulator=acc;this.demo=demo;this.pending=pending;this.active=true;this.phase='ready';this.last={...p};this.lastMove=clock;sim.demo=false}
 observeContact(sim){if(!this.contactSeen&&sim.catchLocked){this.contactSeen=true;this.contactReal=this.realTime;this.phase='loaded';this.down=0;this.maxDown=0;this.velocity=0;this.lastDown=-Infinity;}}
 move(p,sim){if(!this.active)return;this.observeContact(sim);const dy=p.y-this.last.y,elapsed=Math.max(1/240,this.realTime-this.lastMove);this.last={...p};this.lastMove=this.realTime;if(sim.collection||sim.outcome)return;
  if(!this.contactSeen){this.up=clamp(this.up-dy,0,90);this.maxUp=Math.max(this.maxUp,this.up);if(dy<-.01)this.lastUp=this.realTime;}
  else{this.down=clamp(this.down+dy,0,160);this.maxDown=Math.max(this.maxDown,this.down);if(this.down>=2&&this.firstDownReal===null)this.firstDownReal=this.realTime;this.velocity=dy/elapsed;if(dy>.01)this.lastDown=this.realTime;if(this.maxDown-this.down>24&&this.velocity<-25){this.reversals=1;if(this.recovery)this.recovery=null;}}
 }
 queue(type,p,at=this.realTime){this.pending.push({type,p,at:Math.max(this.realTime,at)});this.pending.sort((a,b)=>a.at-b.at)}
 processInput(sim){while(this.pending.length&&this.pending[0].at<=this.realTime+1e-9){const e=this.pending.shift();if(e.type==='begin'){this.begin(e.p,sim);this.anchor=e;}else if(e.type==='move'){this.move(e.p,sim);this.anchor=e;}else{this.active=false;this.phase='released';this.releaseTime=this.realTime;sim.cancel();this.anchor=null;}}const next=this.pending[0];if(this.active&&this.anchor&&next?.type==='move'&&next.at>this.anchor.at){const u=clamp((this.realTime-this.anchor.at)/(next.at-this.anchor.at),0,1);this.move({x:this.anchor.p.x+(next.p.x-this.anchor.p.x)*u,y:this.anchor.p.y+(next.p.y-this.anchor.p.y)*u},sim);}}
 cancel(sim){this.releaseTime=this.realTime;this.pending=[];this.anchor=null;this.active=false;this.demo=false;this.phase='released';sim.cancel()}
 timeScale(sim){this.observeContact(sim);this.slowRemaining=0;return 1}
 update(sim,dt){if(!this.active||!sim.running||sim.collection||sim.outcome)return;this.observeContact(sim);if(this.castStart===null&&this.realTime-this.lastUp>.5)this.up=0;if(!sim.inputOpen){this.phase='ready';return;}
  if(!this.contactSeen){if(this.castStart===null){const ready=sim.demoTarget(Math.min(sim.time,1.618));sim.aim(ready.x,ready.y);}if(this.castStart===null&&this.up>=12&&this.realTime-this.lastUp<.5){this.castStart=sim.time;this.upIntentAt=this.realTime;this.phase='casting';}
   if(this.castStart!==null){const h=sim.demoTarget(Math.min(sim.time,1.912));sim.aim(h.x,h.y);}
  }else{
   this.engaged=!!(sim.catchLocked||sim.snags.length);this.load=this.engaged?Math.min(1,Math.hypot(sim.fruit.x-sim.fruit.px,sim.fruit.y-sim.fruit.py,sim.fruit.z-sim.fruit.pz)/dt/1200):0;this.phase=sim.catchLocked?'caught':this.engaged?'snagging':'brushed';
  }
 }
 feedback(sim){
  if(sim.outcome==='whole')return{kind:'whole',text:sim.isDemoRound?'示范完整入筐 · 不计收成':'完整入筐 · 待售整果 +1'};
  if(sim.catchLocked)return{kind:'caught',text:(sim.collection?.time||0)<.55?'挂住了 · 麻布顺势裹住':'已接牢 · 轻轻放进筐里'};
  if(sim.outcome){if(!this.castStart)return{kind:'no-cast',text:this.maxUp>=12?'甩得太早了 · 等提示亮起再向上甩':'还没甩开布 · 向上滑一小段'};if(sim.contactTime!==null)return{kind:'brushed',text:'擦过布面但没挂住 · 再试一颗'};return{kind:'missed',text:this.castStart>1.68?'甩晚了，果子已冲过 · 稍早一点甩':'布没迎上落果 · 看准弧线再甩'};}
  if(this.releaseTime!==null)return{kind:'released',text:'已松手 · 只要麻布挂住，仍会自动收果'};
  return{kind:sim.inputOpen?'cast':'prepare',text:sim.inputOpen?'现在向上甩 ↑ 挂住就自动入筐':'准备 · 等提示亮起再向上甩'};
 }

 advance(sim,realDt,baseScale=1){this.realAccumulator+=Math.min(realDt,.1);while(this.realAccumulator+1e-10>=STEP){const d=STEP;this.realAccumulator=Math.max(0,this.realAccumulator-STEP);this.realTime+=d;this.processInput(sim);
   if(this.demo&&sim.running&&!sim.collection){if(!this.active&&sim.time>=1.4)this.begin({x:320,y:400},sim);if(this.active){this.observeContact(sim);const y=this.contactSeen?330:400-70*clamp((sim.time-1.4)/.25,0,1);this.move({x:320,y},sim);}}
   const reactionScale=this.timeScale(sim),approachScale=baseScale;sim.advance(d*approachScale*reactionScale);if(this.autoCollect&&sim.collectReady&&!sim.collection&&!sim.outcome){const proof={at:sim.time,heldTime:sim.heldTime,supported:sim.supported,yielded:sim.yielded,fruit:{...sim.fruit}};if(sim.requestCollect()){sim.collection.proof=proof;sim.collection.automatic=true;}}
  }}
}
