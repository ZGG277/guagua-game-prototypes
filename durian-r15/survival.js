/** Run rules, independent of rendering and physics. No network dependency. */
export const BEST_KEY='durian-r15-best';
export const MAX_HEALTH=6;
export function compareResults(a,b){return (a.coins-b.coins)||(a.whole-b.whole);}
const validResult=r=>r&&Number.isFinite(r.coins)&&r.coins>=0&&Number.isInteger(r.whole)&&r.whole>=0;
const snapshot=s=>Object.freeze({coins:s.coins,whole:s.totals.whole,pulp:s.totals.pulp,smashed:s.totals.smashed});
export class SurvivalSession {
 constructor({storage,adapter=null}={}){
  // Access to localStorage itself can throw in private/sandboxed contexts.
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  this.storage=storage;this.adapter=adapter;this.best=null;
  try{const saved=JSON.parse(storage?.getItem(BEST_KEY)||'null');if(validResult(saved))this.best=Object.freeze({...saved});}catch{}
  this.start();
 }
 start({demo=false}={}){this.active=true;this.demo=!!demo;this.health=MAX_HEALTH;this.coins=0;this.totals={whole:0,pulp:0,smashed:0};this.gameOver=false;this.ended=false;this.injuryRounds=new Set();this.resultRounds=new Set();return this;}
 get entries(){return this.best?[this.best]:[];}
 get hearts(){return this.health/2;}
 observe(sim){
  const change={injured:false,settled:false,gameOver:this.gameOver};
  if(this.demo||sim.isDemoRound||this.ended||this.gameOver)return change;
  const round=sim.round;
  if((sim.injury||sim.injured)&&!this.injuryRounds.has(round)){
   this.injuryRounds.add(round);this.health=Math.max(0,this.health-1);change.injured=true;
   if(this.health===0){this.gameOver=true;change.gameOver=true;this.end();return change;}
  }
  if(['whole','pulp','smashed'].includes(sim.outcome)&&!this.resultRounds.has(round)){
   this.resultRounds.add(round);this.totals[sim.outcome]++;this.coins+=sim.outcome==='whole'?20:sim.outcome==='pulp'?10:0;change.settled=true;this.saveBest();
  }
  return change;
 }
 saveBest(){
  if(this.demo)return false;
  const result=snapshot(this);
  if(this.best&&compareResults(result,this.best)<=0)return false;
  this.best=result;try{this.storage?.setItem(BEST_KEY,JSON.stringify(result));}catch{}
  return true;
 }
 end(){if(this.ended)return false;this.ended=true;this.active=false;if(this.demo)return false;this.saveBest();
  // Optional host-local integration. No fetch, socket, remote SDK, or submission.
  try{this.adapter?.onResult?.(snapshot(this));}catch{}
  return true;
 }
}
