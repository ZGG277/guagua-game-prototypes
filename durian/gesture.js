import {STEP} from './physics.js?v=r3';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function path(points,t){for(let i=1;i<points.length;i++)if(t<=points[i][0]){const a=points[i-1],b=points[i];let u=clamp((t-a[0])/(b[0]-a[0]),0,1);u=u*u*(3-2*u);return{x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u}}const p=points.at(-1);return{x:p[1],y:p[2]}}
export class HalfArcController{
 constructor(tuning={}){this.tuning=tuning;this.reset()}
 reset(){this.realTime=0;this.demo=false;this.active=false;this.phase='idle';this.up=0;this.down=0;this.last=null;this.lastUp=-Infinity;this.lastDown=-Infinity;this.lastMove=0;this.velocity=0;this.castStart=null;this.contactSeen=false;this.contactReal=null;this.yieldProgress=0;this.recovery=null;this.reversals=0;this.load=0;this.engaged=false;this.maxDown=0;this.slowRemaining=0;this.pending=[];this.anchor=null;this.history=[];this.filteredVelocity=0}
 begin(p,sim){const clock=this.realTime,demo=this.demo,pending=this.pending;this.reset();this.realTime=clock;this.demo=demo;this.pending=pending;this.active=true;this.phase='ready';this.last={...p};this.lastMove=clock;sim.demo=false}
 observeContact(sim){if(!this.contactSeen&&sim.contactTime!==null){this.contactSeen=true;this.contactReal=this.realTime;this.phase='loaded';this.down=0;this.maxDown=0;this.velocity=0;this.lastDown=-Infinity;}}
 move(p,sim){if(!this.active)return;this.observeContact(sim);const dy=p.y-this.last.y,elapsed=Math.max(1/240,this.realTime-this.lastMove);this.last={...p};this.lastMove=this.realTime;if(sim.collection||sim.outcome)return;
  if(!this.contactSeen){this.up=clamp(this.up-dy,0,90);if(dy<-.01)this.lastUp=this.realTime;}
  else{this.down=clamp(this.down+dy,0,160);this.maxDown=Math.max(this.maxDown,this.down);this.velocity=dy/elapsed;if(dy>.01)this.lastDown=this.realTime;if(this.maxDown-this.down>24&&this.velocity<-25){this.reversals=1;if(this.recovery)this.recovery=null;}}
 }
 queue(type,p,at=this.realTime){this.pending.push({type,p,at:Math.max(this.realTime,at)});this.pending.sort((a,b)=>a.at-b.at)}
 processInput(sim){while(this.pending.length&&this.pending[0].at<=this.realTime+1e-9){const e=this.pending.shift();if(e.type==='begin'){this.begin(e.p,sim);this.anchor=e;}else if(e.type==='move'){this.move(e.p,sim);this.anchor=e;}else{this.active=false;this.phase='released';sim.cancel();this.anchor=null;}}const next=this.pending[0];if(this.active&&this.anchor&&next?.type==='move'&&next.at>this.anchor.at){const u=clamp((this.realTime-this.anchor.at)/(next.at-this.anchor.at),0,1);this.move({x:this.anchor.p.x+(next.p.x-this.anchor.p.x)*u,y:this.anchor.p.y+(next.p.y-this.anchor.p.y)*u},sim);}}
 cancel(sim){this.pending=[];this.anchor=null;this.active=false;this.demo=false;this.phase='released';sim.cancel()}
 timeScale(sim){this.observeContact(sim);const elapsed=this.contactReal===null?Infinity:this.realTime-this.contactReal;this.slowRemaining=this.contactSeen&&this.down<2?Math.max(0,.4-elapsed):0;return this.slowRemaining>0?.2:1}
 update(sim,dt){if(!this.active||!sim.running||sim.collection||sim.outcome)return;this.observeContact(sim);if(this.castStart===null&&this.realTime-this.lastUp>.35)this.up=0;if(!sim.inputOpen){this.phase='ready';return;}
  if(!this.contactSeen){if(this.castStart===null){const ready=sim.demoTarget(Math.min(sim.time,1.618));sim.aim(ready.x,ready.y);}if(this.castStart===null&&this.up>=18&&this.realTime-this.lastUp<.35){this.castStart=sim.time;this.phase='casting';}
   if(this.castStart!==null){const h=sim.demoTarget(Math.min(sim.time,1.912));sim.aim(h.x,h.y);}
  }else{
   this.history.push({t:this.realTime,down:this.down});while(this.history.length>1&&this.history[1].t<this.realTime-.16)this.history.shift();const old=this.history[0];this.filteredVelocity=(this.down-old.down)/Math.max(1/240,this.realTime-old.t);
   const activeDown=this.realTime-this.lastDown<.17&&this.filteredVelocity>12;
   if(!this.recovery){if(activeDown){const drive=clamp(1+(this.filteredVelocity-100)/6000,.99,1.01);this.yieldProgress=Math.min(1,this.yieldProgress+dt*drive/.6);}else if(this.reversals>0&&this.velocity<-25){this.yieldProgress=Math.max(0,this.yieldProgress-dt*2);}
    const h=path([[0,428,305],[.5,320,this.tuning.midY??385],[1,280,this.tuning.endY??440]],this.yieldProgress);sim.aim(h.x,h.y);
    if(this.yieldProgress>=1&&this.down>=20&&sim.yielded&&this.reversals===0)this.recovery={time:0};
   }else{this.recovery.time+=dt;const h=path([[0,280,this.tuning.endY??440],[1,300,400]],this.recovery.time/(this.tuning.recover??1));sim.aim(h.x,h.y);}
   const speed=Math.hypot(sim.fruit.x-sim.fruit.px,sim.fruit.y-sim.fruit.py,sim.fruit.z-sim.fruit.pz)/dt,extension=Math.hypot(sim.fruit.x-sim.hand.x,sim.fruit.y-sim.hand.y,sim.fruit.z);this.engaged=!!(sim.snags.length||sim.supported);this.load=this.engaged?clamp((extension-35)/100+speed/1400,0,1):0;this.phase=sim.collectReady?'settled':this.recovery?'recovering':activeDown?'yielding':'loaded';
  }
 }
 advance(sim,realDt,baseScale=1){let remain=Math.min(realDt,.1);while(remain>1e-9){const d=Math.min(STEP,remain);this.realTime+=d;this.processInput(sim);
   if(this.demo&&sim.running&&!sim.collection){if(!this.active&&sim.time>=1.4)this.begin({x:320,y:400},sim);if(this.active){this.observeContact(sim);const y=this.contactSeen?330+70*clamp((this.realTime-this.contactReal-.14)/.8,0,1):400-70*clamp((sim.time-1.4)/.25,0,1);this.move({x:320,y},sim);}}
   sim.advance(d*(this.contactSeen?1:baseScale)*this.timeScale(sim));if(this.demo&&sim.collectReady)sim.requestCollect();remain-=d;
  }}
}
