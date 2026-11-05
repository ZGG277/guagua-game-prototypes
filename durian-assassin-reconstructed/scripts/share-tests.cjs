const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');
if(fs.existsSync('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'))GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','sans-serif');
const root=path.resolve(__dirname,'..'),reports=path.join(root,'reports');
let imageLoads=0,failLoad=true,posts=[],temps=[],checks=[],els={};
function el(id){return els[id]||(els[id]={disabled:false,textContent:'',addEventListener(){}});}
let c={console,Promise,Object,Number,Math,Set,Image:function(){let im=new Image();Object.defineProperty(im,'src',{set(value){imageLoads++;if(failLoad){queueMicrotask(()=>im.onerror(new Error('offline')));}else Object.getOwnPropertyDescriptor(Image.prototype,'src').set.call(im,fs.readFileSync(path.join(root,'dist',value)));}});return im;},document:{createElement:()=>createCanvas(1,1),getElementById:el,documentElement:{style:{setProperty(){}}}},addEventListener(){},localStorage:{getItem:()=>null},survival:{gameOver:true,totals:{whole:0,smashed:20},coins:-200,injuryRounds:new Set([1,2,3,4,5,6])},xhs:{miniTool:{postNote:async p=>posts.push(p),writeTempFile:async p=>{temps.push(p);return{filePath:'tmp/share.jpg'}}}}};c.window=c;vm.createContext(c);
for(let f of ['share-card.js','platform.js']) vm.runInContext(fs.readFileSync(path.join(root,'dist',f),'utf8'),c,{filename:f});
(async()=>{
  assert.equal(await c.DurianPlatform.share(),false);assert.equal(posts.length,0);assert.equal(el('share').disabled,false);assert(el('share-status').textContent.includes('图片未加载'));checks.push('missing image blocks sharing, explains retry, releases busy flag');
  failLoad=false;assert(await c.DurianPlatform.share());assert.equal(imageLoads,2);assert(posts[0].content.includes('净赚 -200 金币'));assert(posts[0].content.includes('被砸 6 次'));checks.push('image failure can retry and preserves negative totals and fatal hit count');
  let data=temps[0].data;fs.writeFileSync(path.join(reports,'share-card-negative.jpg'),Buffer.from(data.split(',')[1],'base64'));
  let resolveRender,seen;const original=c.DurianShare.render;c.DurianShare.render=score=>{seen=score;return new Promise(r=>resolveRender=r)};
  let pending=c.DurianPlatform.share();assert(Object.isFrozen(seen));c.survival.coins=0;c.survival.totals={whole:0,smashed:0};c.survival.injuryRounds.clear();resolveRender(data);assert(await pending);assert(posts[1].content.includes('-200'));assert(posts[1].content.includes('被砸 6 次'));checks.push('share uses immutable click-time snapshot even when a new run begins while rendering');c.DurianShare.render=original;
  c.xhs.miniTool.writeTempFile=async()=>({});assert.equal(await c.DurianPlatform.share(),false);assert.equal(posts.length,2);assert.equal(el('share').disabled,false);checks.push('invalid temporary-file result blocks post and releases busy flag');
  delete c.xhs.miniTool.writeTempFile;assert(await c.DurianPlatform.share());assert(posts[2].mediaInfo.image_resources[0].url.startsWith('data:image/jpeg;base64,'));checks.push('missing temporary-file API uses supported data URI');
  assert(posts.every(p=>p.title.length<=20&&p.content.length<=1000));checks.push('all titles and captions respect postNote length limits');
  let saved=c.DurianShare.snapshot({totals:{whole:20,smashed:0},coins:400,injuryRounds:new Set()});assert.equal(saved.hits,0);assert.equal(saved.coins,400);checks.push('perfect harvest and zero hits serialize correctly');
  fs.writeFileSync(path.join(reports,'share-tests.json'),JSON.stringify({passed:checks.length,checks,scope:'Unit tests with mocked platform APIs; not real-device verification'},null,2));console.log(checks);
})().catch(e=>{console.error(e);process.exitCode=1;});
