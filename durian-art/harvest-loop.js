/** Fixed start-to-start cadence in active simulation time. No queued catch-up. */
export class HarvestLoop {
 constructor({interval=6}={}){this.interval=interval;this.enabled=false;this.remaining=interval;this.round=null;this.paused=false;}
 begin(sim){this.enabled=true;this.paused=false;this.remaining=this.interval;this.round=sim?.round??null;}
 fruitStarted(sim){this.round=sim?.round??null;this.remaining=this.interval;}
 stop(){this.enabled=false;this.remaining=this.interval;this.round=null;}
 advance(sim,dt,next){
  if(!this.enabled||this.paused)return;
  if(this.round!==sim.round)this.fruitStarted(sim);
  // Match the physics frame cap, and reject invalid wall-clock deltas.
  const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  this.remaining=Math.max(0,this.remaining-elapsed);
  if(this.remaining>1e-9||!sim.outcome)return;
  // Reset before callback: at most one fruit per advance, even if callback fails.
  this.remaining=this.interval;
  next(!!sim.isDemoRound);
  this.round=sim.round;
 }
}
