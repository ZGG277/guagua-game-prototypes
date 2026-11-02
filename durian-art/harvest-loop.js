/** Real-time respite, never accumulated while paused. No background catch-up. */
export class HarvestLoop {
 constructor(){this.enabled=false;this.remaining=3;this.round=null;this.paused=false;}
 begin(){this.enabled=true;this.remaining=3;this.round=null;}
 stop(){this.enabled=false;this.remaining=3;this.round=null;}
 advance(sim,dt,next){if(!this.enabled||this.paused||!sim.outcome)return;if(this.round!==sim.round){this.round=sim.round;this.remaining=3;return;}this.remaining-=Math.max(0,Math.min(.1,dt));if(this.remaining<=0){this.remaining=3;this.round=null;next(!!sim.isDemoRound);}}
}
