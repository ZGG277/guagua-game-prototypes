import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createCloudRecords,CLOUD_COLLECTION,cloudMetaKey} from '../build-source/wall-cloud.mjs';
import {scoreStorageKey} from '../build-source/wall-score.mjs';
const record=(leaf,time=null)=>({schemaVersion:1,rulesVersion:'r11.2',highestLeaf:leaf,summitSeconds:time,completed:time!==null});
const row=(id,writerId,r)=>({id,collection:CLOUD_COLLECTION,content:{...r,writerId}});
const id='a'.repeat(24),other='b'.repeat(32);
async function setup({local=record(20),rows=[],query,add,update,meta,writeFail=false,version=9510000}={}){
 let time=100000,calls=[],received=[],waits=[];const store=new Map([[scoreStorageKey(),JSON.stringify(local)]]);
 if(meta)store.set(cloudMetaKey(),JSON.stringify(meta));
 const api={queryCloudStorage:async opts=>{calls.push(['query',opts]);return query?query(opts):{items:rows};},addCloudStorage:async opts=>{calls.push(['add',opts]);if(add)return add(opts);rows.push(row(id,opts.items[0].content.writerId,opts.items[0].content));return{data:[{id,status:'SUCCESS'}]};},updateCloudStorage:async opts=>{calls.push(['update',opts]);if(update)return update(opts);const r=rows.find(r=>r.id===opts.items[0].id);r.content=opts.items[0].content;return{data:[{id:r.id,status:'SUCCESS'}]};}};
 const cloud=await createCloudRecords({crypto:webcrypto,xhs:{miniTool:api,launchOptions:{miniToolEnv:{buildVersion:version}}}},{readLocal:k=>store.get(k)??null,writeLocal:async(k,v)=>{if(writeFail)return false;store.set(k,v);return true;},onRecord:r=>received.push(r),now:()=>time,sleep:ms=>{waits.push(ms);return new Promise(()=>{});}});
 return{cloud,calls,received,store,rows,waits,advance:ms=>time+=ms,writes:()=>calls.filter(c=>c[0]!=='query')};
}
let tests=0;async function test(name,fn){await fn();tests++;console.log('PASS',name);}
await test('automatic initial read merges maximum leaf and minimum summit',async()=>{
 const x=await setup({local:record(100,40),rows:[row(id,other,record(100,25))]});assert.equal(x.received.at(-1).summitSeconds,25);assert.equal(x.cloud.status().status,'synced');assert.equal(x.writes().length,0);
});
await test('observations are frame-safe and writes are minute throttled',async()=>{
 const x=await setup();assert.equal(x.writes().length,0);x.cloud.observe(record(40));assert.equal(x.writes().length,0);await x.cloud.flush();assert.equal(x.writes().length,1);x.cloud.observe(record(50));await x.cloud.flush();assert.equal(x.writes().length,1);x.advance(60000);await x.cloud.flush();assert.equal(x.writes().length,2);assert.equal(x.writes()[1][0],'update');assert(x.waits.every(n=>n>=60000));
});
await test('other device record is never overwritten',async()=>{
 const rows=[row(id,other,record(60))];const x=await setup({local:record(80),rows,add:()=>({data:[{id:'c'.repeat(24),status:'SUCCESS'}]})});await x.cloud.flush();assert.equal(x.writes()[0][0],'add');assert.equal(rows[0].content.highestLeaf,60);
});
await test('fresh query avoids overwriting a higher remote result',async()=>{
 const rows=[];const x=await setup({rows});rows.push(row(id,other,record(90)));await x.cloud.flush();assert.equal(x.writes().length,0);assert.equal(x.received.at(-1).highestLeaf,90);
});
await test('partial pagination failure is not empty and forbids writing',async()=>{
 const x=await setup({query:({cursor})=>{if(cursor)throw{errCode:2009};return{items:[row(id,other,record(90))],nextCursor:'next'};}});assert.equal(x.cloud.status().status,'rate_limited');assert.equal(x.received.at(-1).highestLeaf,20);await x.cloud.flush();assert.equal(x.writes().length,0);
});
await test('unauthorized and unopened do not repeatedly probe or write',async()=>{
 for(const code of [1006,10003]){const x=await setup({query:()=>{throw{errCode:code};}});assert.equal(x.cloud.status().status,code===1006?'unauthorized':'not_open');await x.cloud.flush();assert.equal(x.calls.length,1);}
});
await test('unsupported versions never access cloud or claim saved',async()=>{const x=await setup({version:9500000});assert.equal(x.cloud.status().status,'unsupported');assert.equal(x.calls.length,0);});
await test('durable journal precedes write and UNKNOWN never replays',async()=>{
 const x=await setup({add:()=>({data:[{id:'',status:'UNKNOWN'}]})});await x.cloud.flush();assert.equal(x.cloud.status().status,'unknown');const meta=JSON.parse(x.store.get(cloudMetaKey()));assert(meta.journal);x.advance(120000);await x.cloud.flush();assert.equal(x.writes().length,1);assert.equal(x.cloud.status().status,'unknown');
 const y=await setup({meta});await y.cloud.flush();assert.equal(y.writes().length,0);assert.equal(y.cloud.status().status,'unknown');
});
await test('unknown reconciles only after own record proves intended score',async()=>{
 const rows=[];const x=await setup({rows,add:opts=>{rows.push(row(id,opts.items[0].content.writerId,opts.items[0].content));return{data:[{id,status:'UNKNOWN'}]};}});await x.cloud.flush();await x.cloud.flush();assert.equal(x.cloud.status().status,'synced');assert.equal(x.writes().length,1);assert.equal(JSON.parse(x.store.get(cloudMetaKey())).journal,null);
});
await test('2004 and generic timeout retain uncertainty, no replay',async()=>{for(const err of [{errCode:2004},{uncertain:true},new Error('transport')]){const x=await setup({add:()=>{throw err;}});await x.cloud.flush();x.advance(60000);await x.cloud.flush();assert.equal(x.writes().length,1);assert.equal(x.cloud.status().status,'unknown');}});
await test('FAILED is not success and retry is still throttled',async()=>{const x=await setup({add:()=>({data:[{id:'',status:'FAILED'}]})});await x.cloud.flush();assert.equal(x.cloud.status().status,'error');await x.cloud.flush();assert.equal(x.writes().length,1);x.advance(60000);await x.cloud.flush();assert.equal(x.writes().length,2);});
await test('native durability failure blocks all cloud writes',async()=>{const x=await setup({writeFail:true});assert.equal(x.cloud.status().status,'local_error');await x.cloud.flush();assert.equal(x.calls.length,0);});
await test('invalid scores and wrong rules never upload',async()=>{const x=await setup({local:null});for(const r of [record(101),record(50,30),{...record(90),rulesVersion:'other'}])assert.equal(x.cloud.observe(r),false);await x.cloud.flush();assert.equal(x.writes().length,0);});
await test('cyclic cursor rejected without writes',async()=>{const x=await setup({query:()=>({items:[],nextCursor:'same'})});assert.equal(x.cloud.status().status,'error');assert.equal(x.writes().length,0);});
await test('pagination stops after ten pages without writing or partial merge',async()=>{
 let pages=0;const x=await setup({query:()=>({items:[row(id,other,record(90))],nextCursor:'page-'+(++pages)})});assert.equal(pages,10);assert.equal(x.cloud.status().status,'error');assert.equal(x.writes().length,0);assert.equal(x.received.at(-1).highestLeaf,20);
});
console.log(`${tests} cloud tests passed`);
