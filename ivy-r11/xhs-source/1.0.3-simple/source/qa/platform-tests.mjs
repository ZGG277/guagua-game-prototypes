import assert from 'node:assert/strict';
import {createRanks,rankFailure} from '../build-source/wall-platform.mjs';
import {myRankText} from '../build-source/wall-rank.mjs';
const results=[];
async function test(name,fn){await fn();results.push({name,status:'PASS'});}
const scope=miniTool=>({xhs:{launchOptions:{miniToolEnv:{buildVersion:9510000}},miniTool}});
const api={submitScore:async({score})=>({score}),getRankList:async()=>({data:[]}),getMyRank:async()=>({status:'NO_SCORE',rank:null,score:null})};
await test('Explicit real API error mapping',()=>{for(const [code,status] of [[1005,'unauthorized'],[1006,'unauthorized'],[10003,'not_open'],[2002,'preparing'],[2008,'auth_service'],[2009,'rate_limited'],[500,'error']])assert.equal(rankFailure({errCode:code}).status,status);});
await test('Read-only list never submits a score',async()=>{let writes=0;const r=createRanks(scope({...api,submitScore:async()=>{writes++;}}));assert.equal((await r.list()).status,'ok');assert.equal(writes,0);});
await test('No unsupported bridge is represented as an empty real board',async()=>{assert.equal((await createRanks({}).list()).status,'unsupported');});
await test('All documented personal rank states have accurate concise text',()=>{assert.match(myRankText({status:'EXACT',rank:7,score:20},1),/第 7 名/);assert.match(myRankText({status:'OVER_LIMIT'},1),/500/);assert.match(myRankText({status:'NO_SCORE'},1),/暂未上榜/);assert.match(myRankText({status:'NOT_PARTICIPATING'},1),/暂未上榜/);});
await test('Invalid EXACT rank is not displayed',async()=>{const r=createRanks(scope({...api,getMyRank:async()=>({status:'EXACT',rank:0,score:20})}));assert.equal((await r.list()).status,'error');});
await test('Not ready reads have bounded backoff',async()=>{let n=0;const pauses=[];const r=createRanks(scope({...api,getRankList:async()=>{n++;throw{errCode:2002};}}),{sleep:async n=>pauses.push(n)});assert.equal((await r.list()).status,'preparing');assert.equal(n,4);assert.deepEqual(pauses,[500,1000,2000]);});
await test('Uncertain submission is never retried by API adapter',async()=>{let n=0;const r=createRanks(scope({...api,submitScore:async()=>{n++;throw{errCode:2004};}}));const result=await r.submit({highestLeaf:20},{board:1});assert.equal(result.status,'unknown');assert.equal(n,1);});
await test('Successful reads are cached for 30 seconds only',async()=>{let now=0,n=0;const r=createRanks(scope({...api,getRankList:async()=>{n++;return{data:[]};}}),{now:()=>now});await r.list();await r.list();assert.equal(n,1);now=30001;await r.list();assert.equal(n,2);});
console.log(JSON.stringify(results,null,2));
