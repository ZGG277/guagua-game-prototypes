import test from 'node:test';
import assert from 'node:assert/strict';
import {createRunTimer,createPlatform,createLeaderboard,createFastestStore,shareGoodnight,followAuthor,getFollowStatus,FASTEST_KEY} from '../dist/platform.js';
function timer() { let w=10000,m=100; return {t:createRunTimer({wallNow:()=>w,monoNow:()=>m}),step:(a,b=a)=>{w+=a;m+=b;}}; }
function platform(api, version=9510000) { return createPlatform({getXhs:()=>({launchOptions:{miniToolEnv:{buildVersion:version}},miniTool:api})}); }
function run(practice=false) {const c=timer();c.t.start(practice);c.step(1234);return c.t.finishSleeping();}
test('Start to first sleeping seals exactly once',()=>{const c=timer();assert.equal(c.t.sample(),null);c.t.start(false);c.step(1234);const r=c.t.finishSleeping();assert.equal(r.elapsedMs,1234);assert.equal(r.eligible,true);c.step(9000);assert.equal(c.t.finishSleeping(),r);assert.ok(Object.isFrozen(r));});
test('pause and background still count wall time',()=>{const c=timer();c.t.start(false);c.step(1000);c.t.setPaused(true);c.step(20000);c.t.setPaused(false);c.t.setHidden(true);c.step(30000);c.t.setHidden(false);c.step(1000);const r=c.t.finishSleeping();assert.equal(r.elapsedMs,52000);assert.equal(r.eligible,true);});
test('practice, negative clock, discontinuity, foreground gap, nonfinite rejected',()=>{assert.equal(run(true).eligible,false);for(const [a,b,reason] of [[-1,1,'clock_invalid'],[4000,1,'clock_discontinuity'],[6000,6000,'frame_gap'],[NaN,1,'clock_invalid']]){const c=timer();c.t.start();c.step(a,b);assert.equal(c.t.finishSleeping().invalidReason,reason);assert.equal(c.t.finishSleeping().eligible,false);}});
test('submission uses board2 fractional negative seconds, deduplicates concurrent calls',async()=>{let count=0,args;const l=createLeaderboard({platform:platform({submitScore:async a=>{count++;args=a;return {score:a.score};}})});const r=run();const results=await Promise.all([l.submitRun(r),l.submitRun(r)]);assert.equal(count,1);assert.deepEqual(args,{board:2,score:-1.234});assert.equal(results[0].status,'submitted');assert.equal((await l.submitRun(run(true))).status,'skipped');assert.equal(count,1);});
test('read real rows and statuses; cache 30 seconds; no avatar fabrication',async()=>{let calls=0;const l=createLeaderboard({platform:platform({getRankList:async a=>{calls++;assert.deepEqual(a,{board:2,period:'all'});return {data:[{rank:1,score:-1.234,nickname:null}]};},getMyRank:async()=>({status:'OVER_LIMIT',rank:999,score:999})})});const a=await l.load();assert.equal(a.rows[0].nickname,'小红薯');assert.equal(a.rows[0].elapsedMs,1234);assert.equal(a.mine.rank,null);assert.equal(a.mine.elapsedMs,null);await l.load();assert.equal(calls,1);});
test('1005 stops all subsequent platform calls and hides online entry',async()=>{let count=0;const api={getRankList:async()=>{count++;throw {errCode:1005,errMsg:'denied'};},getMyRank:async()=>{count++;},submitScore:async()=>{count++;}};const l=createLeaderboard({platform:platform(api)});assert.equal((await l.load()).hideEntry,true);await l.load('week');await l.submitRun(run());assert.equal(count,1);});
test('2002 finite backoff is not empty leaderboard',async()=>{let count=0;let delays=[];const l=createLeaderboard({platform:platform({getRankList:async()=>{count++;throw {errCode:2002};},getMyRank:async()=>({status:'NO_SCORE'})}),delay:async ms=>delays.push(ms)});const r=await l.load();assert.equal(r.status,'not_ready');assert.equal(r.empty,undefined);assert.equal(count,5);assert.deepEqual(delays,[500,1000,2000,4000]);});
test('uncertain write is never retried',async()=>{let count=0;const l=createLeaderboard({platform:platform({submitScore:async()=>{count++;throw {errCode:2004};}})});const r=run();assert.equal((await l.submitRun(r)).status,'uncertain');await l.submitRun(r);assert.equal(count,1);});
test('low version and missing bridge do not call APIs',async()=>{let count=0;const l=createLeaderboard({platform:platform({submitScore:async()=>count++},9509000)});assert.equal((await l.submitRun(run())).status,'unavailable');assert.equal(count,0);assert.equal((await createPlatform({getXhs:()=>null}).capability(['submitScore'],9510)).status,'unavailable');});
test('all my rank statuses processed; malformed data not empty',async()=>{for(const status of ['EXACT','OVER_LIMIT','NO_SCORE','NOT_PARTICIPATING']){const l=createLeaderboard({platform:platform({getRankList:async()=>({data:[]}),getMyRank:async()=>({status,rank:2,score:-3})})});const r=await l.load();assert.equal(r.status,'ready');assert.equal(r.mine.status,status);assert.equal(r.mine.rank,status==='EXACT'?2:null);}const l=createLeaderboard({platform:platform({getRankList:async()=>({}),getMyRank:async()=>({status:'NO_SCORE'})})});assert.equal((await l.load()).status,'error');});
test('share uses postNote and never reports publication approval',async()=>{let args;const p=platform({postNote:async a=>{args=a;return {};}});const r=await shareGoodnight('data:image/png;base64,YQ==',{platform:p});assert.equal(r.status,'publish_flow_completed');assert.equal(args.pageType,'photo_publish');for(const tag of ['小红书小工具','哄睡','妈妈的多重宇宙','对全世界说晚安'])assert.ok(args.content.includes('#'+tag+'[话题]#'));assert.equal(args.mediaInfo.image_resources.length,1);assert.equal((await shareGoodnight('https://example.com/a.png',{platform:p})).status,'error');});
test('follow has no user id; failure business state not success',async()=>{let count=0;const p=platform({followAuthor:async function(){assert.equal(arguments.length,0);count++;return {follow_status:1};},getFollowStatus:async()=>({follow_status:-1})});assert.equal((await followAuthor({platform:p})).followStatus,1);assert.equal(count,1);assert.equal((await getFollowStatus({platform:p})).status,'error');assert.equal((await followAuthor({platform:platform({followAuthor:async()=>{throw {errCode:15404};}})})).status,'limited');});
test('local fastest stores duration only at original key and does not overwrite better',async()=>{const values=new Map();const p=platform({getStorage:async a=>({data:values.get(a.key)||null}),setStorage:async a=>{values.set(a.key,a.data);}});const s=createFastestStore({platform:p});assert.equal((await s.record(run())).status,'saved');assert.equal(values.get(FASTEST_KEY),'1234');assert.equal((await s.record(run(true))).status,'skipped');assert.equal((await s.record(run())).status,'ready');});
test('storage failure is explicit, not a successful record',async()=>{const s=createFastestStore({platform:platform({getStorage:async()=>({data:null}),setStorage:async()=>{throw new Error('disk full');}})});assert.equal((await s.record(run())).status,'error');});

function storageFixture(buildVersion, options = {}) {
  const calls = {nativeRead:0,nativeWrite:0,localRead:0,localWrite:0,launch:0};
  const localValues = new Map(), nativeValues = new Map();
  const miniTool = {
    getStorage:async ({key})=>{calls.nativeRead++;return {data:nativeValues.get(key)??null};},
    setStorage:async ({key,data})=>{calls.nativeWrite++;nativeValues.set(key,data);}
  };
  if (options.launch) miniTool.getLaunchOptions = async ()=>{calls.launch++;return options.launch();};
  if (options.missingWrite) delete miniTool.setStorage;
  const xhs = {launchOptions:{miniToolEnv:{buildVersion}},miniTool};
  const localStorage = {
    getItem(key){calls.localRead++;if(options.localFailure)throw Error('local unavailable');return localValues.get(key)??null;},
    setItem(key,value){calls.localWrite++;if(options.localFailure)throw Error('local unavailable');localValues.set(key,value);}
  };
  return {store:createFastestStore({getXhs:()=>xhs,localStorage}),calls,localValues,nativeValues};
}

test('Storage below 9.46 ignores present native methods and uses local fallback',async()=>{
  for(const version of [9459000,9459999]){
    const f=storageFixture(version);assert.equal((await f.store.record(run())).status,'saved');
    assert.equal(f.calls.nativeRead,0);assert.equal(f.calls.nativeWrite,0);assert.equal(f.calls.localWrite,1);assert.equal(f.localValues.get(FASTEST_KEY),'1234');
  }
});
test('Storage unknown or invalid version never invokes native methods',async()=>{
  for(const version of [undefined,null,0,NaN,Infinity,'not-a-version']){
    const f=storageFixture(version);assert.equal((await f.store.record(run())).status,'saved');
    assert.equal(f.calls.nativeRead,0);assert.equal(f.calls.nativeWrite,0);assert.equal(f.calls.localWrite,1);
  }
});
test('Storage 9.46.0 boundary and later versions use JSON native storage',async()=>{
  for(const version of [9460000,9460999,9510000]){
    const f=storageFixture(version);assert.equal((await f.store.record(run())).status,'saved');
    assert.equal(f.calls.nativeWrite,1);assert.equal(f.calls.localRead,0);assert.equal(f.calls.localWrite,0);assert.equal(f.nativeValues.get(FASTEST_KEY),'1234');
  }
});
test('Storage missing synchronous version can confirm native support asynchronously',async()=>{
  const f=storageFixture(undefined,{launch:()=>({miniToolEnv:{buildVersion:9460000}})});
  assert.equal((await f.store.record(run())).status,'saved');assert.ok(f.calls.launch>0);assert.equal(f.calls.nativeWrite,1);assert.equal(f.calls.localRead,0);
});
test('Storage failed or unsupported asynchronous version falls back without native calls',async()=>{
  for(const launch of [()=>{throw Error('version unavailable');},()=>({}),()=>({miniToolEnv:{buildVersion:9459999}})]){
    const f=storageFixture(undefined,{launch});assert.equal((await f.store.record(run())).status,'saved');assert.ok(f.calls.launch>0);
    assert.equal(f.calls.nativeRead,0);assert.equal(f.calls.nativeWrite,0);assert.equal(f.calls.localWrite,1);
  }
});
test('Storage missing native method falls back even on a supported version',async()=>{
  const f=storageFixture(9510000,{missingWrite:true});assert.equal((await f.store.record(run())).status,'saved');assert.equal(f.calls.nativeRead,0);assert.equal(f.calls.localWrite,1);
});
test('Storage fallback failure remains an explicit failure, never a fake saved record',async()=>{
  const f=storageFixture(9459000,{localFailure:true});const result=await f.store.record(run());assert.equal(result.status,'error');assert.match(result.message,/读取失败/);assert.equal(f.calls.nativeRead,0);assert.equal(f.calls.nativeWrite,0);
});
test('followAuthor 10003 means pending confirmation, not leaderboard whitelist denial',async()=>{
  let count=0;const result=await followAuthor({platform:platform({followAuthor:async()=>{count++;throw {errCode:10003,errMsg:'already pending'};}})});
  assert.equal(count,1);assert.equal(result.status,'pending');assert.equal(result.code,10003);assert.match(result.message,/关注确认流程尚未结束/);assert.doesNotMatch(result.message,/排行榜|白名单/);
});
test('ranking 10003 still means whitelist denial and remains latched',async()=>{
  let count=0;const board=createLeaderboard({platform:platform({getRankList:async()=>{count++;throw {errCode:10003};},getMyRank:async()=>({status:'NO_SCORE'})})});
  const result=await board.load();assert.equal(result.status,'error');assert.match(result.message,/排行榜内测白名单/);await board.load();assert.equal(count,1);
});
