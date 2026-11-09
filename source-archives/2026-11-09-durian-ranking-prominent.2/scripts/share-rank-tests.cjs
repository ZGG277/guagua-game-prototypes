const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const {runtime, deferred, flush, root, minimalData, canvas} = require('./share-test-harness.cjs');
const expectedTopics = '#小红书小工具[话题]# #Web coding小游戏[话题]# #小游戏[话题]# #榴莲[话题]# #榴莲刺客[话题]#';
const checks = [], rendered = [], typography = [];
function rank(overrides = {}) {
  return Object.assign({period:'all', label:'总榜', status:'EXACT', rank:123, score:-120, observedAt:1794175200000, runCoins:-200, submission:'success'}, overrides);
}
function install(h, value) { h.c.DurianLeaderboard = {getShareSnapshot: () => value}; return h.c.DurianShare.snapshot(h.c.survival); }
function rankUnavailable(value) { const h=runtime(), score=install(h,value); assert.equal(score.ranking.status,'UNAVAILABLE'); assert.equal(score.ranking.rank,null); assert.equal(score.ranking.score,null); return h.c.DurianShare.caption(score); }
function instrument(h) {
  const original = h.c.document.createElement;
  h.c.document.createElement = function () {
    const c=original(), ctx=c.getContext('2d'), fill=ctx.fillText.bind(ctx);
    ctx.fillText=function(label,x,y,maxWidth){
      const m=ctx.measureText(String(label)), width=Math.min(m.width,maxWidth || Infinity);
      const box={label:String(label),x:x-width/2,y:y-m.actualBoundingBoxAscent,width,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,font:ctx.font};
      assert(box.x>=0 && box.x+box.width<=1080, 'text crosses side edge: '+label);
      assert(box.y>=0 && box.y+box.height<=1440, 'text crosses vertical edge: '+label);
      typography.push(box); return fill(label,x,y,maxWidth);
    };
    return c;
  };
}
async function jpeg(h, score, name) {
  const before=typography.length, data=await h.c.DurianShare.render(score), bytes=Buffer.from(data.split(',')[1],'base64'), image=await canvas.loadImage(bytes);
  assert(/^data:image\/jpeg;base64,/.test(data)); assert.equal(image.width,1080); assert.equal(image.height,1440);
  assert(bytes.length>10000 && bytes.length<1024*1024);
  const labels=typography.slice(before), required=['总榜排名','接住','摔碎','被砸','本局净收入','金币'];
  required.forEach(label=>assert(labels.some(box=>box.label===label), 'missing rendered label: '+label));
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
    const a=labels[i],b=labels[j];
    assert(!(a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y),'text overlap: '+a.label+' / '+b.label);
  }
  fs.writeFileSync(path.join(root,'reports',name),bytes);
  rendered.push({file:name,width:image.width,height:image.height,bytes:bytes.length,textCount:labels.length,textBoundsAndOverlap:'passed'});
  return data;
}
(async()=>{
  fs.mkdirSync(path.join(root,'reports'),{recursive:true});
  {
    const h=runtime(); instrument(h); const score=install(h,rank());
    assert(Object.isFrozen(score) && Object.isFrozen(score.ranking)); assert.equal(score.coins,-200); assert.equal(score.ranking.score,-120);
    const copy=h.c.DurianShare.caption(score);
    assert(copy.includes('总榜排名：第 123 名')); assert(copy.includes('历史最高：-120 金币')); assert(copy.includes('净收入 -200 金币'));
    assert.equal(score.whole,0);assert.equal(score.smashed,20);assert.equal(score.hits,6);
    await jpeg(h,score,'share-rank-exact-negative.jpg');
    checks.push('EXACT rank and negative historical best are real snapshot fields, distinct from all four current-run statistics.');
  }
  for(const [status,expected,name] of [
    ['OVER_LIMIT','500+','share-rank-over-limit.jpg'],['LOADING','排名更新中','share-rank-loading.jpg'],
    ['NO_SCORE','本期无成绩','share-rank-no-score.jpg'],['NOT_PARTICIPATING','尚未参与排行榜','share-rank-not-participating.jpg'],
    ['UNAVAILABLE','排名暂不可得','share-rank-unavailable.jpg']]){
    const h=runtime(); instrument(h);
    const score=install(h,rank({status,rank:null,score:null,observedAt:status==='OVER_LIMIT'?1794175200000:null,submission:status==='LOADING'?'pending':'unavailable'}));
    assert.equal(score.ranking.status,status);const content=h.c.DurianShare.caption(score);assert(content.includes(expected));assert(!/第 null 名|历史最高：null/.test(content));
    await jpeg(h,score,name);
  }
  checks.push('OVER_LIMIT displays only 500+; loading, no-score, nonparticipating and unavailable states show honest text and remain shareable.');
  {
    const h=runtime(); instrument(h);const score=install(h,rank({rank:42,score:400,submission:'unknown'}));
    const content=h.c.DurianShare.caption(score);assert(content.includes('总榜排名：第 42 名'));assert(content.includes('历史最高：400 金币'));assert(content.includes('本局提交待确认'));assert(!content.includes('本局已提交'));
    await jpeg(h,score,'share-rank-unconfirmed.jpg');
    assert(typography.some(t=>t.label==='本局提交待确认 · 以平台排名为准'));
    checks.push('An unknown write keeps a retrieved real rank but explicitly marks this run’s submission as unconfirmed in image and caption.');
  }
  {
    for(const submission of ['pending','failed','unavailable']){
      const h=runtime(),score=install(h,rank({submission}));const content=h.c.DurianShare.caption(score);assert(!content.includes('本局已提交'));
      if(submission==='pending')assert(content.includes('本局提交中'));
      if(submission==='failed')assert(content.includes('本局提交未成功'));
    }
    const h=runtime();delete h.c.DurianLeaderboard;assert.equal(h.c.DurianShare.snapshot(h.c.survival).ranking.status,'UNAVAILABLE');
    assert(await h.c.DurianPlatform.share());assert.equal(h.posts.length,1);assert(h.posts[0].content.includes('排名暂不可得'));
    checks.push('Pending/failed/missing submission never claims success; absent leaderboard APIs do not prevent a normal JPEG share.');
  }
  {
    const h=runtime(),raw=rank({runCoins:400}),score=install(h,raw);
    assert.equal(score.ranking.status,'UNAVAILABLE');assert.equal(score.ranking.rank,null);assert(!h.c.DurianShare.caption(score).includes('第 123 名'));
    let received;h.c.DurianLeaderboard.getShareSnapshot=function(session){received=session;return session===h.c.survival?rank():rank({status:'UNAVAILABLE',rank:null,score:null,observedAt:null,runCoins:null,submission:'unavailable'});};
    const other={gameOver:true,totals:{whole:0,smashed:20},coins:-200,injuryRounds:new Set()};
    assert.equal(h.c.DurianShare.snapshot(other).ranking.status,'UNAVAILABLE');assert.strictEqual(received,other);
    checks.push('Mismatched run scores discard previous rank and success, and the exact session is passed to the leaderboard for same-score run identity checks.');
  }
  {
    const invalid=[null,undefined,{},Promise.resolve(rank()),rank({period:'day'}),rank({status:'invented'}),rank({rank:0}),rank({rank:501}),rank({rank:'1'}),rank({rank:NaN}),rank({rank:1.5}),rank({score:Infinity}),rank({score:NaN}),rank({score:null}),rank({score:'400'}),rank({score:1000001}),rank({observedAt:null}),rank({observedAt:undefined}),rank({observedAt:-1}),rank({observedAt:'now'}),rank({runCoins:'-200'}),rank({submission:'published'}),rank({status:'OVER_LIMIT',rank:501,score:null}),rank({status:'OVER_LIMIT',rank:null,score:null,observedAt:null}),rank({status:'NO_SCORE',rank:null,score:0})];
    for(const value of invalid){const content=rankUnavailable(value);assert(!/NaN|Infinity|null|undefined|第 123 名/.test(content));}
    const h=runtime();h.c.DurianLeaderboard={getShareSnapshot(){throw Error('bridge not ready');}};assert.equal(h.c.DurianShare.snapshot(h.c.survival).ranking.status,'UNAVAILABLE');
    assert.equal(h.c.DurianShare.snapshot(null).ranking.status,'UNAVAILABLE');
    checks.push(invalid.length+' malformed or stale-like ranking responses, thrown getters and missing sessions safely degrade without fabricated ranks.');
  }
  {
    const h=runtime(),raw=rank(),render=deferred();let calls=0,seen;
    h.c.DurianLeaderboard={getShareSnapshot(session){assert.strictEqual(session,h.c.survival);calls++;return raw;}};
    h.c.DurianShare.render=score=>{seen=score;return render.promise;};
    const sharing=h.c.DurianPlatform.share();assert.equal(calls,1);assert(Object.isFrozen(seen.ranking));
    raw.rank=1;raw.score=400;raw.submission='unknown';h.c.survival.coins=400;
    render.resolve(minimalData);assert(await sharing);assert.equal(calls,1);
    assert.equal(seen.ranking.rank,123);assert.equal(seen.ranking.score,-120);assert.equal(seen.ranking.submission,'success');
    assert(h.posts[0].content.includes('第 123 名') && h.posts[0].content.includes('历史最高：-120 金币') && h.posts[0].content.includes('净收入 -200 金币'));
    checks.push('A single synchronous click-time read is deeply frozen; late rank, score and submission mutations cannot change the image/caption pair.');
  }
  {
    const h=runtime(),raw=rank({status:'LOADING',rank:null,score:null,observedAt:null,submission:'pending'}),render=deferred();
    h.c.DurianLeaderboard={getShareSnapshot:()=>raw};h.c.DurianShare.render=()=>render.promise;
    const sharing=h.c.DurianPlatform.share();Object.assign(raw,rank({rank:1,score:400}));render.resolve(minimalData);assert(await sharing);
    assert(h.posts[0].content.includes('排名更新中'));assert(!h.posts[0].content.includes('第 1 名'));
    checks.push('A late successful rank response cannot silently replace a loading click snapshot.');
  }
  {
    const h=runtime();assert.equal(h.c.DurianShare.topics,expectedTopics);
    const expected=Buffer.from(expectedTopics,'utf8');assert(Buffer.from(h.c.DurianShare.topics,'utf8').equals(expected));
    assert.equal((h.c.DurianShare.topics.match(/#/g)||[]).length,10);assert.equal((h.c.DurianShare.topics.match(/\[话题\]/g)||[]).length,5);
    assert(!/[＃［］]|WebCoding|Web coding(?!小游戏)/.test(h.c.DurianShare.topics));
    await h.c.DurianPlatform.share();const post=h.posts[0];assert(post.content.endsWith(expectedTopics));assert(post.title.length<=20 && post.content.length<=1000);
    assert.deepStrictEqual(Object.keys(post).sort(),['content','mediaInfo','pageType','title']);
    checks.push('All five exact UTF-8 topics use ASCII # and [话题], including #Web coding小游戏[话题]#; the bridge payload and length limits are unchanged.');
  }
  {
    const h=runtime(),calls=[];
    h.c.xhs.launchOptions={miniToolEnv:{buildVersion:9510000}};
    Object.assign(h.c.xhs.miniTool,{
      submitScore:params=>{calls.push('submitScore');return Promise.resolve({score:-120});},
      getRankList:params=>{calls.push('getRankList');return Promise.resolve({data:[]});},
      getMyRank:params=>{calls.push('getMyRank');return Promise.resolve({status:'EXACT',rank:123,score:-120});}
    });
    h.c.survival.resultRounds=new Set([1,2,3]);
    vm.runInContext(fs.readFileSync(path.join(root,'source/leaderboard.js'),'utf8'),h.c,{filename:'source/leaderboard.js'});
    assert(await h.c.DurianLeaderboard.ready);
    const result={coins:-200,whole:0,smashed:20,settled:20,hits:6};
    assert(await h.c.DurianLeaderboard.record(result));await flush();
    const before=calls.length,first=h.c.DurianShare.snapshot(h.c.survival);
    assert.equal(first.ranking.status,'EXACT');assert.equal(first.ranking.rank,123);assert.equal(first.ranking.score,-120);
    h.c.DurianShare.render=async()=>minimalData;assert(await h.c.DurianPlatform.share());assert.equal(calls.length,before,'share started platform reads/writes');
    // The same SurvivalSession is reused in the game. Even an equal-score run
    // must not reuse the previous run's rank/submission success.
    h.c.survival.totals={whole:0,smashed:20};h.c.survival.resultRounds=new Set([1,2,3]);
    assert.equal(h.c.DurianShare.snapshot(h.c.survival).ranking.status,'UNAVAILABLE');
    h.c.DurianLeaderboard.setPlaying(true);h.c.DurianLeaderboard.setPlaying(false);
    assert.equal(h.c.DurianShare.snapshot(h.c.survival).ranking.status,'UNAVAILABLE');
    h.c.xhs.miniTool.submitScore=()=>{calls.push('submitScore');return Promise.reject({errCode:2004});};
    assert.strictEqual(await h.c.DurianLeaderboard.record(Object.assign({},result)),false);await flush();
    const second=h.c.DurianShare.snapshot(h.c.survival);
    assert.equal(second.ranking.status,'EXACT');assert.equal(second.ranking.submission,'unknown');assert(h.c.DurianShare.caption(second).includes('本局提交待确认'));
    assert.equal(calls.filter(x=>x==='submitScore').length,2);
    checks.push('Actual leaderboard/share modules integrate: read-only snapshots, exact negative rank, same-session equal-score restart invalidation and unknown-write warning all pass.');
  }
  {
    const h=runtime();instrument(h);const score=h.c.DurianShare.snapshot({totals:{whole:Number.MAX_SAFE_INTEGER,smashed:Number.MAX_SAFE_INTEGER},coins:-Number.MAX_SAFE_INTEGER,injuryRounds:{size:Number.MAX_SAFE_INTEGER}});
    await jpeg(h,score,'share-rank-extreme-values.jpg');
    checks.push('All eight actual JPEG variants decode to 1080×1440 below 1 MiB; measured rendered text stays within bounds with no overlaps, including maximum-safe statistics.');
  }
  await flush();
  fs.writeFileSync(path.join(root,'reports/share-rank-tests.json'),JSON.stringify({passed:checks.length,checks,rendered,topics:expectedTopics,scope:'Cloud VM mocks plus actual Canvas JPEG rendering and text-geometry assertions. Platform ranking truth and mobile topic recognition require host-device validation; fixture ranks are test data only.'},null,2));
  console.log(checks.join('\n'));
})().catch(error=>{console.error(error);process.exitCode=1;});
