const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const esbuild=require('./test-deps.cjs').load('esbuild'),root=path.resolve(__dirname,'..');
const text=esbuild.buildSync({stdin:{contents:"export {Study} from './source/physics.js'; export {HalfArcController} from './source/gesture.js'; export {SurvivalSession} from './source/survival.js';",resolveDir:root},bundle:true,format:'iife',globalName:'M',write:false,target:'es2017'}).outputFiles[0].text;
const context={};vm.createContext(context);vm.runInContext(text,context);
const {Study,HalfArcController,SurvivalSession}=context.M;
const sim=new Study({seed:173,adaptive:true}),session=new SurvivalSession({storage:null}),controller=new HalfArcController(),rounds=[];
for(let n=1;n<=20;n++){
 assert(session.fruitStarted());sim.start(false);controller.reset();controller.demo=true;sim.controller=controller;
 for(let i=0;i<240*12&&!sim.outcome;i++){controller.advance(sim,1/240);session.observe(sim);}
 rounds.push({round:sim.round,fruit:sim.selectedFruitId,outcome:sim.outcome,health:session.health,settled:session.settled,proof:!!sim.catchProof});
 assert(sim.outcome,'Unsettled fruit '+n);
}
const result={seed:173,rounds,uniqueFruit:new Set(rounds.map(r=>r.fruit)).size,issued:session.issued,settled:session.settled,coins:session.coins,totals:session.totals,gameOver:session.gameOver,reason:session.reason,starts21st:session.fruitStarted(),scope:'Real physics with automatic gesture inputs and normal scoring. No forced outcome or finish. Excludes DOM, interval scheduling, real touch and phone runtime.'};
assert.equal(result.uniqueFruit,20);assert.equal(result.issued,20);assert.equal(result.settled,20);assert.equal(result.totals.whole,15);assert.equal(result.totals.smashed,5);assert.equal(result.coins,250);assert(result.gameOver);assert.equal(result.reason,'harvest');assert(!result.starts21st);assert(rounds.filter(r=>r.outcome==='whole').every(r=>r.proof));
fs.writeFileSync(path.join(root,'reports/full-harvest-tests.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
