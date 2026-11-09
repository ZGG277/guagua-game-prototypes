import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {createRankView} from '../build-source/wall-rank.mjs';
import {createRoundBoundary} from '../build-source/wall-round.mjs';
import {createRunTracker} from '../build-source/wall-score.mjs';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,0));
function ui(ranks){
 const {window}=parseHTML(html),document=window.document,timers=[];
 const get=id=>document.getElementById(id);
 for(const [id,value]of [['rank-board','1'],['rank-period','all']])Object.defineProperty(get(id),'value',{value,writable:true});
 const score={runSequence:1,highestLeaf:10,started:true,completed:false,summitSeconds:null};
 const view=createRankView({scope:window,getScore:()=>score,onOpen(){},onClose(){},ranks,journal:{gap:0,write:()=>true,setTimer:fn=>{timers.push(fn);return timers.length;},clearTimer(){}}});
 return{view,get,score,window,async flush(){while(timers.length){timers.shift()();await tick();}await tick();}};
}
const ok={status:'ok',data:[],mine:{status:'NO_SCORE',rank:null,score:null}};
const exact={status:'ok',data:[{rank:1,nickname:'藤叶',score:80},{rank:7,nickname:'自己',score:10}],mine:{status:'EXACT',rank:7,score:10}};
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',reason:e.stack});}}
await test('Removed all diagnostic, rule, registration and refresh controls',()=>{
 const {get}=ui({list:async()=>ok});
 for(const id of ['rank-submit','rank-submit-note','rank-write-status','rank-refresh','round-heading','rank-availability','score-button'])assert.equal(get(id),null,id);
 const panel=get('rank-panel');assert.equal(panel.querySelector('.rank-rule'),null);assert.equal(get('rank-current').textContent,'本局最高');assert.equal(get('rank-title').textContent,'排行榜');
 assert.equal(panel.querySelectorAll('button').length,2);
});
await test('Opening prominent leaderboard reads without submitting',async()=>{
 let writes=0;const {view,get,flush}=ui({list:async()=>exact,submit:async()=>{writes++;return{status:'ok'};}});get('rank-button').click();await tick();await flush();assert.equal(writes,0);assert.equal(get('rank-panel').hidden,false);assert.match(get('my-rank').textContent,/第 7 名/);assert.equal(get('rank-message').textContent,'');view.close();assert.equal(get('rank-panel').hidden,true);
});
await test('Old read cannot overwrite reopened panel',async()=>{
 const pending=[];const {view,get}=ui({list:()=>new Promise(r=>pending.push(r))});view.open();view.close();view.open();pending[1](exact);await tick();pending[0]({status:'unauthorized'});await tick();assert.match(get('my-rank').textContent,/第 7 名/);
});
await test('Failed reads keep visible entry and one concise empty state',async()=>{
 const {view,get}=ui({list:async()=>({status:'unauthorized'})});view.open();await tick();assert.equal(get('rank-button').hidden,false);assert.equal(get('cover-rank').textContent,'查看排行榜');assert.equal(get('rank-message').textContent,'排行榜暂不可用');assert.equal(get('my-rank').textContent,'我的名次 · —');assert.equal(get('rank-rows').children.length,0);
});
await test('Reopen quietly recovers without check button or write',async()=>{
 let reads=0,retries=0;const real=Date.now;let now=10000;Date.now=()=>now;
 try{const {view,get}=ui({list:async()=>++reads===1?{status:'not_open'}:exact,retry:async()=>{retries++;}});view.open();await tick();view.close();now+=2000;view.open();await tick();assert.equal(retries,1);assert.equal(reads,2);assert.match(get('my-rank').textContent,/第 7 名/);}finally{Date.now=real;}
});
await test('Closed recovery cannot overwrite newly opened panel',async()=>{
 let reads=0,done;const real=Date.now;let now=10000;Date.now=()=>now;
 try{const {view,get}=ui({list:async()=>++reads===1?{status:'not_open'}:exact,retry:()=>new Promise(r=>done=r)});view.open();await tick();view.close();now+=2000;view.open();view.close();now=10500;view.open();done(true);await tick();assert.equal(reads,1);assert.equal(get('rank-message').textContent,'排行榜暂不可用');}finally{Date.now=real;}
});
await test('Settlement shows frozen round maximum and correct return action',async()=>{
 const {view,get,score,flush}=ui({list:async()=>exact,submit:async()=>({status:'ok'})});view.showResult(score);score.highestLeaf=1;await flush();assert.equal(get('round-best').textContent,'10');assert.equal(get('rank-close').textContent,'再攀一次 ↗');assert.match(get('my-rank').textContent,/第 7 名/);
});
await test('Uncertain auto-write never repeats or exposes diagnostic text',async()=>{
 let submits=0;const {view,get,score,flush}=ui({list:async()=>ok,submit:async()=>{submits++;return{status:'unknown'};}});view.showResult(score);view.finishRound(score);await flush();view.close();view.open();view.finishRound({...score,highestLeaf:20});await flush();assert.equal(submits,1);assert.equal(view.auto.status(score,1),'unknown');assert.doesNotMatch(get('rank-panel').textContent,/同步|检查|登记|授权|规则/);
});
await test('Auto-write completion from older round cannot replace new score',async()=>{
 let done;const {view,get,score,flush}=ui({list:async()=>ok,submit:()=>new Promise(r=>done=r)});view.showResult(score);await flush();view.close();score.runSequence=2;score.highestLeaf=3;view.open();await tick();done({status:'ok'});await tick();assert.equal(get('round-best').textContent,'3');
});
await test('Unauthorized auto-write invalidates stale successful read',async()=>{
 let resolveRead;const {view,get,score,flush}=ui({list:()=>new Promise(r=>resolveRead=r),submit:async()=>({status:'unauthorized'})});view.showResult(score);await flush();resolveRead(exact);await tick();assert.equal(get('rank-message').textContent,'排行榜暂不可用');assert.equal(get('rank-button').hidden,false);
});
await test('Rows are paged and untrusted nickname is plain text',async()=>{
 const data=Array.from({length:45},(_,i)=>({rank:i+1,nickname:i?'玩家':'<img src=x onerror=alert(1)>',score:60-i}));const {view,get}=ui({list:async()=>({...exact,data})});view.open();await tick();assert.equal(get('rank-rows').children.length,20);assert.equal(get('rank-rows').querySelector('img'),null);get('rank-more').click();assert.equal(get('rank-rows').children.length,40);get('rank-more').click();assert.equal(get('rank-rows').children.length,45);assert.equal(get('rank-more').hidden,true);
});
await test('Speed and period selections load the chosen real board',async()=>{
 const calls=[];const {view,get,window}=ui({list:async(b,p)=>{calls.push([b,p]);return{status:'ok',data:[{rank:1,nickname:'风',score:-23.55}],mine:{status:'EXACT',rank:1,score:-23.55}};}});view.open();await tick();get('rank-board').value='2';get('rank-period').value='week';get('rank-period').dispatchEvent(new window.Event('change'));await tick();assert.deepEqual(calls[1],[2,'week']);assert.match(get('my-rank').textContent,/23.55 秒/);assert.match(get('rank-rows').textContent,/23.55 秒/);
});
await test('Lower leaf landing does not finish or clear maximum',()=>{
 const scores=createRunTracker(),rounds=createRoundBoundary(scores),feet=[{x:0,y:0,z:0},{x:0,y:0,z:0}];const wall={time:1,flightTime:1,feedback:{type:'jump'},body:{grounded:false,feet},falls:0};rounds.observe(wall);wall.body.grounded=true;Object.assign(wall,{time:2,standId:19,landTime:1.5});rounds.observe(wall);Object.assign(wall,{time:3,standId:9,landTime:2.5});const r=rounds.observe(wall);assert.equal(r.finished,null);assert.equal(r.current.highestLeaf,20);
});
await test('Root fall snapshots old maximum and resets exactly once',()=>{
 const scores=createRunTracker(),rounds=createRoundBoundary(scores),feet=[{x:0,y:0,z:0},{x:0,y:0,z:0}];const wall={time:1,flightTime:1,feedback:{type:'jump'},body:{grounded:false,feet},falls:0};rounds.observe(wall);Object.assign(wall,{time:2,standId:19,landTime:1.5});wall.body.grounded=true;rounds.observe(wall);wall.falls=1;wall.standId=0;wall.time=3;wall.landTime=-10;wall.feedback={type:'base'};const r=rounds.observe(wall);assert.equal(r.finished.highestLeaf,20);assert.equal(r.current.highestLeaf,1);assert.equal(r.current.started,false);assert.notEqual(r.current.runSequence,r.finished.runSequence);assert.equal(rounds.observe(wall).finished,null);
});
console.log(JSON.stringify(results,null,2));process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
