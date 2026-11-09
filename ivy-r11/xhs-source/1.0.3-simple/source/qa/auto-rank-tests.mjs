import assert from 'node:assert/strict';
import {createAutoRankSync} from '../build-source/wall-auto-rank.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
const round=(runSequence,highestLeaf=10,extra={})=>({runSequence,highestLeaf,started:true,completed:false,summitSeconds:null,...extra});
function fixture(submit=async()=>({status:'ok'}),start=Date.parse('2026-11-09T04:00:00Z'),initial='[]'){
 let time=start,id=0,saved=initial;const timers=new Map(),calls=[];
 const auto=createAutoRankSync({submit:async(s,o)=>{calls.push({score:s,board:o.board,time});return submit(s,o);}},{now:()=>time,read:()=>saved,write:v=>{saved=v;},setTimer:(fn,ms)=>{timers.set(++id,{fn,at:time+ms});return id;},clearTimer:i=>timers.delete(i)});
 return{auto,calls,get saved(){return JSON.parse(saved);},async advance(ms=0){time+=ms;for(let n=0;n<20;n++){const due=[...timers].filter(([,t])=>t.at<=time);if(!due.length)break;for(const [i,t]of due){timers.delete(i);t.fn();await tick();}}await tick();}};
}
const results=[];async function test(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',reason:e.message});}}
await test('Dispatches once per round and board, locks unknown across score changes',async()=>{
 const f=fixture(async()=>({status:'unknown'}));const r=round(1);f.auto.submitRound(r);f.auto.submitRound(r);await f.advance();f.auto.submitRound(round(1,99));await f.advance(60000);assert.equal(f.calls.length,1);assert.equal(f.auto.status(r),'unknown');
});
await test('Coalesces only unsent rounds to maximum and respects 30 second gap',async()=>{
 const f=fixture();f.auto.submitRound(round(1,5));await f.advance();f.auto.submitRound(round(2,10));f.auto.submitRound(round(3,8));f.auto.submitRound(round(4,20));await f.advance(29999);assert.equal(f.calls.length,1);await f.advance(1);assert.deepEqual(f.calls.map(c=>c.score.highestLeaf),[5,20]);assert.equal(f.auto.status(round(2)),'covered');assert.equal(f.auto.status(round(3)),'covered');
});
await test('Summit submits leaves and negative elapsed speed exactly once each',async()=>{
 const f=fixture(),r=round(1,100,{completed:true,summitSeconds:9.25});f.auto.submitRound(r);await f.advance();assert.equal(f.calls.length,1);f.auto.submitRound(r);await f.advance(30000);assert.deepEqual(f.calls.map(c=>c.board),[1,2]);assert.equal(f.saved.find(j=>j.board===2).score,-9.25);
});
await test('Queued previous Beijing day score expires, never enters new day',async()=>{
 const f=fixture(undefined,Date.parse('2026-11-09T15:59:50Z'));f.auto.submitRound(round(1));await f.advance();f.auto.submitRound(round(2,90));await f.advance(30000);assert.equal(f.calls.length,1);assert.equal(f.auto.status(round(2)),'expired');f.auto.submitRound(round(3,3));await f.advance();assert.equal(f.calls.length,2);assert.equal(f.calls[1].score.highestLeaf,3);
});
await test('New day lower score replaces queued old-day maximum',async()=>{
 const f=fixture(undefined,Date.parse('2026-11-09T15:59:50Z'));f.auto.submitRound(round(1));await f.advance();f.auto.submitRound(round(2,90));await f.advance(11000);f.auto.submitRound(round(3,3));await f.advance(19000);assert.deepEqual(f.calls.map(c=>c.score.highestLeaf),[10,3]);assert.equal(f.auto.status(round(2)),'expired');
});
await test('In-flight submission blocks overlapping writes and snapshots score',async()=>{
 let done;const f=fixture(()=>new Promise(r=>done=r)),r=round(1,10);f.auto.submitRound(r);await f.advance();r.highestLeaf=99;f.auto.submitRound(round(2,20));await f.advance(60000);assert.equal(f.calls.length,1);assert.equal(f.calls[0].score.highestLeaf,10);done({status:'ok'});await tick();assert.equal(f.calls.length,2);done({status:'ok'});await tick();
});
await test('Restored sending journal becomes unknown without replay',async()=>{
 const f=fixture(undefined,Date.now(),JSON.stringify([{key:'old:1:1',board:1,score:10,day:'2026-11-09',status:'sending'}]));await f.advance(60000);assert.equal(f.calls.length,0);assert.equal(f.saved[0].status,'unknown');
});
await test('Not-started and invalid records never dispatch',async()=>{
 const f=fixture();f.auto.submitRound(round(1,10,{started:false}));f.auto.submitRound(round(2,101));await f.advance();assert.equal(f.calls.length,0);
});
console.log(JSON.stringify(results,null,2));process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
