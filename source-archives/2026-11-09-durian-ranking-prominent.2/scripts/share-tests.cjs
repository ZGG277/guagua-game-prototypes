const fs=require('fs'),path=require('path'),assert=require('assert');
const {runtime,root,canvas}=require('./share-test-harness.cjs');
(async()=>{
 const checks=[],h=runtime({imageMode:'failure'}),c=h.c;
 assert.strictEqual(await c.DurianPlatform.share(),false);assert.equal(h.posts.length,0);assert.equal(h.el('share').disabled,false);assert(h.el('share-status').textContent.includes('图片未加载'));checks.push('Image failure blocks posting, offers retry, and releases all controls.');
 h.setImageMode('success');assert.strictEqual(await c.DurianPlatform.share(),true);assert.equal(h.imageLoads,2);
 let first=h.posts[0];assert(first.content.includes('净收入 -200 金币'));assert(first.content.includes('被砸 6 次'));assert(first.content.includes('接住 0 颗'));assert(first.content.includes('摔碎 20 颗'));assert(first.mediaInfo.image_resources[0].url.startsWith('data:image/jpeg;base64,'));checks.push('Retry succeeds with complete negative-income statistics and a directly supported JPEG data URI.');
 assert.deepStrictEqual(Object.keys(first).sort(),['content','mediaInfo','pageType','title']);assert.equal(first.pageType,'photo_publish');checks.push('Payload contains only documented postNote fields; no album permission or temporary-file requirement.');
 for(const topic of ['小红书小工具','Web coding小游戏','小游戏','榴莲','榴莲刺客'])assert(first.content.includes('#'+topic+'[话题]#'));
 assert(first.title.length<=20&&first.content.length<=1000);checks.push('All five topics use verified #name[话题]# markup and respect title/body limits.');
 const reports=path.join(root,'reports');fs.mkdirSync(reports,{recursive:true});
 fs.writeFileSync(path.join(reports,'share-card-negative.jpg'),Buffer.from(first.mediaInfo.image_resources[0].url.split(',')[1],'base64'));
 const perfect=c.DurianShare.snapshot({totals:{whole:20,smashed:0},coins:400,injuryRounds:new Set()});
 assert(Object.isFrozen(perfect));assert.equal(perfect.hits,0);assert.equal(perfect.coins,400);
 const positive=await c.DurianShare.render(perfect);fs.writeFileSync(path.join(reports,'share-card-positive.jpg'),Buffer.from(positive.split(',')[1],'base64'));
 const extreme=c.DurianShare.snapshot({totals:{whole:Number.MAX_SAFE_INTEGER,smashed:Number.MAX_SAFE_INTEGER},coins:-Number.MAX_SAFE_INTEGER,injuryRounds:{size:Number.MAX_SAFE_INTEGER}});
 const long=await c.DurianShare.render(extreme);fs.writeFileSync(path.join(reports,'share-card-long-values.jpg'),Buffer.from(long.split(',')[1],'base64'));
 checks.push('Rendered negative, perfect-harvest, and maximum-safe-integer posters with fitted numeric labels.');
 for(const data of [first.mediaInfo.image_resources[0].url,positive,long]){const bytes=Buffer.from(data.split(',')[1],'base64');assert(bytes.length>10000&&bytes.length<1024*1024);const image=await canvas.loadImage(bytes);assert.equal(image.width,1080);assert.equal(image.height,1440);}
 checks.push('Every actual JPEG decodes as 1080×1440 and remains below 1 MiB.');
 assert.equal(c.DurianShare.snapshot({totals:{whole:NaN,smashed:-1},coins:Infinity,injuryRounds:{size:-3}}).coins,0);assert.equal(c.DurianShare.snapshot({totals:{whole:NaN,smashed:-1},coins:Infinity,injuryRounds:{size:-3}}).hits,0);
 checks.push('Malformed non-finite values cannot leak NaN/Infinity or negative counts into cards.');
 await h.flush();assert(h.reads.includes('durian-assassin-v101-best'));c.DurianPlatform.saveBest({coins:400,whole:20});assert.equal(h.writes[0].key,'durian-assassin-v101-best');checks.push('Legacy production best-score key is used for read and write.');
 assert.equal(h.timers.size,0);assert(h.el('share-cancel').hidden);assert(!/已发布|发布成功/.test(h.el('share-status').textContent));checks.push('Successful bridge completion clears timers and controls without claiming a published note.');
 fs.writeFileSync(path.join(reports,'share-tests.json'),JSON.stringify({passed:checks.length,checks,scope:'Cloud unit tests with mocked bridge APIs and real Canvas JPEG rendering, not real-device publishing.'},null,2));console.log(checks.join('\n'));
})().catch(error=>{console.error(error);process.exitCode=1;});
