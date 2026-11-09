export const BEST_KEY='durian-assassin-v101-best';
export const MAX_HEALTH=6, MAX_FRUIT=20;
export function compareResults(a,b){return(a.coins-b.coins)||(a.whole-b.whole);}
const validResult=r=>r&&Number.isFinite(r.coins)&&Number.isInteger(r.whole)&&r.whole>=0;
const snapshot=s=>Object.freeze({coins:s.coins,whole:s.totals.whole,smashed:s.totals.smashed,settled:s.settled,hits:s.injuryRounds.size});
export class SurvivalSession{
 constructor({storage,adapter=null}={}){if(storage===undefined)storage={getItem:()=>JSON.stringify(window.DurianPlatform.readBest()),setItem:(key,value)=>window.DurianPlatform.saveBest(JSON.parse(value))};this.storage=storage;this.adapter=adapter;this.best=null;try{const saved=JSON.parse(storage?.getItem(BEST_KEY)||'null');if(validResult(saved))this.best=Object.freeze({...saved});}catch{}this.start();}
 start({demo=false}={}){this.active=true;this.demo=!!demo;this.health=MAX_HEALTH;this.coins=0;this.totals={whole:0,pulp:0,smashed:0};this.issued=0;this.settled=0;this.dying=false;this.gameOver=false;this.ended=false;this.reason=null;this.injuryRounds=new Set();this.resultRounds=new Set();return this;}
 get canStartFruit(){return!this.gameOver&&!this.dying&&this.issued<MAX_FRUIT;}
 fruitStarted(){if(!this.canStartFruit)return false;this.issued++;return true;}
 get entries(){return this.best?[this.best]:[];}
 get hearts(){return this.health/2;}
 observe(sim){const change={injured:false,settled:false,gameOver:this.gameOver};if(this.demo||sim.isDemoRound||this.ended)return change;const round=sim.round;
 if((sim.injury||sim.injured)&&!this.injuryRounds.has(round)){this.injuryRounds.add(round);this.health=Math.max(0,this.health-1);this.dying=this.health===0;change.injured=true;}
 if(['whole','pulp','smashed'].includes(sim.outcome)&&!this.resultRounds.has(round)){this.resultRounds.add(round);this.settled++;const whole=sim.outcome==='whole';this.totals[whole?'whole':'smashed']++;this.coins+=whole?20:-10;change.settled=true;}
 if((this.dying&&!!sim.outcome)||this.settled>=MAX_FRUIT){this.reason=this.dying?'health':'harvest';this.gameOver=true;change.gameOver=true;this.end();}return change;}
 saveBest(){if(this.demo||!this.gameOver)return false;const r=snapshot(this);if(this.best&&compareResults(r,this.best)<=0)return false;this.best=r;try{this.storage?.setItem(BEST_KEY,JSON.stringify(r));}catch{}return true;}
 end(){if(this.ended)return false;this.ended=true;this.active=false;this.saveBest();try{this.adapter?.onResult?.(snapshot(this));}catch{}return true;}
}
