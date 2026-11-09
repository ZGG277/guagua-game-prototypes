/* Deterministic source-level tests only. Not simulator / Android / iOS acceptance. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'source/leaderboard.js'), 'utf8');
const checks = [];
let completed=false;
process.on('beforeExit',()=>{if(!completed){console.error('Leaderboard suite did not finish: unresolved test promise.');process.exitCode=1;}});
function deferred() { let resolve, reject; const promise = new Promise((a,b) => {resolve=a; reject=b;}); return {promise,resolve,reject}; }
async function flush() { for (let i=0;i<40;i++) await Promise.resolve(); }
function harness(options={}) {
  let now = options.now === undefined ? Date.parse('2026-11-09T04:00:00Z') : options.now;
  let serial=0;
  const timers=new Map(), calls=[], nodes={}, docEvents={}, winEvents={};
  function node(id) {
    const n={id,hidden:false,disabled:false,children:[],events:{},attrs:{},style:{values:{},setProperty(k,v){this.values[k]=v;}},className:'',_text:'',
      setAttribute(k,v){this.attrs[k]=String(v);},
      addEventListener(k,v){(this.events[k]||(this.events[k]=[])).push(v);},
      appendChild(v){this.children.push(v);return v;},
      focus(){document.activeElement=this;},
      click(){if(this.disabled)return;for(const f of this.events.click||[])f({currentTarget:this});}
    };
    Object.defineProperty(n,'textContent',{get(){return this._text+this.children.map(x=>x.textContent).join('');},set(v){this._text=String(v);this.children=[];}});
    Object.defineProperty(n,'innerHTML',{get(){throw Error('innerHTML is forbidden in leaderboard tests');},set(){throw Error('innerHTML is forbidden in leaderboard tests');}});
    return n;
  }
  const document={hidden:false,activeElement:null,getElementById(id){return nodes[id]||null;},createElement(tag){return node(tag);},addEventListener(k,v){(docEvents[k]||(docEvents[k]=[])).push(v);}};
  if (!options.minimal) {
    for(const id of ['open','panel','close','title','submit-status','status','mine','local','list','more','refresh','entry-unavailable'])nodes['leaderboard-'+id]=node('leaderboard-'+id);
    for(const p of ['day','week','month','all'])nodes['rank-'+p]=node('rank-'+p);
    for(const id of ['','-status','-mine','-list','-open','-refresh'])nodes['settlement-rank'+id]=node('settlement-rank'+id);
    nodes['leaderboard-submit-status'].hidden=true; document.activeElement=nodes['leaderboard-open'];
  }
  const behavior=Object.assign({submitScore:p=>({score:p.score}),getRankList:()=>({data:[]}),getMyRank:()=>({status:'NO_SCORE',rank:null,score:null})},options.behavior||{});
  const miniTool={};
  for(const name of ['submitScore','getRankList','getMyRank'])miniTool[name]=params=>{calls.push({name,params:JSON.parse(JSON.stringify(params)),at:now});return behavior[name](params);};
  miniTool.getLaunchOptions=()=>{calls.push({name:'getLaunchOptions',at:now});return options.launchBehavior?options.launchBehavior():{miniToolEnv:{buildVersion:9510000}};};
  if(options.windowInfoBehavior)miniTool.getWindowInfo=()=>{calls.push({name:'getWindowInfo',at:now});return options.windowInfoBehavior();};
  for(const name of options.missing||[])delete miniTool[name];
  // Any implicit profile request, auth request, storage, or custom networking fails immediately.
  for(const name of ['getUserProfile','getUserInfo','authorize','setStorage','setRecord','request','fetch'])miniTool[name]=()=>{throw Error('forbidden '+name);};
  class ClockDate extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const context={console,Promise,Date:ClockDate,setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);},
    document,addEventListener(k,v){(winEvents[k]||(winEvents[k]=[])).push(v);},
    survival:{best:{coins:40},demo:false},
    DurianPlatform:options.platform,
    xhs:options.noXhs?undefined:{launchOptions:options.launchOptions===undefined?{miniToolEnv:{buildVersion:9510000}}:options.launchOptions,miniTool},
    localStorage:{getItem(){throw Error('No leaderboard localStorage reads');},setItem(){throw Error('No leaderboard localStorage writes');}},
    fetch(){throw Error('No network');},XMLHttpRequest:function(){throw Error('No network');}
  };
  context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'source/leaderboard.js'});
  const mod=context.DurianLeaderboard;
  async function tick(ms) {
    const end=now+ms;
    for(;;){let first=null,id=null;for(const [k,v]of timers){if(v.at<=end&&(!first||v.at<first.at)){first=v;id=k;}}if(!first)break;now=first.at;timers.delete(id);first.fn();await flush();}
    now=end;await flush();
  }
  function emit(type,event={}){for(const f of docEvents[type]||[])f(event);}
  return {mod,context,document,nodes,calls,behavior,miniTool,timers,tick,flush,emit,now:()=>now,
    text(name){return nodes['leaderboard-'+name].textContent;},
    settlement(name){return nodes['settlement-rank'+(name?'-'+name:'')].textContent;},
    emitWindow(type,event={}){for(const f of winEvents[type]||[])f(event);},
    click(name){const n=nodes[name]||nodes['leaderboard-'+name];n.click();},
    count(name){return calls.filter(x=>x.name===name).length;},
    hide(){document.hidden=true;emit('visibilitychange');},show(){document.hidden=false;emit('visibilitychange');}
  };
}
function snapshot(whole=20,smashed=0,hits=0){return {coins:whole*20-smashed*10,whole,smashed,settled:whole+smashed,hits};}
function rows(count=100,score=100){return Array.from({length:count},(_,i)=>({rank:i+1,score:score-i,nickname:i?'user-'+i:null}));}
async function test(name,fn){await fn();checks.push(name);console.log('PASS',name);}
(async()=>{
  await test('9510 version + all three public methods required; no profile/auth/storage/network calls',async()=>{
    for(const missing of ['submitScore','getRankList','getMyRank']){const h=harness({missing:[missing]});assert.equal(await h.mod.ready,false);assert(h.nodes['leaderboard-open'].hidden);assert.equal(await h.mod.record(snapshot()),false);assert.equal(h.count('submitScore'),0);}
    for(const version of [9509999,0,'bad']){const h=harness({launchOptions:{miniToolEnv:{buildVersion:version}},launchBehavior:()=>({miniToolEnv:{buildVersion:version}})});assert.equal(await h.mod.ready,false);}
    const absent=harness({noXhs:true});assert.equal(await absent.mod.ready,false);assert.equal(await absent.mod.open(),false);
    const ok=harness();assert.equal(await ok.mod.ready,true);assert.equal(ok.count('getLaunchOptions'),0);assert.equal(ok.nodes['leaderboard-open'].hidden,false);assert.equal(ok.text('local'),'本机最高：40 金币（当前可读记录）');
  });
  await test('empty synchronous launch options use async fallback; unavailable launch times out',async()=>{
    const h=harness({launchOptions:{}});assert.equal(await h.mod.ready,true);assert.equal(h.count('getLaunchOptions'),1);
    const gate=deferred(),pending=harness({launchOptions:{},launchBehavior:()=>gate.promise});await pending.tick(3000);assert.equal(await pending.mod.ready,false);gate.resolve({miniToolEnv:{buildVersion:9999999}});await flush();assert(pending.nodes['leaderboard-open'].hidden);
  });
  await test('exact original scores including negative and lower runs submit once each to board 1',async()=>{
    const h=harness();await h.mod.ready;const a=snapshot(),b=snapshot(10,10),c=snapshot(0,20);assert(await h.mod.record(a));assert.equal(await h.mod.record(a),false);assert(await h.mod.record(b));assert(await h.mod.record(c));assert(await h.mod.record(snapshot(0,20)));
    assert.deepEqual(h.calls.filter(x=>x.name==='submitScore').map(x=>x.params),[{board:1,score:400},{board:1,score:100},{board:1,score:-200},{board:1,score:-200}]);assert.equal(h.nodes['leaderboard-submit-status'].hidden,false);assert(h.text('submit-status').includes('-200'));
  });
  await test('snapshot is not rounded/coerced/clamped; malformed and demo snapshots never write',async()=>{
    const h=harness();await h.mod.ready;
    const invalid=[null,undefined,{},snapshot(0,0),Object.assign(snapshot(),{coins:399.9}),Object.assign(snapshot(),{coins:'400'}),Object.assign(snapshot(),{coins:Infinity}),snapshot(21),snapshot(-1,21),Object.assign(snapshot(),{settled:19}),Object.assign(snapshot(),{hits:7}),Object.assign(snapshot(),{hits:-1}),Object.assign(snapshot(),{hits:1.2}),Object.assign(snapshot(),{whole:NaN}),Object.assign(snapshot(),{demo:true})];
    for(const s of invalid)assert.equal(await h.mod.record(s),false);
    h.context.survival.demo=true;assert.equal(await h.mod.record(snapshot()),false);assert.equal(h.count('submitScore'),0);
  });
  await test('mutation while capability loads cannot change the captured original score',async()=>{
    const gate=deferred(),h=harness({launchOptions:{},launchBehavior:()=>gate.promise}),s=snapshot(1,1,6),p=h.mod.record(s);s.coins=400;gate.resolve({miniToolEnv:{buildVersion:9510000}});assert(await p);assert.equal(h.calls.find(x=>x.name==='submitScore').params.score,10);
  });
  await test('2004 / no-code / malformed / canceled / timeouts remain unknown and are never resent',async()=>{
    for(const outcome of [{errCode:2004},{errMsg:'submitScore:fail gateway'},{errCode:'2004'},{errMsg:'submitScore:fail cancel'},null,{score:'400'},{score:Infinity},undefined]){
      const h=harness({behavior:{submitScore:()=>{if(outcome&&('errCode'in outcome||'errMsg'in outcome))return Promise.reject(outcome);return outcome;}}});await h.mod.ready;const s=snapshot();assert.equal(await h.mod.record(s),false);assert(h.text('submit-status').includes('待确认'));await h.mod.record(s);await h.mod.open();h.click('refresh');await flush();assert.equal(h.count('submitScore'),1);
    }
    const wait=deferred(),h=harness({behavior:{submitScore:()=>wait.promise}});await h.mod.ready;const s=snapshot(),p=h.mod.record(s);await flush();await h.tick(8000);assert.equal(await p,false);const message=h.text('submit-status');assert(message.includes('待确认'));wait.resolve({score:400});await flush();assert.equal(h.text('submit-status'),message);await h.mod.record(s);assert.equal(h.count('submitScore'),1);
  });
  await test('known write failures also have no automatic retries; lower result returning historic best succeeds',async()=>{
    for(const code of [1001,1004,2001,2002,2008,2009,2999]){const h=harness({behavior:{submitScore:()=>Promise.reject({errCode:code})}});await h.mod.ready;await h.mod.record(snapshot());await h.tick(60000);assert.equal(h.count('submitScore'),1);assert(h.text('submit-status').includes('未成功'));}
    const h=harness({behavior:{submitScore:()=>({score:400})}});await h.mod.ready;assert(await h.mod.record(snapshot(0,6,6)));assert(h.text('submit-status').includes('历史最高：400'));
  });
  await test('1005/1006/10003 hide entry after read or write; local record and close remain usable',async()=>{
    for(const code of [1005,1006,10003])for(const method of ['getRankList','getMyRank','submitScore']){
      const behavior={};behavior[method]=()=>Promise.reject({errCode:code});const h=harness({behavior});await h.mod.ready;
      if(method==='submitScore'){await h.mod.open();await h.mod.record(snapshot());}else await h.mod.open();
      assert(h.nodes['leaderboard-open'].hidden);assert.equal(h.nodes['leaderboard-close'].disabled,false);assert(h.text('local').includes('40'));assert.equal(await h.mod.open(),false);h.click('close');assert(h.nodes['leaderboard-panel'].hidden);
    }
  });
  await test('list data [] is true empty; malformed data and rank statuses are unavailable, never empty',async()=>{
    const h=harness();await h.mod.ready;await h.mod.open();assert(h.text('status').includes('还没有上榜'));assert(h.text('mine').includes('本期暂无成绩'));
    for(const value of [{},{data:null},{data:{}},{data:[{rank:1,score:NaN}]},{data:[{rank:0,score:1}]},{data:[{rank:1,score:'2'}]}]){const bad=harness({behavior:{getRankList:()=>value}});await bad.mod.ready;await bad.mod.open();assert(bad.text('status').includes('不可用'));assert(!bad.text('status').includes('还没有上榜'));}
    for(const value of [{},{status:'UNKNOWN',rank:null,score:null},{status:'EXACT',rank:null,score:null},{status:'EXACT',rank:501,score:1},{status:'EXACT',rank:1,score:'2'},{status:'OVER_LIMIT',rank:501,score:10},{status:'NO_SCORE'},{status:'NOT_PARTICIPATING',rank:0,score:null}]){const bad=harness({behavior:{getMyRank:()=>value}});await bad.mod.ready;await bad.mod.open();assert(bad.text('mine').includes('暂不可用'));}
  });
  await test('four own-rank states are distinct and EXACT supports negative scores',async()=>{
    for(const [status,rank,score,copy]of [['EXACT',500,-60,'第 500 名 · -60'],['OVER_LIMIT',null,null,'500+'],['NO_SCORE',null,null,'本期暂无成绩'],['NOT_PARTICIPATING',null,null,'尚未参与']]){const h=harness({behavior:{getMyRank:()=>({status,rank,score})}});await h.mod.ready;await h.mod.open();assert(h.text('mine').includes(copy));}
  });
  await test('first 20 rows only, 20 more per click, max 100; nickname is textContent with fallback/cap',async()=>{
    const data=rows(105);data[1].nickname='<img src=x onerror=alert(1)>';data[2].nickname='a'.repeat(200);data[3].nickname='  ';const h=harness({behavior:{getRankList:()=>({data})}});await h.mod.ready;await h.mod.open();const list=h.nodes['leaderboard-list'];assert.equal(list.children.length,20);assert(list.children[0].textContent.includes('小红薯'));assert.equal(list.children[1].children[1].textContent,data[1].nickname);assert.equal(list.children[1].children[1].className,'leaderboard-name');assert.equal(list.children[2].children[1].textContent.length,80);assert(list.children[3].textContent.includes('小红薯'));
    for(const count of [40,60,80,100]){h.click('more');assert.equal(list.children.length,count);}assert(h.nodes['leaderboard-more'].hidden);assert.equal(h.count('getRankList'),1);
  });
  await test('read 2002 uses exactly 500/1000/2000/4000 backoff then stops at five attempts',async()=>{
    const h=harness({behavior:{getRankList:()=>Promise.reject({errCode:2002}),getMyRank:()=>Promise.reject({errCode:2002})}});await h.mod.ready;const p=h.mod.open();await flush();assert.equal(h.count('getRankList'),1);await h.tick(499);assert.equal(h.count('getRankList'),1);await h.tick(1);await h.tick(1000);await h.tick(2000);await h.tick(4000);assert.equal(await p,false);assert.equal(h.count('getRankList'),5);assert.equal(h.count('getMyRank'),5);assert(h.text('status').includes('仍在准备'));assert(!h.text('status').includes('还没有上榜'));assert.deepEqual(h.calls.filter(x=>x.name==='getRankList').map(x=>x.at-h.calls.find(x=>x.name==='getRankList').at),[0,500,1500,3500,7500]);await h.tick(60000);assert.equal(h.count('getRankList'),5);
  });
  await test('read 2008/2999 retries only once after 1s, while 2009/no-code are not retried',async()=>{
    for(const code of [2008,2999,2009,null]){const h=harness({behavior:{getRankList:()=>Promise.reject(code===null?{}:{errCode:code})}});await h.mod.ready;const p=h.mod.open();await flush();await h.tick(1000);await p;assert.equal(h.count('getRankList'),code===2008||code===2999?2:1);await h.tick(60000);assert.equal(h.count('getRankList'),code===2008||code===2999?2:1);}
    let tries=0;const h=harness({behavior:{getRankList:()=>{tries++;return tries===1?Promise.reject({errCode:2008}):tries===2?Promise.reject({errCode:2999}):{data:[]};}}});await h.mod.ready;const p=h.mod.open();await flush();await h.tick(1000);await p;assert.equal(tries,2);
  });
  await test('hidden / close / gameplay cancel pending read retries, with no background resumption',async()=>{
    for(const stop of ['hide','close','play']){const h=harness({behavior:{getRankList:()=>Promise.reject({errCode:2002})}});await h.mod.ready;const p=h.mod.open();await flush();if(stop==='hide')h.hide();else if(stop==='close')h.mod.close();else h.mod.setPlaying(true);await flush();await h.tick(60000);await p;assert.equal(h.count('getRankList'),1);h.show();await h.tick(60000);assert.equal(h.count('getRankList'),1);}
  });
  await test('successful retry can recover; list and own failures remain independent',async()=>{
    let n=0;const h=harness({behavior:{getRankList:()=>++n===1?Promise.reject({errCode:2002}):{data:rows(1)},getMyRank:()=>Promise.reject({errCode:2001})}});await h.mod.ready;const p=h.mod.open();await flush();await h.tick(500);assert.equal(await p,false);assert.equal(h.nodes['leaderboard-list'].children.length,1);assert(h.text('mine').includes('不可用'));assert(!h.text('status').includes('还没有上榜'));
  });
  await test('concurrent reads deduplicate and cache is per-period for 45 seconds; explicit refresh queries',async()=>{
    const gate=deferred(),h=harness({behavior:{getRankList:()=>gate.promise}});await h.mod.ready;const a=h.mod.open(),b=h.mod.open();await flush();h.click('refresh');await flush();assert.equal(h.count('getRankList'),1);gate.resolve({data:rows(1)});await Promise.all([a,b]);await flush();await h.mod.open();assert.equal(h.count('getRankList'),1);await h.tick(44999);await h.mod.open();assert.equal(h.count('getRankList'),1);await h.tick(1);await h.mod.open();assert.equal(h.count('getRankList'),2);h.click('rank-day');await flush();assert.equal(h.count('getRankList'),3);h.click('rank-all');await flush();assert.equal(h.count('getRankList'),3);h.click('refresh');await flush();assert.equal(h.count('getRankList'),4);
  });
  await test('Beijing midnight, Monday, and first-of-month reset invalidate respective cached periods',async()=>{
    for(const [period,instant]of [['day','2026-11-09T15:59:59Z'],['week','2026-11-08T15:59:59Z'],['month','2026-11-30T15:59:59Z']]){
      const h=harness({now:Date.parse(instant)});await h.mod.ready;await h.mod.open();h.click('rank-'+period);await flush();const count=h.count('getRankList');await h.tick(1001);h.click('rank-'+period);await flush();assert.equal(h.count('getRankList'),count+1,period);
    }
  });
  await test('rapid period switches cannot paint stale data; period API parameters have no unsupported limit',async()=>{
    const all=deferred(),day=deferred(),h=harness({behavior:{getRankList:p=>p.period==='all'?all.promise:day.promise,getMyRank:p=>({status:'EXACT',rank:1,score:p.period==='all'?400:20})}});await h.mod.ready;const first=h.mod.open();await flush();h.click('rank-day');await flush();day.resolve({data:[{rank:1,score:20,nickname:'today'}]});await flush();assert(h.text('list').includes('today'));all.resolve({data:[{rank:1,score:400,nickname:'old total'}]});await first;await flush();assert(h.text('list').includes('today'));assert(!h.text('list').includes('old total'));assert(h.text('mine').includes('20'));assert(h.text('title').includes('日榜'));for(const c of h.calls.filter(x=>x.name==='getRankList'||x.name==='getMyRank'))assert.deepEqual(Object.keys(c.params).sort(),['board','period']);
  });
  await test('query crossing Beijing boundary is not displayed or reused as current-period data',async()=>{
    const gate=deferred(),h=harness({now:Date.parse('2026-11-09T15:59:59Z'),behavior:{getRankList:p=>p.period==='day'?gate.promise:{data:[]}}});await h.mod.ready;await h.mod.open();h.click('rank-day');await flush();await h.tick(1001);gate.resolve({data:rows(1)});await flush();assert(h.text('status').includes('已更新'));assert.equal(h.nodes['leaderboard-list'].children.length,0);h.behavior.getRankList=()=>({data:[]});h.click('refresh');await flush();assert(h.text('status').includes('还没有上榜'));
  });
  await test('successful submission invalidates caches; old reads cannot overwrite post-submit results',async()=>{
    let n=0;const gate=deferred(),h=harness({behavior:{getRankList:()=>++n===1?gate.promise:{data:[{rank:1,score:400,nickname:'new'}]}}});await h.mod.ready;const open=h.mod.open();await flush();await h.mod.record(snapshot());await flush();assert(h.text('list').includes('new'));gate.resolve({data:[{rank:1,score:1,nickname:'old'}]});await open;await flush();assert(h.text('list').includes('new'));assert.equal(h.count('getRankList'),2);
  });
  await test('late prior-round success/failure cannot overwrite new-round submit state',async()=>{
    for(const fail of [false,true]){const old=deferred();let n=0;const h=harness({behavior:{submitScore:()=>++n===1?old.promise:{score:100}}});await h.mod.ready;const p=h.mod.record(snapshot());await flush();h.mod.setPlaying(true);assert(h.nodes['leaderboard-open'].hidden);h.mod.setPlaying(false);await h.mod.record(snapshot(10,10));const message=h.text('submit-status');if(fail)old.reject({errCode:2004});else old.resolve({score:400});await p;assert.equal(h.text('submit-status'),message);assert(message.includes('100'));assert.equal(h.count('submitScore'),2);}
  });
  await test('close/Escape restore focus; gameplay hides entry and prevents queries; close never cancels/resends a write',async()=>{
    const gate=deferred(),h=harness({behavior:{submitScore:()=>gate.promise}});await h.mod.ready;const entry=h.nodes['leaderboard-open'];entry.focus();await h.mod.open();assert.equal(h.document.activeElement,h.nodes['leaderboard-close']);assert.equal(h.nodes['leaderboard-panel'].attrs.role,'dialog');let prevented=false;h.emit('keydown',{key:'Escape',preventDefault(){prevented=true;}});assert(prevented);assert(h.nodes['leaderboard-panel'].hidden);assert.equal(h.document.activeElement,entry);
    const p=h.mod.record(snapshot());await flush();await h.mod.open();h.click('close');assert(h.nodes['leaderboard-panel'].hidden);gate.resolve({score:400});assert(await p);assert.equal(h.count('submitScore'),1);h.mod.setPlaying(true);assert.equal(await h.mod.open(),false);assert(h.nodes['leaderboard-open'].hidden);assert.equal(h.nodes['leaderboard-submit-status'].hidden,true);h.mod.setPlaying(false);assert.equal(h.nodes['leaderboard-open'].hidden,false);
  });
  await test('minimal DOM and missing local best are tolerated without persistence claims',async()=>{
    const h=harness({minimal:true});await h.mod.ready;await h.mod.open();await h.mod.record(snapshot());h.mod.close();h.mod.setPlaying(true);h.mod.setPlaying(false);
    const visible=harness();visible.context.survival.best=null;await visible.mod.ready;await visible.mod.open();assert(visible.text('local').includes('暂无可读'));assert(!visible.text('local').includes('已保存'));
  });
  await test('close then immediate reopen starts a fresh read, ignores cancelled old results, and stays usable',async()=>{
    const old=deferred(),fresh=deferred();let count=0;const h=harness({behavior:{getRankList:()=>++count===1?old.promise:fresh.promise}});await h.mod.ready;const first=h.mod.open();await flush();h.mod.close();const second=h.mod.open();await flush();assert.equal(h.count('getRankList'),2);fresh.resolve({data:[{rank:1,score:100,nickname:'fresh'}]});await second;old.resolve({data:[{rank:1,score:400,nickname:'cancelled old'}]});await first;await flush();assert(h.text('list').includes('fresh'));assert(!h.text('list').includes('cancelled old'));assert(!h.text('status').includes('暂停'));assert.equal(h.nodes['leaderboard-panel'].hidden,false);
  });
  await test('close while launch options are pending cancels the open intent',async()=>{
    const gate=deferred(),h=harness({launchOptions:{},launchBehavior:()=>gate.promise});const p=h.mod.open();h.mod.close();gate.resolve({miniToolEnv:{buildVersion:9510000}});assert.equal(await p,false);assert.equal(h.count('getRankList'),0);assert(h.nodes['leaderboard-panel'].hidden);assert(await h.mod.open());
  });
  await test('malformed non-integer failure codes cannot masquerade as successful score writes',async()=>{
    const h=harness({behavior:{submitScore:()=>({errCode:'2004',score:400})}});await h.mod.ready;assert.equal(await h.mod.record(snapshot()),false);assert(h.text('submit-status').includes('待确认'));assert.equal(h.count('submitScore'),1);
  });
  await test('unknown write clears cached NO_SCORE so a later open queries actual host ranks without resubmitting',async()=>{
    for(const kind of ['2004','gateway','timeout']){
      let committed=false;const gate=deferred();const h=harness({behavior:{submitScore:()=>{committed=true;return kind==='timeout'?gate.promise:Promise.reject(kind==='2004'?{errCode:2004}:{});},getRankList:()=>({data:committed?[{rank:1,score:400,nickname:'current'}]:[]}),getMyRank:()=>committed?{status:'EXACT',rank:1,score:400}:{status:'NO_SCORE',rank:null,score:null}}});await h.mod.ready;await h.mod.open();assert(h.text('mine').includes('本期暂无成绩'));h.mod.close();const p=h.mod.record(snapshot());await flush();if(kind==='timeout')await h.tick(8000);await p;assert(h.text('submit-status').includes('待确认'));await h.mod.open();assert.equal(h.count('getMyRank'),2);assert(h.text('mine').includes('400'));assert.equal(h.count('submitScore'),1);assert(h.text('submit-status').includes('待确认'));
    }
  });
  await test('wide overlay independently clears all native menu buttons even when the narrow HUD does not intersect',async()=>{
    const info={windowWidth:414,windowHeight:736,safeArea:{top:44,bottom:702},menuButtons:{back:{left:8,right:48,top:44,bottom:88},me:{left:326,right:366,top:44,bottom:88},share:{left:370,right:410,top:44,bottom:88}}};
    let layouts=0;const h=harness({windowInfoBehavior:()=>info,platform:{layout(value){layouts++;assert.equal(value,info);return{top:52};}}});await h.mod.ready;await flush();assert.equal(h.nodes['leaderboard-panel'].style.values['--leaderboard-top-inset'],'96px');assert.equal(layouts,1);await h.mod.open();h.mod.close();await h.mod.open();assert.equal(h.count('getWindowInfo'),1);assert.equal(h.count('getRankList'),1);
    const taller=harness({windowInfoBehavior:()=>info,platform:{layout:()=>({top:140})}});await taller.mod.ready;await flush();assert.equal(taller.nodes['leaderboard-panel'].style.values['--leaderboard-top-inset'],'140px');
  });
  await test('optional geometry timeout/failure/missing API keeps conservative fallback and never blocks opening or closing',async()=>{
    for(const behavior of [undefined,()=>Promise.reject({errCode:2001}),()=>({}),()=>new Promise(()=>{})]){
      const h=harness({windowInfoBehavior:behavior});await h.mod.ready;assert.equal(h.nodes['leaderboard-panel'].style.values['--leaderboard-top-inset'],'calc(var(--hud-offset, 96px) + 44px)');assert(await h.mod.open());h.mod.close();assert(h.nodes['leaderboard-panel'].hidden);await h.tick(2000);assert.equal(h.nodes['leaderboard-panel'].style.values['--leaderboard-top-inset'],'calc(var(--hud-offset, 96px) + 44px)');await h.mod.open();assert.equal(h.count('getWindowInfo'),behavior?1:0);
    }
  });
  await test('source uses ES2017-compatible classic IIFE and has no direct profile/persistence/network access',async()=>{
    assert(source.startsWith('(function () {'));assert(!/\?\.|\?\?|\.replaceAll\(|\.at\(|Object\.hasOwn\(|structuredClone\(/.test(source));assert(!/\bfetch\s*\(|XMLHttpRequest|localStorage|\.setStorage\s*\(|\.getUser(Profile|Info)\s*\(|\.authorize\s*\(/.test(source));
    try{const acorn=require('./test-deps.cjs').load('acorn');acorn.parse(source,{ecmaVersion:2017,sourceType:'script'});}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
  });
  await test('settlement has no invented initial rank and shows loading immediately while capability or submission is pending',async()=>{
    const ready=deferred(),submit=deferred(),h=harness({launchOptions:{},launchBehavior:()=>ready.promise,behavior:{submitScore:()=>submit.promise}});
    const empty=h.mod.getShareSnapshot();assert.equal(empty.status,'UNAVAILABLE');assert.equal(empty.rank,null);assert.equal(empty.score,null);assert.equal(empty.runCoins,null);assert.equal(empty.submission,'unavailable');assert(Object.isFrozen(empty));assert(h.nodes['settlement-rank'].hidden);
    const p=h.mod.record(snapshot(0,6,6));const loading=h.mod.getShareSnapshot();assert.equal(loading.status,'LOADING');assert.equal(loading.submission,'pending');assert.equal(loading.runCoins,-60);assert.equal(loading.observedAt,null);assert.equal(h.nodes['settlement-rank'].hidden,false);assert(h.settlement('status').includes('加载'));assert(h.nodes['settlement-rank-refresh'].disabled);assert.equal(h.count('getRankList'),0);
    ready.resolve({miniToolEnv:{buildVersion:9510000}});await flush();assert.equal(h.count('submitScore'),1);assert.equal(h.count('getMyRank'),0);submit.resolve({score:-60});await p;await flush();assert.equal(h.mod.getShareSnapshot().submission,'success');assert.equal(h.count('getRankList'),1);
  });
  await test('every real settlement automatically reads all-time top three and own historic rank without opening a dialog',async()=>{
    const h=harness({behavior:{submitScore:()=>({score:340}),getRankList:()=>({data:rows(100,400)}),getMyRank:()=>({status:'EXACT',rank:8,score:340})}});await h.mod.ready;
    assert(await h.mod.record(snapshot(0,6,6)));await flush();assert(h.nodes['leaderboard-panel'].hidden);assert.equal(h.nodes['settlement-rank-list'].children.length,3);assert.equal(h.settlement('status'),'总榜前 3 名');assert(h.settlement('mine').includes('总榜排名：第 8 名'));assert(h.settlement('mine').includes('历史最高 340'));assert.equal(h.nodes['settlement-rank-open'].hidden,false);
    const copy=h.mod.getShareSnapshot();assert.deepEqual(JSON.parse(JSON.stringify(copy)),{period:'all',label:'总榜',status:'EXACT',rank:8,score:340,observedAt:h.now(),runCoins:-60,submission:'success'});
    assert.deepEqual(h.calls.filter(x=>x.name==='getRankList'||x.name==='getMyRank').map(x=>x.params),[{board:1,period:'all'},{board:1,period:'all'}]);
    await h.mod.record(snapshot(10,10));await flush();assert.equal(h.count('getRankList'),2);assert.equal(h.count('getMyRank'),2);assert.equal(h.count('submitScore'),2);
  });
  await test('settlement renders literal host nicknames safely and supports negative total scores',async()=>{
    const h=harness({behavior:{getRankList:()=>({data:[{rank:1,score:-10,nickname:'<svg onload=evil()>'},{rank:2,score:-20,nickname:' '},{rank:3,score:-40,nickname:'a'.repeat(100)}]}),getMyRank:()=>({status:'EXACT',rank:3,score:-40})}});await h.mod.ready;await h.mod.record(snapshot(0,4,6));await flush();
    const list=h.nodes['settlement-rank-list'];assert.equal(list.children[0].children[1].textContent,'<svg onload=evil()>');assert.equal(list.children[1].children[1].textContent,'小红薯');assert.equal(list.children[2].children[1].textContent.length,80);assert.equal(list.children[0].className,'settlement-rank-row');assert.equal(h.mod.getShareSnapshot().score,-40);assert.equal(h.calls.find(x=>x.name==='submitScore').params.score,-40);
  });
  await test('unknown settlement submission queries fresh total ranks once without claiming this run committed',async()=>{
    for(const mode of ['2004','network','timeout']){
      const pending=deferred();let begun=false;const h=harness({behavior:{submitScore:()=>{begun=true;return mode==='timeout'?pending.promise:Promise.reject(mode==='2004'?{errCode:2004}:{});},getRankList:()=>({data:begun?rows(3):[]}),getMyRank:()=>begun?{status:'EXACT',rank:12,score:200}:{status:'NO_SCORE',rank:null,score:null}}});await h.mod.ready;await h.mod.open();h.mod.close();
      const result=snapshot(0,6,6),p=h.mod.record(result);await flush();if(mode==='timeout')await h.tick(8000);assert.equal(await p,false);await flush();const rank=h.mod.getShareSnapshot();assert.equal(rank.status,'EXACT');assert.equal(rank.rank,12);assert.equal(rank.score,200);assert.equal(rank.runCoins,-60);assert.equal(rank.submission,'unknown');assert(h.settlement('status').includes('不代表本局已写入'));assert.equal(h.count('getMyRank'),2);assert.equal(h.count('submitScore'),1);await h.mod.record(result);await flush();assert.equal(h.count('submitScore'),1);
    }
  });
  await test('unsupported client and missing methods keep honest settlement and start-screen fallback without fabricated rows',async()=>{
    for(const options of [{noXhs:true},{launchOptions:{miniToolEnv:{buildVersion:9509999}}},{missing:['getMyRank']}]){
      const h=harness(options);await h.mod.ready;assert.equal(h.nodes['leaderboard-entry-unavailable'].hidden,false);assert(h.text('entry-unavailable').includes('本机记录'));await h.mod.record(snapshot());await flush();assert.equal(h.nodes['leaderboard-entry-unavailable'].hidden,true);assert.equal(h.nodes['settlement-rank'].hidden,false);assert(h.settlement('status').includes('不可用'));assert(h.settlement('mine').includes('本机最高：40'));assert.equal(h.nodes['settlement-rank-list'].children.length,0);assert(h.nodes['settlement-rank-open'].hidden);assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');assert.equal(h.mod.getShareSnapshot().submission,'unavailable');assert.equal(h.count('submitScore'),0);assert.equal(h.count('getRankList'),0);
    }
  });
  await test('official denial on automatic reads or write hides every interactive entry while close and local fallback survive',async()=>{
    for(const code of [1005,1006,10003])for(const name of ['submitScore','getRankList','getMyRank']){
      const h=harness();await h.mod.ready;await h.mod.open();h.behavior[name]=()=>Promise.reject({errCode:code});await h.mod.record(snapshot());await flush();assert(h.nodes['leaderboard-open'].hidden);assert(h.nodes['settlement-rank-open'].hidden);assert(h.nodes['settlement-rank-refresh'].hidden);assert.equal(h.nodes['leaderboard-close'].disabled,false);assert(h.settlement('mine').includes('本机最高'));assert.equal(h.nodes['settlement-rank-list'].children.length,0);assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');h.click('close');assert(h.nodes['leaderboard-panel'].hidden);
    }
  });
  await test('partial automatic read failures preserve only real successful data and disclose local fallback',async()=>{
    const listFail=harness({behavior:{getRankList:()=>Promise.reject({errCode:2001}),getMyRank:()=>({status:'EXACT',rank:80,score:100})}});await listFail.mod.ready;await listFail.mod.record(snapshot());await flush();assert.equal(listFail.nodes['settlement-rank-list'].children.length,0);assert(listFail.settlement('status').includes('暂不可用'));assert(listFail.settlement('status').includes('本机最高'));assert.equal(listFail.mod.getShareSnapshot().status,'EXACT');assert.equal(listFail.mod.getShareSnapshot().rank,80);
    const ownFail=harness({behavior:{getRankList:()=>({data:rows(3)}),getMyRank:()=>Promise.reject({errCode:2001})}});await ownFail.mod.ready;await ownFail.mod.record(snapshot());await flush();assert.equal(ownFail.nodes['settlement-rank-list'].children.length,3);assert(ownFail.settlement('mine').includes('暂不可用'));assert(ownFail.settlement('mine').includes('本机最高'));assert.equal(ownFail.mod.getShareSnapshot().status,'UNAVAILABLE');assert.equal(ownFail.mod.getShareSnapshot().rank,null);assert.equal(ownFail.mod.getShareSnapshot().score,null);
  });
  await test('automatic total-rank states remain distinct without inventing a placing or a score',async()=>{
    for(const [status,copy]of [['OVER_LIMIT','500+'],['NO_SCORE','暂无我的成绩'],['NOT_PARTICIPATING','尚未参与总榜']]){
      const h=harness({behavior:{getMyRank:()=>({status,rank:null,score:null})}});await h.mod.ready;await h.mod.record(snapshot());await flush();const share=h.mod.getShareSnapshot();assert.equal(share.status,status);assert.equal(share.rank,null);assert.equal(share.score,null);assert.equal(share.observedAt,h.now());assert(h.settlement('mine').includes(copy));assert.equal(h.nodes['settlement-rank-list'].children.length,0);assert(h.settlement('status').includes('还没有上榜成绩'));
    }
  });
  await test('known failed write still queries existing total rank and never presents a previous score as this run',async()=>{
    const h=harness({behavior:{submitScore:()=>Promise.reject({errCode:2001}),getRankList:()=>({data:rows(3)}),getMyRank:()=>({status:'EXACT',rank:20,score:200})}});await h.mod.ready;assert.equal(await h.mod.record(snapshot(0,6,6)),false);await flush();assert.equal(h.mod.getShareSnapshot().submission,'failed');assert.equal(h.mod.getShareSnapshot().score,200);assert.equal(h.mod.getShareSnapshot().runCoins,-60);assert(h.settlement('status').includes('不代表本局已写入'));h.click('settlement-rank-refresh');await flush();assert.equal(h.count('submitScore'),1);assert.equal(h.count('getMyRank'),2);
  });
  await test('starting another run clears all settlement UI and share data before any same-score next result',async()=>{
    const write=deferred(),h=harness({behavior:{getRankList:()=>({data:rows(3)}),getMyRank:()=>({status:'EXACT',rank:1,score:400})}});await h.mod.ready;await h.mod.record(snapshot());await flush();assert.equal(h.mod.getShareSnapshot().rank,1);h.mod.setPlaying(true);assert(h.nodes['settlement-rank'].hidden);assert.equal(h.settlement('list'),'');assert.equal(h.settlement('mine'),'');const empty=h.mod.getShareSnapshot();assert.equal(empty.status,'UNAVAILABLE');assert.equal(empty.rank,null);assert.equal(empty.runCoins,null);assert.equal(empty.submission,'unavailable');
    h.mod.setPlaying(false);h.behavior.submitScore=()=>write.promise;const p=h.mod.record(snapshot());assert.equal(h.mod.getShareSnapshot().status,'LOADING');assert.equal(h.mod.getShareSnapshot().rank,null);assert.equal(h.mod.getShareSnapshot().submission,'pending');assert.equal(h.settlement('list'),'');assert(!h.settlement('mine').includes('第 1 名'));write.resolve({score:400});await p;await flush();
  });
  await test('late former settlement reads cannot overwrite a newly completed same-score settlement',async()=>{
    const oldList=deferred(),oldOwn=deferred();let lists=0,owns=0;const h=harness({behavior:{getRankList:()=>++lists===1?oldList.promise:{data:[{rank:1,score:400,nickname:'new total'}]},getMyRank:()=>++owns===1?oldOwn.promise:{status:'EXACT',rank:6,score:400}}});await h.mod.ready;await h.mod.record(snapshot());await flush();h.mod.setPlaying(true);h.mod.setPlaying(false);await h.mod.record(snapshot());await flush();assert.equal(h.mod.getShareSnapshot().rank,6);oldList.resolve({data:[{rank:1,score:400,nickname:'old total'}]});oldOwn.resolve({status:'EXACT',rank:1,score:400});await flush();assert(h.settlement('list').includes('new total'));assert(!h.settlement('list').includes('old total'));assert.equal(h.mod.getShareSnapshot().rank,6);assert.equal(h.count('submitScore'),2);
  });
  await test('late prior write completion does not repaint or auto-query the new settlement',async()=>{
    for(const failed of [false,true]){
      const old=deferred();let writes=0;const h=harness({behavior:{submitScore:()=>++writes===1?old.promise:{score:100},getMyRank:()=>({status:'EXACT',rank:9,score:100})}});await h.mod.ready;const p=h.mod.record(snapshot());await flush();h.mod.setPlaying(true);h.mod.setPlaying(false);await h.mod.record(snapshot(10,10));await flush();const before=JSON.stringify(h.mod.getShareSnapshot()),status=h.settlement('status'),mine=h.settlement('mine'),reads=h.count('getMyRank');if(failed)old.reject({errCode:2004});else old.resolve({score:400});await p;await flush();assert.equal(JSON.stringify(h.mod.getShareSnapshot()),before);assert.equal(h.settlement('status'),status);assert.equal(h.settlement('mine'),mine);assert.equal(h.count('getMyRank'),reads);
    }
  });
  await test('dialog close and immediate reopen do not cancel or duplicate a current settlement-owned query',async()=>{
    const list=deferred(),own=deferred(),h=harness({behavior:{getRankList:()=>list.promise,getMyRank:()=>own.promise}});await h.mod.ready;await h.mod.record(snapshot());await flush();const opened=h.mod.open();await flush();h.mod.close();const reopened=h.mod.open();await flush();assert.equal(h.count('getRankList'),1);h.mod.close();list.resolve({data:rows(3)});own.resolve({status:'EXACT',rank:30,score:300});await Promise.all([opened,reopened]);await flush();assert(h.nodes['leaderboard-panel'].hidden);assert.equal(h.nodes['settlement-rank-list'].children.length,3);assert.equal(h.mod.getShareSnapshot().rank,30);await h.mod.open();assert.equal(h.count('getRankList'),1);assert.equal(h.count('submitScore'),1);
  });
  await test('rapid full-dialog period changes leave the settlement and share snapshot fixed to the total board',async()=>{
    const all=deferred(),day=deferred(),h=harness({behavior:{getRankList:p=>p.period==='all'?all.promise:day.promise,getMyRank:p=>({status:'EXACT',rank:p.period==='all'?7:1,score:p.period==='all'?100:20})}});await h.mod.ready;await h.mod.record(snapshot(10,10));await flush();const opened=h.mod.open();await flush();h.click('rank-day');await flush();day.resolve({data:[{rank:1,score:20,nickname:'today'}]});await flush();all.resolve({data:[{rank:1,score:400,nickname:'total winner'}]});await opened;await flush();assert(h.text('list').includes('today'));assert(h.settlement('list').includes('total winner'));assert(!h.settlement('list').includes('today'));assert.equal(h.mod.getShareSnapshot().rank,7);assert.equal(h.mod.getShareSnapshot().period,'all');h.mod.close();h.click('settlement-rank-open');await flush();assert(h.text('title').includes('总榜'));
  });
  await test('backgrounding cancels settlement reads, rejects late paints, and requires explicit refresh after return',async()=>{
    for(const type of ['visibility','pagehide']){
      const list=deferred(),own=deferred(),h=harness({behavior:{getRankList:()=>list.promise,getMyRank:()=>own.promise}});await h.mod.ready;await h.mod.record(snapshot());await flush();if(type==='visibility')h.hide();else h.emitWindow('pagehide');const before=h.settlement('status');list.resolve({data:rows(3)});own.resolve({status:'EXACT',rank:1,score:400});await flush();assert.equal(h.settlement('status'),before);assert.equal(h.nodes['settlement-rank-list'].children.length,0);assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');if(type==='visibility')h.show();else h.emitWindow('pageshow');await h.tick(1000);assert.equal(h.count('getMyRank'),1);assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');h.behavior.getRankList=()=>({data:rows(3)});h.behavior.getMyRank=()=>({status:'EXACT',rank:3,score:400});h.click('settlement-rank-refresh');await flush();assert.equal(h.mod.getShareSnapshot().rank,3);assert.equal(h.count('submitScore'),1);
    }
  });
  await test('write finishing in the background never starts reads or changes paused settlement text',async()=>{
    for(const failed of [false,true]){const gate=deferred(),h=harness({behavior:{submitScore:()=>gate.promise}});await h.mod.ready;const p=h.mod.record(snapshot());await flush();h.hide();const status=h.settlement('status'),mine=h.settlement('mine');if(failed)gate.reject({errCode:2004});else gate.resolve({score:400});await p;await flush();assert.equal(h.count('getMyRank'),0);assert.equal(h.settlement('status'),status);assert.equal(h.settlement('mine'),mine);assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');h.show();await flush();assert.equal(h.count('getRankList'),0);assert.equal(h.mod.getShareSnapshot().submission,failed?'unknown':'success');h.click('settlement-rank-refresh');await flush();assert.equal(h.count('getRankList'),1);assert.equal(h.count('submitScore'),1);}
  });
  await test('settlement retry backoff is bounded and canceled by gameplay or background without automatic resume',async()=>{
    for(const stop of ['play','hide']){const h=harness({behavior:{getRankList:()=>Promise.reject({errCode:2002}),getMyRank:()=>Promise.reject({errCode:2002})}});await h.mod.ready;await h.mod.record(snapshot());await flush();assert.equal(h.count('getRankList'),1);await h.tick(500);assert.equal(h.count('getRankList'),2);if(stop==='play')h.mod.setPlaying(true);else h.hide();await h.tick(60000);assert.equal(h.count('getRankList'),2);if(stop==='hide')h.show();else h.mod.setPlaying(false);await h.tick(60000);assert.equal(h.count('getRankList'),2);assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');}
  });
  await test('share snapshot is synchronous copied frozen data and never reads or submits when accessed',async()=>{
    const h=harness({behavior:{getMyRank:()=>({status:'EXACT',rank:4,score:100})}});await h.mod.ready;await h.mod.record(snapshot(10,10));await flush();const before=h.calls.length,a=h.mod.getShareSnapshot(),b=h.mod.getShareSnapshot();assert.notEqual(a,b);assert(Object.isFrozen(a));assert.throws(()=>{a.rank=999;},TypeError);assert.equal(h.calls.length,before);h.behavior.getMyRank=()=>({status:'EXACT',rank:5,score:100});h.click('settlement-rank-refresh');assert.equal(h.mod.getShareSnapshot().status,'LOADING');assert.equal(h.mod.getShareSnapshot().rank,null);await flush();assert.equal(h.mod.getShareSnapshot().rank,5);assert.equal(a.rank,4);assert.equal(h.count('submitScore'),1);
  });
  await test('expired share observations never expose stale ranks and access alone never refreshes the host',async()=>{
    const h=harness({behavior:{getMyRank:()=>({status:'EXACT',rank:4,score:100})}});await h.mod.ready;await h.mod.record(snapshot(10,10));await flush();const old=h.mod.getShareSnapshot(),before=h.calls.length;await h.tick(44999);assert.equal(h.mod.getShareSnapshot().status,'EXACT');await h.tick(1);const stale=h.mod.getShareSnapshot();assert.equal(stale.status,'UNAVAILABLE');assert.equal(stale.rank,null);assert.equal(stale.score,null);assert.equal(stale.observedAt,null);assert.equal(stale.runCoins,100);assert.equal(stale.submission,'success');assert.equal(old.rank,4);assert.equal(h.calls.length,before);
  });
  await test('share session identity guards reject a same-score restarted or foreign session even without a playing notification',async()=>{
    const h=harness({behavior:{getMyRank:()=>({status:'EXACT',rank:4,score:100})}});const session=h.context.survival;Object.assign(session,{coins:100,gameOver:true,totals:{whole:10,smashed:10},resultRounds:new Set()});await h.mod.ready;await h.mod.record(snapshot(10,10));await flush();assert.equal(h.mod.getShareSnapshot(session).rank,4);assert.equal(h.mod.getShareSnapshot(Object.assign({},session)).status,'UNAVAILABLE');session.gameOver=false;assert.equal(h.mod.getShareSnapshot(session).runCoins,null);session.gameOver=true;session.totals={whole:10,smashed:10};session.resultRounds=new Set();const wrong=h.mod.getShareSnapshot(session);assert.equal(wrong.status,'UNAVAILABLE');assert.equal(wrong.rank,null);assert.equal(wrong.submission,'unavailable');assert.equal(wrong.runCoins,null);assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');
  });
  await test('repeated explicit settlement refreshes deduplicate current reads and discard the previous own rank on failure',async()=>{
    const h=harness({behavior:{getMyRank:()=>({status:'EXACT',rank:8,score:100})}});await h.mod.ready;await h.mod.record(snapshot());await flush();const own=deferred();h.behavior.getMyRank=()=>own.promise;h.click('settlement-rank-refresh');h.click('settlement-rank-refresh');await flush();assert.equal(h.mod.getShareSnapshot().status,'LOADING');assert.equal(h.count('getMyRank'),2);own.reject({errCode:2001});await flush();assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');assert.equal(h.mod.getShareSnapshot().rank,null);assert.equal(h.mod.getShareSnapshot().score,null);assert.equal(h.mod.getShareSnapshot().observedAt,null);assert(h.settlement('mine').includes('暂不可用'));assert.equal(h.count('submitScore'),1);
  });
  await test('denial received after backgrounding restores honest unavailable copy instead of offering a hidden refresh button',async()=>{
    for(const type of ['visibility','pagehide']){const list=deferred(),h=harness({behavior:{getRankList:()=>list.promise,getMyRank:()=>({status:'EXACT',rank:2,score:400})}});await h.mod.ready;await h.mod.record(snapshot());await flush();if(type==='visibility')h.hide();else h.emitWindow('pagehide');list.reject({errCode:1006});await flush();assert(h.nodes['settlement-rank-refresh'].hidden);if(type==='visibility')h.show();else h.emitWindow('pageshow');await flush();assert(h.settlement('status').includes('不可用'));assert(!h.settlement('status').includes('可刷新'));assert(!h.settlement('mine').includes('待刷新'));assert(h.settlement('mine').includes('本机最高'));assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');assert(h.nodes['settlement-rank-open'].hidden);assert.equal(h.nodes['leaderboard-close'].disabled,false);}
  });
  await test('late former submission does not invalidate the newer settlement query while it is still loading',async()=>{
    for(const failed of [false,true]){const old=deferred(),currentList=deferred(),currentOwn=deferred();let writes=0;const h=harness({behavior:{submitScore:()=>++writes===1?old.promise:{score:100},getRankList:()=>currentList.promise,getMyRank:()=>currentOwn.promise}});await h.mod.ready;const previous=h.mod.record(snapshot());await flush();h.mod.setPlaying(true);h.mod.setPlaying(false);await h.mod.record(snapshot(10,10));await flush();assert.equal(h.mod.getShareSnapshot().status,'LOADING');if(failed)old.reject({errCode:2004});else old.resolve({score:400});await previous;await flush();assert.equal(h.mod.getShareSnapshot().status,'LOADING');currentList.resolve({data:rows(3)});currentOwn.resolve({status:'EXACT',rank:9,score:100});await flush();assert.equal(h.mod.getShareSnapshot().rank,9);assert.equal(h.mod.getShareSnapshot().submission,'success');assert.equal(h.count('getMyRank'),1);}
  });
  await test('a slow top-three response does not make the earlier own-rank observation look newer',async()=>{
    const list=deferred(),h=harness({behavior:{getRankList:()=>list.promise,getMyRank:()=>({status:'EXACT',rank:2,score:100})}});await h.mod.ready;const instant=h.now();await h.mod.record(snapshot(10,10));await flush();await h.tick(7000);list.resolve({data:rows(3)});await flush();assert.equal(h.mod.getShareSnapshot().observedAt,instant);await h.tick(38000);assert.equal(h.mod.getShareSnapshot().status,'UNAVAILABLE');assert.equal(h.count('getMyRank'),1);
  });
  await test('47-second list retries plus dialog period-switch cache pruning cannot freshen an old settlement own rank',async()=>{
    let tries=0,h;h=harness({behavior:{getRankList:p=>{if(p.period!=='all')return{data:[]};const attempt=++tries;return new Promise((resolve,reject)=>h.context.setTimeout(()=>attempt<5?reject({errCode:2002}):resolve({data:rows(3)}),7900));},getMyRank:p=>({status:'EXACT',rank:p.period==='all'?2:9,score:100})}});await h.mod.ready;await h.mod.record(snapshot(10,10));await flush();await h.tick(45001);const opened=h.mod.open();await flush();h.click('rank-day');await flush();assert.equal(h.count('getMyRank'),3);await h.tick(1999);await opened;await flush();assert.equal(tries,5);assert.equal(h.nodes['settlement-rank-list'].children.length,3);assert(h.settlement('mine').includes('已过期，请刷新'));assert(!h.settlement('mine').includes('第 2 名'));const result=h.mod.getShareSnapshot();assert.equal(result.status,'UNAVAILABLE');assert.equal(result.rank,null);assert.equal(result.score,null);assert.equal(result.observedAt,null);assert.equal(result.runCoins,100);assert.equal(result.submission,'success');assert.equal(h.count('submitScore'),1);
  });
  const report={passed:checks.length,checks,scope:'Deterministic Node VM tests against source/leaderboard.js with mocked DOM, clock and official miniTool API. No simulator, Android or iOS acceptance claims.'};
  fs.mkdirSync(path.join(root,'reports'),{recursive:true});fs.writeFileSync(path.join(root,'reports/leaderboard-tests.json'),JSON.stringify(report,null,2)+'\n');completed=true;console.log('All '+checks.length+' leaderboard checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
